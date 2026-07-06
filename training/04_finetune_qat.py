"""
Step 4 -- Two-stage fine-tuning of DocCornerNet V2 for INT8 deployment.

The pipeline runs in two stages (recipe grounded in NVIDIA's integer-quant
guidance + the TF Model Optimization QAT docs):

  Stage A -- float32 domain adaptation
      Fine-tune the original float model on our combined corner dataset with
      geometric + photometric augmentation and a cosine-with-warmup LR. This
      moves the weights to *our* distribution before any quantization noise is
      introduced, which is what makes the subsequent QAT converge cleanly.

  Stage B -- QAT (from the Stage-A weights)
      Wrap the adapted model with TF Model Optimization fake-quant nodes and
      fine-tune at a much lower LR (~1 order below the float LR). The model
      learns to tolerate INT8 rounding of both weights AND activations -- this
      is the key difference from post-training dynamic quantization, which
      destroyed accuracy on this MobileNetV2 (IoU 0.865 -> 0.009).
      Late in training we freeze BatchNorm running stats so the simulated
      INT8 activation ranges stop drifting.

Loss:
  Wing Loss (Feng et al. 2018), computed in PIXEL units (coords x 224) so the
  w=10px / eps=2px knobs are actually meaningful. On normalized [0,1] coords
  the |d|<w branch would never trigger and the loss degenerates to pure log.

Validation (dual, reported separately):
  * val.json          -- group-aware held-out split, used for checkpointing /
                         early stopping (stable, mirrors the training mix).
  * roboflow_test.json -- real-world phone photos, logged each epoch as a
                         deployment-representative sanity metric only.

Usage:
    python 04_finetune_qat.py                       # full two-stage (default)
    python 04_finetune_qat.py --stage float         # Stage A only (baseline)
    python 04_finetune_qat.py --stage qat           # Stage B only (needs A's ckpt)
    python 04_finetune_qat.py --float-epochs 30 --qat-epochs 15
    python 04_finetune_qat.py --no-geom-aug         # photometric-only ablation
"""

import argparse
import json
import math
import os
import random
from pathlib import Path

import cv2
import numpy as np

# Suppress TF info/warning spam
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import tensorflow as tf

SCRIPT_DIR = Path(__file__).parent
NORM_DIR   = SCRIPT_DIR / "data" / "normalized"
MODELS_DIR = SCRIPT_DIR / "models"

BASE_MODEL  = MODELS_DIR / "base"
CKPT_DIR    = MODELS_DIR / "qat_checkpoint"
FLOAT_CKPT  = MODELS_DIR / "float_checkpoint"

SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

CORNER_ORDER = ["topLeft", "topRight", "bottomRight", "bottomLeft"]


# ── Wing Loss ──────────────────────────────────────────────────────────────────

def wing_loss(y_true, y_pred, w: float = 10.0, eps: float = 2.0):
    """
    Wing loss for coordinate regression (Feng et al. 2018).

      L(d) = w·ln(1 + |d|/eps)   if |d| < w
           = |d| - C             otherwise,   C = w - w·ln(1 + w/eps)

    NOTE: y_true / y_pred are expected in PIXEL units (normalized coords x 224),
    so w=10 and eps=2 correspond to ~10px and ~2px as intended.
    """
    C = w - w * math.log(1 + w / eps)
    diff = tf.abs(y_true - y_pred)
    flag = tf.cast(diff < w, tf.float32)
    loss = flag * (w * tf.math.log(1.0 + diff / eps)) + (1.0 - flag) * (diff - C)
    return tf.reduce_mean(loss)


# ── data augmentation ─────────────────────────────────────────────────────────

def _photometric(img: np.ndarray) -> np.ndarray:
    """Brightness + contrast jitter on a uint8 BGR image."""
    img = img.astype(np.float32)
    img += random.uniform(-30, 30)                       # brightness
    img = (img - 127.5) * random.uniform(0.7, 1.3) + 127.5  # contrast
    np.clip(img, 0, 255, out=img)
    return img.astype(np.uint8)


