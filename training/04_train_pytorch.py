"""
04_train_pytorch.py — Corner-detection training + INT8 export (PyTorch).

A/B comparison driver: trains a MobileNetV2 corner regressor at a chosen width,
exports float32 + INT8 ONNX (INT8 via ONNX Runtime static quantisation,
calibrated on the val set), and reports accuracy / size / CPU latency for both.

The INT8 path here is post-training static quantisation — the reliable,
ORT-Web-friendly route used to *compare* backbones. Run full QAT
(separate script) on the winning backbone afterwards if INT8 accuracy needs it.

Metric: mean per-corner L2 distance in pixels @ 224×224 input.

Usage:
    # alpha=0.5, ImageNet-pretrained (timm)
    python 04_train_pytorch.py --width 0.5  --pretrained     --tag a050
    # alpha=0.35, from scratch (no pretrained weights exist below 0.5)
    python 04_train_pytorch.py --width 0.35 --no-pretrained  --tag a035
"""

import argparse
import json
import math
import random
import time
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import models
from tqdm import tqdm

SCRIPT_DIR = Path(__file__).parent
NORM_DIR   = SCRIPT_DIR / "data" / "normalized"
MODELS_DIR = SCRIPT_DIR / "models"

SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
CORNER_ORDER = ["topLeft", "topRight", "bottomRight", "bottomLeft"]


# ── Wing Loss ─────────────────────────────────────────────────────────────────

def wing_loss(pred, target, w: float = 10.0, eps: float = 2.0):
    """Wing loss in pixel units (inputs already × SIZE)."""
    C = w - w * math.log(1 + w / eps)
    d = torch.abs(pred - target)
    return torch.where(d < w, w * torch.log(1 + d / eps), d - C).mean()


def corner_px_error_t(pred, target):
    """Mean per-corner L2 distance in px @ SIZE. pred/target: (N,8) in [0,1]."""
    p = (pred.reshape(-1, 4, 2)) * SIZE
    t = (target.reshape(-1, 4, 2)) * SIZE
    return (p - t).pow(2).sum(-1).sqrt().mean()


def corner_px_error_np(pred, target):
    p = pred.reshape(-1, 4, 2) * SIZE
    t = target.reshape(-1, 4, 2) * SIZE
    return float(np.sqrt(((p - t) ** 2).sum(-1)).mean())


# ── augmentation ─────────────────────────────────────────────────────────────

def _photometric(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] *= random.uniform(0.7, 1.3)
    hsv[..., 2] *= random.uniform(0.6, 1.4)
    hsv = np.clip(hsv, 0, 255).astype(np.uint8)
    bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    if random.random() < 0.3:
        q = random.randint(40, 95)
        _, enc = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, q])
        bgr = cv2.imdecode(enc, cv2.IMREAD_COLOR)
    return bgr


def _random_perspective(img, pts, degrees=10.0, translate=0.10,
                        scale=0.25, shear=2.0, perspective=0.0006):
    H = W = SIZE
    C = np.eye(3, dtype=np.float32); C[0, 2] = -W / 2; C[1, 2] = -H / 2
    P = np.eye(3, dtype=np.float32)
    P[2, 0] = random.uniform(-perspective, perspective)
    P[2, 1] = random.uniform(-perspective, perspective)
    R = np.eye(3, dtype=np.float32)
    angle = random.uniform(-degrees, degrees); gain = random.uniform(1 - scale, 1 + scale)
    R[:2] = cv2.getRotationMatrix2D(angle=angle, center=(0, 0), scale=gain)
    S = np.eye(3, dtype=np.float32)
    S[0, 1] = math.tan(random.uniform(-shear, shear) * math.pi / 180)
    S[1, 0] = math.tan(random.uniform(-shear, shear) * math.pi / 180)
    T = np.eye(3, dtype=np.float32)
    T[0, 2] = random.uniform(0.5 - translate, 0.5 + translate) * W
    T[1, 2] = random.uniform(0.5 - translate, 0.5 + translate) * H
    M = T @ S @ R @ P @ C
    img = cv2.warpPerspective(img, M, (W, H), borderValue=(114, 114, 114))
    xy = np.ones((4, 3), dtype=np.float32); xy[:, :2] = pts
    xy = xy @ M.T
    return img, xy[:, :2] / xy[:, 2:3]