def _random_perspective(img: np.ndarray, pts: np.ndarray,
                        degrees: float = 10.0, translate: float = 0.10,
                        scale: float = 0.25, shear: float = 2.0,
                        perspective: float = 0.0006):
    """
    Apply a random homography to a SIZE×SIZE image and its 4 corner points.

    `pts` is a (4, 2) float array in pixel space [0, SIZE]. Returns the warped
    image and the transformed (4, 2) points. Modelled on the YOLOv8 augment;
    ranges are tightened for documents (small rotation, mild perspective) so
    corners stay near the frame.
    """
    H = W = SIZE

    # Center so all transforms pivot about the image middle.
    C = np.eye(3, dtype=np.float32)
    C[0, 2] = -W / 2
    C[1, 2] = -H / 2

    # Perspective
    P = np.eye(3, dtype=np.float32)
    P[2, 0] = random.uniform(-perspective, perspective)
    P[2, 1] = random.uniform(-perspective, perspective)

    # Rotation + uniform scale
    R = np.eye(3, dtype=np.float32)
    angle = random.uniform(-degrees, degrees)
    gain  = random.uniform(1 - scale, 1 + scale)
    R[:2] = cv2.getRotationMatrix2D(angle=angle, center=(0, 0), scale=gain)

    # Shear
    S = np.eye(3, dtype=np.float32)
    S[0, 1] = math.tan(random.uniform(-shear, shear) * math.pi / 180)
    S[1, 0] = math.tan(random.uniform(-shear, shear) * math.pi / 180)

    # Translation
    T = np.eye(3, dtype=np.float32)
    T[0, 2] = random.uniform(0.5 - translate, 0.5 + translate) * W
    T[1, 2] = random.uniform(0.5 - translate, 0.5 + translate) * H

    M = T @ S @ R @ P @ C
    img = cv2.warpPerspective(img, M, (W, H), borderValue=(114, 114, 114))

    # Transform the corner points through the same homography.
    xy = np.ones((4, 3), dtype=np.float32)
    xy[:, :2] = pts
    xy = xy @ M.T
    xy = xy[:, :2] / xy[:, 2:3]
    return img, xy


def _order_pts(pts: np.ndarray) -> np.ndarray:
    """Re-order 4 (x, y) points to canonical TL, TR, BR, BL by image position."""
    idx = np.argsort(pts[:, 1])           # by y
    top, bot = pts[idx[:2]], pts[idx[2:]]
    tl, tr = top[np.argsort(top[:, 0])]   # left, right
    bl, br = bot[np.argsort(bot[:, 0])]
    return np.stack([tl, tr, br, bl], axis=0)


def preprocess(rec: dict, augment: bool, geom_aug: bool) -> tuple:
    """
    Load + preprocess one record into (image_tensor, normalized_coords8).

    image_tensor: (SIZE, SIZE, 3) float32, ImageNet-normalized RGB.
    coords8:      [tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y] in [0, 1].
    """
    bgr = cv2.imread(rec["file"])
    if bgr is None:
        raise ValueError(f"unreadable image: {rec['file']}")
    h0, w0 = bgr.shape[:2]

    # Resize to SIZE and bring corners into [0, SIZE] pixel space.
    bgr = cv2.resize(bgr, (SIZE, SIZE), interpolation=cv2.INTER_AREA)
    cd = rec["corners"]
    pts = np.array(
        [[cd[k]["x"] / w0 * SIZE, cd[k]["y"] / h0 * SIZE] for k in CORNER_ORDER],
        dtype=np.float32,
    )

    if augment:
        bgr = _photometric(bgr)
        if random.random() < 0.5:                       # horizontal flip
            bgr = cv2.flip(bgr, 1)
            pts[:, 0] = SIZE - pts[:, 0]
        if geom_aug:
            bgr, pts = _random_perspective(bgr, pts)
        pts = _order_pts(pts)                            # rotation may reshuffle

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    rgb = (rgb / 255.0 - MEAN) / STD

    coords = (pts / SIZE).astype(np.float32).flatten()
    return rgb.astype(np.float32), coords


# ── tf.data pipeline ──────────────────────────────────────────────────────────

def load_records(json_paths: list[Path]) -> list[dict]:
    records = []
    for p in json_paths:
        if p.exists():
            records.extend(json.loads(p.read_text())["images"])
    return records


def make_dataset(records: list[dict], batch_size: int, augment: bool,
                 shuffle: bool, geom_aug: bool = True):
    """Build a tf.data.Dataset yielding (image_tensor, coords_label)."""

    def _gen():
        items = records[:]
        if shuffle:
            random.shuffle(items)
        for rec in items:
            try:
                img, coords = preprocess(rec, augment, geom_aug)
            except Exception:
                continue
            yield img, coords

    ds = tf.data.Dataset.from_generator(
        _gen,
        output_signature=(
            tf.TensorSpec(shape=(SIZE, SIZE, 3), dtype=tf.float32),
            tf.TensorSpec(shape=(8,),            dtype=tf.float32),
        ),
    )
    if shuffle:
        ds = ds.shuffle(buffer_size=min(512, len(records)))
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


# ── model loading ─────────────────────────────────────────────────────────────

def load_keras_model(model_dir: Path) -> tf.keras.Model:
    """Load a SavedModel / .h5 / .keras from a directory (first match wins)."""
    candidates = [
        model_dir,
        model_dir / "saved_model",
        model_dir / "final_model",
        model_dir / "DocCornerNet-CoordClass-V2",
    ]
    for cand in candidates:
        if (cand / "saved_model.pb").exists():
            print(f"  Loading SavedModel from {cand}")
            return tf.keras.models.load_model(str(cand))

    h5_files = list(model_dir.rglob("*.h5")) + list(model_dir.rglob("*.keras"))
    if h5_files:
        h5 = max(h5_files, key=lambda f: f.stat().st_size)
        print(f"  Loading {h5}")
        return tf.keras.models.load_model(str(h5))

    raise FileNotFoundError(
        f"No SavedModel or .h5 found in {model_dir}.\n"
        "Run: python 01_download.py --model   (or run Stage A first for QAT)"
    )


def build_fresh_model(input_size: int = 224) -> tf.keras.Model:
    """MobileNetV2 backbone (ImageNet weights) + 8-D corner regression head.

    Produces a single output tensor of shape (batch, 8) matching the corner
    order expected by CornerTrainer: [tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y]
    in normalised [0, 1] coordinates.
    """
    backbone = tf.keras.applications.MobileNetV2(
        input_shape=(input_size, input_size, 3),
        include_top=False,
        weights="imagenet",
    )
    x = backbone.output
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(256, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    coords = tf.keras.layers.Dense(8, activation="sigmoid", name="corners")(x)
    model = tf.keras.Model(inputs=backbone.input, outputs=coords, name="DocCornerNet_fresh")
    print(f"  Built fresh MobileNetV2 model ({model.count_params():,} params)")
    return model


# ── custom trainer ──────────────────────────────────────────────────────────────

class CornerTrainer(tf.keras.Model):
    """Wraps DocCornerNet with the pixel-space Wing Loss on the corner output."""

    def __init__(self, base: tf.keras.Model):
        super().__init__()
        self.base = base
        # Identify which output is the 8-D corner vector.
        self._coords_idx = 0
        for i, out in enumerate(base.outputs):
            flat = 1
            for d in out.shape[1:]:
                flat *= d
            if flat == 8:
                self._coords_idx = i

    def call(self, x, training=False):
        return self.base(x, training=training)

    def _coords(self, outputs):
        if not isinstance(outputs, (list, tuple)):
            outputs = [outputs]
        return tf.reshape(outputs[self._coords_idx], (-1, 8))

    def train_step(self, data):
        imgs, coords_true = data
        with tf.GradientTape() as tape:
            coords_pred = self._coords(self(imgs, training=True))
            # Wing loss in pixel units (x SIZE) -- score head is intentionally
            # left unsupervised (its label was a constant 1, teaching nothing).
            loss = wing_loss(coords_true * SIZE, coords_pred * SIZE)
        grads = tape.gradient(loss, self.trainable_variables)
        self.optimizer.apply_gradients(zip(grads, self.trainable_variables))
        return {"loss": loss}

    def test_step(self, data):
        imgs, coords_true = data
        coords_pred = self._coords(self(imgs, training=False))
        loss = wing_loss(coords_true * SIZE, coords_pred * SIZE)
        err = tf.reduce_mean(tf.abs(coords_true - coords_pred)) * SIZE
        return {"loss": loss, "corner_err_px224": err}


# ── callbacks ────────────────────────────────────────────────────────────────

class ExtraValCallback(tf.keras.callbacks.Callback):
    """Log mean corner error on an extra dataset (e.g. Roboflow test) each epoch."""

    def __init__(self, ds, name: str):
        super().__init__()
        self.ds = ds
        self.name = name

    def on_epoch_end(self, epoch, logs=None):
        if self.ds is None:
            return
        errs = []
        for imgs, coords in self.ds:
            pred = self.model._coords(self.model(imgs, training=False))
            errs.append(float(tf.reduce_mean(tf.abs(coords - pred)).numpy()) * SIZE)
        e = float(np.mean(errs)) if errs else float("nan")
        if logs is not None:
            logs[self.name] = e
        print(f"  {self.name}: {e:.2f} px@224")


class FreezeBNCallback(tf.keras.callbacks.Callback):
    """
    Freeze BatchNorm running statistics from `freeze_epoch` onward.

    Best-effort: walks the (possibly tfmot-wrapped) layer tree and flips the
    `trainable` flag on BatchNormalization layers so their moving mean/var stop
    updating -- this stabilizes the simulated INT8 activation ranges late in QAT.
    """

    def __init__(self, freeze_epoch: int):
        super().__init__()
        self.freeze_epoch = freeze_epoch
        self._done = False

    def _walk(self, layer):
        yield layer
        for attr in ("layer", "_layer"):
            inner = getattr(layer, attr, None)
            if isinstance(inner, tf.keras.layers.Layer):
                yield from self._walk(inner)
        for sub in getattr(layer, "layers", []):
            yield from self._walk(sub)

    def on_epoch_begin(self, epoch, logs=None):
        if self._done or epoch < self.freeze_epoch:
            return
        frozen = 0
        try:
            for layer in self._walk(self.model.base):
                if "batchnorm" in type(layer).__name__.lower():
                    layer.trainable = False
                    frozen += 1
        except Exception as exc:
            print(f"  [warn] BN freeze skipped: {exc}")
        if frozen:
            print(f"  Froze {frozen} BatchNorm layers (epoch {epoch})")
        self._done = True


def cosine_warmup_scheduler(total_epochs: int, base_lr: float,
                            warmup_frac: float = 0.1, min_lr: float = 1e-6):
    """LearningRateScheduler fn: linear warmup then cosine decay to min_lr."""
    warmup = max(1, int(total_epochs * warmup_frac))

    def schedule(epoch, _lr):
        if epoch < warmup:
            return base_lr * (epoch + 1) / warmup
        progress = (epoch - warmup) / max(1, total_epochs - warmup)
        cos = 0.5 * (1 + math.cos(math.pi * progress))
        return min_lr + (base_lr - min_lr) * cos

    return tf.keras.callbacks.LearningRateScheduler(schedule, verbose=0)


# ── one training stage ──────────────────────────────────────────────────────────

def make_optimizer(lr: float):
    try:
        return tf.keras.optimizers.AdamW(learning_rate=lr, weight_decay=1e-4)
    except (AttributeError, TypeError):
        return tf.keras.optimizers.Adam(learning_rate=lr)


def run_stage(active_model, out_dir: Path, *, epochs: int, base_lr: float,
              train_ds, val_ds, rf_test_ds, bn_freeze_epoch: int | None,
              stage_name: str):
    out_dir.mkdir(parents=True, exist_ok=True)
    trainer = CornerTrainer(active_model)
    trainer.compile(optimizer=make_optimizer(base_lr))

    monitor = "val_corner_err_px224" if val_ds is not None else "loss"
    callbacks = [
        cosine_warmup_scheduler(epochs, base_lr),
        ExtraValCallback(rf_test_ds, "roboflow_test_err_px224"),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(out_dir / "best_model"),
            monitor=monitor, save_best_only=True, save_format="tf", verbose=1),
        tf.keras.callbacks.EarlyStopping(
            monitor=monitor, patience=10, restore_best_weights=True, verbose=1),
        tf.keras.callbacks.CSVLogger(str(out_dir / "training_log.csv")),
    ]
    if bn_freeze_epoch is not None:
        callbacks.insert(1, FreezeBNCallback(bn_freeze_epoch))

    print(f"\n=== Stage {stage_name}: {epochs} epochs, base LR {base_lr:g} ===")
    trainer.fit(train_ds, epochs=epochs, validation_data=val_ds,
                callbacks=callbacks, verbose=1)

    final_path = out_dir / "final_model"
    trainer.base.save(str(final_path))
    print(f"  Stage {stage_name} model saved -> {final_path}")
    return trainer.base