def _order_pts(pts):
    idx = np.argsort(pts[:, 1])
    top, bot = pts[idx[:2]], pts[idx[2:]]
    tl, tr = top[np.argsort(top[:, 0])]
    bl, br = bot[np.argsort(bot[:, 0])]
    return np.stack([tl, tr, br, bl], axis=0)


# ── dataset ───────────────────────────────────────────────────────────────────

class CornerDataset(Dataset):
    def __init__(self, records, augment, geom_aug=True):
        self.records, self.augment, self.geom_aug = records, augment, geom_aug

    def __len__(self): return len(self.records)

    def __getitem__(self, idx):
        rec = self.records[idx]
        bgr = cv2.imread(rec["file"])
        if bgr is None:
            return self._to_tensor(np.full((SIZE, SIZE, 3), 114, np.uint8)), \
                   torch.zeros(8)
        h0, w0 = bgr.shape[:2]
        bgr = cv2.resize(bgr, (SIZE, SIZE), interpolation=cv2.INTER_AREA)
        cd = rec["corners"]
        pts = np.array([[cd[k]["x"] / w0 * SIZE, cd[k]["y"] / h0 * SIZE]
                        for k in CORNER_ORDER], dtype=np.float32)
        if self.augment:
            bgr = _photometric(bgr)
            if random.random() < 0.5:
                bgr = cv2.flip(bgr, 1); pts[:, 0] = SIZE - pts[:, 0]
            if self.geom_aug:
                bgr, pts = _random_perspective(bgr, pts)
            pts = _order_pts(pts)
        coords = (pts / SIZE).astype(np.float32).flatten()
        return self._to_tensor(bgr), torch.from_numpy(coords)

    @staticmethod
    def _to_tensor(bgr):
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        rgb = (rgb - MEAN) / STD
        return torch.from_numpy(rgb.transpose(2, 0, 1))


def load_records(paths):
    out = []
    for p in paths:
        if p.exists():
            out.extend(json.loads(p.read_text())["images"])
    return out


def make_loader(records, batch, augment, shuffle, geom_aug=True, workers=8):
    ds = CornerDataset(records, augment, geom_aug)
    return DataLoader(ds, batch_size=batch, shuffle=shuffle, num_workers=workers,
                      pin_memory=True, persistent_workers=workers > 0)


# ── model ─────────────────────────────────────────────────────────────────────

class CornerNet(nn.Module):
    def __init__(self, backbone, feat_dim):
        super().__init__()
        self.backbone = backbone
        self.head = nn.Sequential(
            nn.Linear(feat_dim, 256), nn.ReLU(inplace=True),
            nn.Dropout(0.2), nn.Linear(256, 8), nn.Sigmoid(),
        )

    def forward(self, x):
        return self.head(self.backbone(x))


def build_model(width: float, pretrained: bool) -> CornerNet:
    """MobileNetV2 backbone -> pooled (N,1280) features -> corner head.

    pretrained=True uses timm ImageNet weights (only widths 0.5 / 1.0 exist).
    pretrained=False builds torchvision MobileNetV2 at arbitrary width from scratch.
    """
    if pretrained:
        import timm
        name = {0.5: "mobilenetv2_050.lamb_in1k",
                1.0: "mobilenetv2_100.ra_in1k"}.get(width)
        if name is None:
            raise ValueError(f"No pretrained weights for width={width}; use --no-pretrained")
        backbone = timm.create_model(name, pretrained=True, num_classes=0,
                                     global_pool="avg")
        feat = backbone.num_features
    else:
        m = models.mobilenet_v2(width_mult=width)
        backbone = nn.Sequential(m.features, nn.AdaptiveAvgPool2d(1), nn.Flatten())
        feat = m.last_channel
    return CornerNet(backbone, feat)


# ── LR schedule + train / eval ────────────────────────────────────────────────