# ── main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=["float", "qat", "both"], default="both",
                        help="float = Stage A only, qat = Stage B only, both = full")
    parser.add_argument("--float-epochs", type=int,   default=30)
    parser.add_argument("--qat-epochs",   type=int,   default=15)
    parser.add_argument("--float-lr",     type=float, default=1e-4)
    parser.add_argument("--qat-lr",       type=float, default=2e-5)
    parser.add_argument("--batch",        type=int,   default=16)
    parser.add_argument("--model",        type=Path,  default=BASE_MODEL,
                        help="Base model for Stage A (HF SavedModel dir)")
    parser.add_argument("--from-scratch", action="store_true",
                        help="Build fresh MobileNetV2+head instead of loading base model")
    parser.add_argument("--no-geom-aug",  action="store_true",
                        help="Disable geometric augmentation (photometric only)")
    parser.add_argument("--merge-val",    action="store_true",
                        help="Fold val.json into training (no group-aware val signal)")
    parser.add_argument("--freeze-backbone", action="store_true",
                        help="Freeze MobileNetV2 backbone, only train the head")
    args = parser.parse_args()

    geom_aug = not args.no_geom_aug
    print(f"\n=== DocCornerNet V2 two-stage fine-tuning (stage={args.stage}) ===")
    print(f"  Float: {args.float_epochs}e @ {args.float_lr:g} | "
          f"QAT: {args.qat_epochs}e @ {args.qat_lr:g} | batch {args.batch} | "
          f"geom_aug={geom_aug}")

    # ── data ──────────────────────────────────────────────────────────────────
    train_paths = [NORM_DIR / "train.json"]
    if args.merge_val:
        train_paths.append(NORM_DIR / "val.json")
    train_records = load_records(train_paths)
    val_records   = [] if args.merge_val else load_records([NORM_DIR / "val.json"])
    rf_records    = load_records([NORM_DIR / "roboflow_test.json"])

    if not train_records:
        print("[error] No training records. Run 01_download.py + 02_normalize.py first.")
        return

    print(f"\n  Train {len(train_records)} | val {len(val_records)} | "
          f"roboflow_test {len(rf_records)}")

    train_ds   = make_dataset(train_records, args.batch, augment=True,
                              shuffle=True, geom_aug=geom_aug)
    val_ds     = (make_dataset(val_records, args.batch, augment=False,
                               shuffle=False) if val_records else None)
    rf_test_ds = (make_dataset(rf_records, args.batch, augment=False,
                               shuffle=False) if rf_records else None)

    # ── Stage A: float32 domain adaptation ─────────────────────────────────────
    if args.stage in ("float", "both"):
        if args.from_scratch:
            print("\n--- Building fresh MobileNetV2 model for Stage A ---")
            base_model = build_fresh_model(SIZE)
        else:
            print("\n--- Loading base model for Stage A ---")
            base_model = load_keras_model(args.model)
        if args.freeze_backbone:
            for layer in base_model.layers:
                if "mobilenet" in layer.name.lower():
                    layer.trainable = False
            print(f"  Frozen backbone layers: "
                  f"{sum(1 for l in base_model.layers if not l.trainable)}")
        run_stage(base_model, FLOAT_CKPT,
                  epochs=args.float_epochs, base_lr=args.float_lr,
                  train_ds=train_ds, val_ds=val_ds, rf_test_ds=rf_test_ds,
                  bn_freeze_epoch=None, stage_name="A (float32)")

    # ── Stage B: QAT from the Stage-A weights ──────────────────────────────────
    if args.stage in ("qat", "both"):
        qat_src = FLOAT_CKPT / "final_model"
        src_dir = qat_src if qat_src.exists() else args.model
        print(f"\n--- Loading model for Stage B (QAT) from {src_dir} ---")
        adapted = load_keras_model(src_dir)

        try:
            import tensorflow_model_optimization as tfmot
            print("  Applying QAT fake-quant nodes ...")
            qat_model = tfmot.quantization.keras.quantize_model(adapted)
        except ImportError:
            print("  [WARN] tensorflow-model-optimization not installed; "
                  "Stage B will fine-tune float32 instead of QAT.")
            qat_model = adapted

        # Freeze BN stats in the last ~third of QAT so INT8 ranges settle.
        bn_freeze = max(1, int(args.qat_epochs * 0.7))
        run_stage(qat_model, CKPT_DIR,
                  epochs=args.qat_epochs, base_lr=args.qat_lr,
                  train_ds=train_ds, val_ds=val_ds, rf_test_ds=rf_test_ds,
                  bn_freeze_epoch=bn_freeze, stage_name="B (QAT)")

    print("\nok Training complete. Run  python 05_export.py  next.")


if __name__ == "__main__":
    main()