def cosine_with_warmup(optimizer, warmup, total):
    def f(step):
        if step < warmup:
            return step / max(1, warmup)
        p = (step - warmup) / max(1, total - warmup)
        return 0.5 * (1 + math.cos(math.pi * p))
    return optim.lr_scheduler.LambdaLR(optimizer, f)


def train_epoch(model, loader, opt, sched, device, scaler):
    model.train(); total = 0.0
    for imgs, coords in loader:
        imgs, coords = imgs.to(device), coords.to(device)
        opt.zero_grad(set_to_none=True)
        with torch.amp.autocast("cuda"):
            loss = wing_loss(model(imgs) * SIZE, coords * SIZE)
        scaler.scale(loss).backward()
        scaler.unscale_(opt)
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(opt); scaler.update(); sched.step()
        total += loss.item()
    return total / len(loader)


@torch.no_grad()
def eval_torch(model, loader, device):
    model.eval(); errs = []
    for imgs, coords in loader:
        pred = model(imgs.to(device)).cpu()
        errs.append(corner_px_error_t(pred, coords).item())
    return float(np.mean(errs)) if errs else float("nan")


# ── ONNX export + static INT8 quantisation + ONNX eval ─────────────────────────

def export_and_quantize(model, val_records, export_dir, device):
    import onnxruntime as ort
    ort.set_default_logger_severity(3)  # silence initializer-cleanup spam
    from onnxruntime.quantization import (
        CalibrationDataReader, quantize_static, QuantType, QuantFormat,
    )
    export_dir.mkdir(parents=True, exist_ok=True)
    f32 = export_dir / "model_float32.onnx"
    i8  = export_dir / "model_int8.onnx"

    model.eval().to(device)
    dummy = torch.zeros(1, 3, SIZE, SIZE, device=device)
    torch.onnx.export(model, dummy, str(f32),
                      input_names=["image"], output_names=["corners"],
                      dynamic_axes={"image": {0: "b"}, "corners": {0: "b"}},
                      opset_version=17)

    # Calibration reader over a slice of val images (preprocessed, no aug).
    calib_ds = CornerDataset(val_records[:300], augment=False)

    class Reader(CalibrationDataReader):
        def __init__(self):
            self.it = iter([{"image": calib_ds[i][0].unsqueeze(0).numpy()}
                            for i in range(len(calib_ds))])
        def get_next(self): return next(self.it, None)

    quantize_static(str(f32), str(i8), Reader(),
                    quant_format=QuantFormat.QDQ,
                    activation_type=QuantType.QInt8,
                    weight_type=QuantType.QInt8,
                    per_channel=True)
    return f32, i8


@torch.no_grad()
def eval_onnx(onnx_path, records, workers=8):
    import onnxruntime as ort
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    loader = make_loader(records, 64, augment=False, shuffle=False,
                         geom_aug=False, workers=workers)
    errs = []
    for imgs, coords in loader:
        pred = sess.run(None, {"image": imgs.numpy()})[0]
        errs.append(corner_px_error_np(pred, coords.numpy()))
    return float(np.mean(errs)) if errs else float("nan")


def cpu_latency(onnx_path, runs=50):
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = 1
    sess = ort.InferenceSession(str(onnx_path), so, providers=["CPUExecutionProvider"])
    inp = {"image": np.random.randn(1, 3, SIZE, SIZE).astype(np.float32)}
    for _ in range(5): sess.run(None, inp)
    t0 = time.perf_counter()
    for _ in range(runs): sess.run(None, inp)
    return (time.perf_counter() - t0) / runs * 1000


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=float, default=0.5)
    ap.add_argument("--pretrained", dest="pretrained", action="store_true", default=True)
    ap.add_argument("--no-pretrained", dest="pretrained", action="store_false")
    ap.add_argument("--tag", default="run")
    ap.add_argument("--float-epochs", type=int, default=25)
    ap.add_argument("--float-lr", type=float, default=3e-4)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--no-geom-aug", action="store_true")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    torch.manual_seed(args.seed); random.seed(args.seed); np.random.seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ckpt_dir   = MODELS_DIR / f"pt_{args.tag}"
    export_dir = MODELS_DIR / "export" / args.tag
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n=== CornerNet train [{args.tag}] ===")
    print(f"  device={device}  width={args.width}  pretrained={args.pretrained}  "
          f"float={args.float_epochs}e@{args.float_lr:g}  batch={args.batch}")

    train_records = load_records([NORM_DIR / "train.json"])
    val_records   = load_records([NORM_DIR / "val.json"])
    test_records  = load_records([NORM_DIR / "dcd_test.json"])
    if not train_records:
        print("[error] No training records."); return
    print(f"  train={len(train_records):,}  val={len(val_records):,}  "
          f"dcd_test={len(test_records):,}")

    geom = not args.no_geom_aug
    tl = make_loader(train_records, args.batch, True,  True,  geom, args.workers)
    vl = make_loader(val_records,   args.batch, False, False, False, args.workers)

    model = build_model(args.width, args.pretrained).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"  params: {n_params:,}")

    opt = optim.AdamW(model.parameters(), lr=args.float_lr, weight_decay=1e-4)
    total = args.float_epochs * len(tl)
    sched = cosine_with_warmup(opt, min(500, total // 10), total)
    scaler = torch.amp.GradScaler("cuda")

    # TensorBoard: writes to runs/<tag>/. View all runs together with:
    #   tensorboard --logdir training/runs
    from torch.utils.tensorboard import SummaryWriter
    writer = SummaryWriter(log_dir=str(SCRIPT_DIR / "runs" / args.tag))

    best, best_path = float("inf"), ckpt_dir / "best.pt"
    for ep in range(1, args.float_epochs + 1):
        tr = train_epoch(model, tl, opt, sched, device, scaler)
        ve = eval_torch(model, vl, device)
        if ve < best:
            best = ve; torch.save(model.state_dict(), best_path)
        writer.add_scalar("train/wing_loss", tr, ep)
        writer.add_scalar("val/corner_err_px", ve, ep)
        writer.add_scalar("val/best_corner_err_px", best, ep)
        writer.add_scalar("lr", opt.param_groups[0]["lr"], ep)
        writer.flush()
        print(f"  [{ep:3d}/{args.float_epochs}] train_loss={tr:.3f}  "
              f"val_err_px={ve:.2f}  lr={opt.param_groups[0]['lr']:.2e}"
              + (" *" if ve == best else ""), flush=True)

    model.load_state_dict(torch.load(best_path, weights_only=True))
    print(f"\n  best float val_err={best:.2f}px")

    # float test-set accuracy
    float_test = eval_onnx_skip = None
    print("\n=== Export + INT8 static quant ===")
    f32, i8 = export_and_quantize(model, val_records, export_dir, device)

    res = {
        "tag": args.tag, "width": args.width, "pretrained": args.pretrained,
        "params": n_params,
        "float_val_err_px": round(best, 3),
        "float32_onnx_mb": round(f32.stat().st_size / 1e6, 2),
        "int8_onnx_mb":    round(i8.stat().st_size / 1e6, 2),
        "float32_val_err_px": round(eval_onnx(f32, val_records, args.workers), 3),
        "int8_val_err_px":    round(eval_onnx(i8,  val_records, args.workers), 3),
        "float32_test_err_px": round(eval_onnx(f32, test_records, args.workers), 3),
        "int8_test_err_px":    round(eval_onnx(i8,  test_records, args.workers), 3),
        "float32_cpu_ms": round(cpu_latency(f32), 2),
        "int8_cpu_ms":    round(cpu_latency(i8), 2),
    }
    (export_dir / "results.json").write_text(json.dumps(res, indent=2))
    writer.add_hparams(
        {"width": args.width, "pretrained": args.pretrained, "params": n_params},
        {f"final/{k}": v for k, v in res.items() if isinstance(v, (int, float))},
    )
    writer.add_text("results", "```json\n" + json.dumps(res, indent=2) + "\n```")
    writer.close()
    print("\n=== RESULTS ===")
    for k, v in res.items():
        print(f"  {k:22s} {v}")
    print(f"\n  -> {export_dir/'results.json'}")


if __name__ == "__main__":
    main()
