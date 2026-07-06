"""
Step 2 -- Normalize all datasets to a unified annotation format.

Output files:
  training/data/normalized/train.json          -- training pool
  training/data/normalized/val.json            -- group-aware held-out val
  training/data/normalized/roboflow_test.json  -- real-world phone photos
                                                  (Roboflow test/ split)

The train/val split is stratified per source and group-aware: all frames of one
clip/video share a `group` and never straddle the split, so val measures
generalization to unseen documents. The Roboflow `test/` split is held out
entirely as a deployment-representative metric.

Each JSON is:
  {
    "images": [
      {
        "file":   "absolute/path/to/image.jpg",
        "width":  1280,
        "height": 960,
        "source": "midv500",
        "corners": {
          "topLeft":     {"x": 120, "y": 80},
          "topRight":    {"x": 900, "y": 75},
          "bottomRight": {"x": 910, "y": 720},
          "bottomLeft":  {"x": 115, "y": 725}
        }
      },
      ...
    ]
  }

Corners that fall outside the image boundary are clamped to [0, W] × [0, H].
All pixel coordinates are in the original image space (not resized).

Datasets handled:
  • midv500    -- JSON quad (TL/TR/BR/BL order)
  • smartdoc   -- XML quadrangle points (TL/TR/BR/BL order)
  • uvdoc      -- grid2d[0,0]/[0,-1]/[-1,-1]/[-1,0] corner extraction
  • warpdoc    -- document boundary mask or homography -> quad corners
  • roboflow   -- YOLO pose labels (kpt_shape [4,3]: 4 corner keypoints)

Run after 01_download.py:
    python 02_normalize.py [--val-split 0.15] [--min-area 0.03]
"""

import argparse
import json
import math
import random
import xml.etree.ElementTree as ET
from pathlib import Path

import cv2
import numpy as np
from tqdm import tqdm

SCRIPT_DIR = Path(__file__).parent
RAW_DIR    = SCRIPT_DIR / "data" / "raw"
NORM_DIR   = SCRIPT_DIR / "data" / "normalized"
NORM_DIR.mkdir(parents=True, exist_ok=True)

# Minimum document quad area relative to full image -- filters out degenerate quads
DEFAULT_MIN_AREA_RATIO = 0.03


# ── geometry helpers ───────────────────────────────────────────────────────────

def _quad_area(corners: list[dict]) -> float:
    pts = np.array([[c["x"], c["y"]] for c in corners], dtype=float)
    n = len(pts)
    x, y = pts[:, 0], pts[:, 1]
    return 0.5 * abs(sum(x[i] * y[(i+1) % n] - x[(i+1) % n] * y[i] for i in range(n)))


def _clamp_corners(corners: dict, w: int, h: int) -> dict:
    return {
        k: {"x": float(np.clip(v["x"], 0, w)), "y": float(np.clip(v["y"], 0, h))}
        for k, v in corners.items()
    }


def _order_corners(pts: list) -> dict:
    """Given 4 (x, y) tuples in any order, return TL/TR/BR/BL dict."""
    pts = sorted(pts, key=lambda p: p[1])          # sort by y
    top_two = sorted(pts[:2], key=lambda p: p[0])  # top two: left then right
    bot_two = sorted(pts[2:], key=lambda p: p[0])  # bottom two: left then right
    tl, tr = top_two
    bl, br = bot_two
    return {
        "topLeft":     {"x": float(tl[0]), "y": float(tl[1])},
        "topRight":    {"x": float(tr[0]), "y": float(tr[1])},
        "bottomRight": {"x": float(br[0]), "y": float(br[1])},
        "bottomLeft":  {"x": float(bl[0]), "y": float(bl[1])},
    }


# ── MIDV-500 ───────────────────────────────────────────────────────────────────

def _parse_midv500() -> list[dict]:
    """
    MIDV-500 ZIP structure (after extraction):
      data/raw/midv500/<doc_type>/
        images/<condition>/<clip_id>.tif
        ground_truth/<condition>/<clip_id>.json  -> {"quad": [[x,y], ...]}
    Corner order is TL, TR, BR, BL (clockwise from top-left).
    """
    records = []
    root = RAW_DIR / "midv500"
    if not root.exists():
        print("[skip] MIDV-500 not found -- run 01_download.py first")
        return records

    # Per-clip JSONs (exclude top-level summary at ground_truth/<doc>.json)
    gt_files = [f for f in root.rglob("*.json")
                if "ground_truth" in f.parts and f.parent.name != "ground_truth"]
    print(f"MIDV-500: found {len(gt_files)} per-clip GT files")

    for gt_file in tqdm(gt_files, desc="midv500"):
        try:
            data = json.loads(gt_file.read_text())
        except Exception:
            continue

        quad = data.get("quad")
        if not quad or len(quad) != 4:
            continue

        # gt path:  <doc>/ground_truth/<cond>/<clip>.json
        # img path: <doc>/images/<cond>/<clip>.tif
        doc_dir   = gt_file.parent.parent.parent
        cond      = gt_file.parent.name
        clip_stem = gt_file.stem

        img_path = doc_dir / "images" / cond / (clip_stem + ".tif")
        if not img_path.exists():
            img_path = doc_dir / "images" / cond / (clip_stem + ".jpg")
        if not img_path.exists():
            continue

        img = cv2.imread(str(img_path), cv2.IMREAD_COLOR)
        if img is None:
            img = cv2.imread(str(img_path), cv2.IMREAD_UNCHANGED)
        if img is None:
            continue
        if img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        h, w = img.shape[:2]

        corners = {
            "topLeft":     {"x": float(quad[0][0]), "y": float(quad[0][1])},
            "topRight":    {"x": float(quad[1][0]), "y": float(quad[1][1])},
            "bottomRight": {"x": float(quad[2][0]), "y": float(quad[2][1])},
            "bottomLeft":  {"x": float(quad[3][0]), "y": float(quad[3][1])},
        }
        corners = _clamp_corners(corners, w, h)

        records.append({
            "file":    str(img_path),
            "width":   w,
            "height":  h,
            "source":  "midv500",
            # All frames of one clip (doc_type + capture condition) share a group
            # so they never straddle the train/val boundary.
            "group":   f"midv500/{doc_dir.name}/{cond}",
            "corners": corners,
        })

    print(f"  -> {len(records)} images")
    return records


def _parse_smartdoc() -> list[dict]:
    """
    SmartDoc 2015 actual layout:
      input_sample/<background>/<doctype>.avi
      input_sample_groundtruth/<background>_gt/<doctype>.gt.xml

    XML schema (actual):
      <segmentation_results>
        <frame index="1" rejected="false">
          <point name="tl" x="..." y="..."/>
          <point name="tr" x="..." y="..."/>
          <point name="br" x="..." y="..."/>
          <point name="bl" x="..." y="..."/>
        </frame>
      </segmentation_results>

    We extract up to MAX_FRAMES_PER_VIDEO evenly-spaced frames per AVI using
    OpenCV VideoCapture, write them to data/raw/smartdoc15_frames/, then pair
    with the GT corners from the XML by frame index.
    """
    MAX_FRAMES = 30

    records = []
    root = RAW_DIR / "smartdoc15"
    frames_cache = RAW_DIR / "smartdoc15_frames"
    if not root.exists():
        print("[skip] SmartDoc 2015 not found -- run 01_download.py first")
        return records

    avi_files = list(root.rglob("*.avi"))
    print(f"SmartDoc 2015: found {len(avi_files)} AVI files")

    for avi_path in tqdm(avi_files, desc="smartdoc"):
        # input_sample/background00/foo.avi -> input_sample_groundtruth/background00_gt/foo.gt.xml
        parent_dir = avi_path.parent         # .../background00/
        subset_dir = parent_dir.parent       # .../input_sample/
        gt_subset  = subset_dir.parent / (subset_dir.name + "_groundtruth")
        gt_dir     = gt_subset / (parent_dir.name + "_gt")
        xml_path   = gt_dir / (avi_path.stem + ".gt.xml")
        if not xml_path.exists():
            continue

        try:
            tree = ET.parse(xml_path)
        except ET.ParseError:
            continue

        # Build {frame_index: {tl/tr/br/bl: (x,y)}} from XML
        frame_corners: dict[int, dict] = {}
        for frame_el in tree.getroot().findall(".//frame"):
            if frame_el.get("rejected", "false").lower() == "true":
                continue
            idx = int(frame_el.get("index", 0))
            pts_by_name = {
                pt.get("name"): (float(pt.get("x", 0)), float(pt.get("y", 0)))
                for pt in frame_el.findall("point")
                if pt.get("name")
            }
            if len(pts_by_name) >= 4:
                frame_corners[idx] = pts_by_name

        if not frame_corners:
            continue

        # Evenly sample up to MAX_FRAMES from the available annotated frames
        available = sorted(frame_corners.keys())
        step = max(1, len(available) // MAX_FRAMES)
        selected = available[::step][:MAX_FRAMES]

        cap = cv2.VideoCapture(str(avi_path))
        if not cap.isOpened():
            continue

        frame_dir = frames_cache / avi_path.stem
        frame_dir.mkdir(parents=True, exist_ok=True)

        for frame_idx in selected:
            pts_by_name = frame_corners[frame_idx]
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx - 1)  # XML index is 1-based
            ret, frame = cap.read()
            if not ret:
                continue
            h, w = frame.shape[:2]

            out_path = frame_dir / f"{frame_idx:05d}.jpg"
            if not out_path.exists():
                cv2.imwrite(str(out_path), frame)

            name_map = {
                "tl": "topLeft", "tr": "topRight",
                "br": "bottomRight", "bl": "bottomLeft",
            }
            corners = {
                full: {"x": float(pts_by_name[short][0]), "y": float(pts_by_name[short][1])}
                for short, full in name_map.items()
                if short in pts_by_name
            }
            if len(corners) < 4:
                continue

            corners = _clamp_corners(corners, w, h)
            records.append({
                "file":    str(out_path),
                "width":   w,
                "height":  h,
                "source":  "smartdoc",
                # All frames extracted from one AVI share a group.
                "group":   f"smartdoc/{parent_dir.name}/{avi_path.stem}",
                "corners": corners,
            })

        cap.release()

    print(f"  -> {len(records)} images")
    return records


# ── UVDoc ──────────────────────────────────────────────────────────────────────

def _parse_uvdoc() -> list[dict]:
    """
    UVDoc benchmark: warped document images + JSON metadata with grid2d.

    grid2d is a (H×W×2) array of (x,y) pixel coordinates for a regular grid
    of points on the document surface. The 4 extreme grid corners give us
    the document quad corners.

    Expected layout (nested under a UVDoc_benchmark/ subdir):
      data/raw/uvdoc/UVDoc_benchmark/
        img/        <index>.png
        grid2d/     <prefix>_<index>_<suffix>.mat
    """
    import scipy.io  # optional; only needed for .mat files

    records = []
    root = RAW_DIR / "uvdoc"
    if not root.exists():
        print("[skip] UVDoc not found -- run 01_download.py first")
        return records

    # Search for img/ and grid2d/ dirs anywhere under root
    img_dir  = next(iter(sorted(root.rglob("img"),    key=lambda p: len(p.parts))), None)
    grid_dir = next(iter(sorted(root.rglob("grid2d"), key=lambda p: len(p.parts))), None)

    if img_dir is None:
        img_files = list(root.rglob("*.jpg")) + list(root.rglob("*.png"))
    else:
        img_files = list(img_dir.rglob("*.jpg")) + list(img_dir.rglob("*.png"))

    print(f"UVDoc: found {len(img_files)} image files")

    # Build index→grid-path map: filenames like "09_00000_1_0_0.mat" → index "00000"
    grid_by_index: dict[str, Path] = {}
    if grid_dir:
        for gf in grid_dir.iterdir():
            parts = gf.stem.split("_")
            for part in parts:
                if part.isdigit() and len(part) >= 5:
                    grid_by_index[part] = gf

    for img_path in tqdm(img_files, desc="uvdoc"):
        stem = img_path.stem  # e.g. "00000"

        # Find corresponding grid annotation
        grid_data = None
        if grid_dir:
            gf = (grid_dir / (stem + ".mat") if (grid_dir / (stem + ".mat")).exists()
                  else grid_by_index.get(stem))

            if gf and gf.exists():
                ext = gf.suffix
                if ext == ".json":
                    grid_data = json.loads(gf.read_text())
                elif ext == ".npy":
                    grid_data = np.load(str(gf))
                elif ext == ".mat":
                    try:
                        import h5py
                        with h5py.File(str(gf), "r") as hf:
                            for key in ("grid2d", "grid", "corners", "pts"):
                                if key in hf:
                                    arr = np.array(hf[key])
                                    # HDF5 .mat stores as (2, H, W) — transpose to (H, W, 2)
                                    if arr.ndim == 3 and arr.shape[0] == 2:
                                        arr = arr.transpose(1, 2, 0)
                                    grid_data = arr
                                    break
                    except Exception:
                        mat = scipy.io.loadmat(str(gf))
                        for key in ("grid2d", "grid", "corners", "pts"):
                            if key in mat:
                                grid_data = mat[key]
                                break

        if grid_data is None:
            # Try same-directory metadata JSON
            meta = img_path.with_suffix(".json")
            if meta.exists():
                d = json.loads(meta.read_text())
                grid_data = d.get("grid2d") or d.get("corners")

        if grid_data is None:
            continue

        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]

        # Extract 4 extreme corners from the grid
        arr = np.array(grid_data, dtype=float)
        if arr.ndim == 3 and arr.shape[2] == 2:
            # (rows, cols, 2) -> take the 4 corner elements
            tl = arr[0,  0]
            tr = arr[0,  -1]
            br = arr[-1, -1]
            bl = arr[-1, 0]
            pts = [tuple(tl), tuple(tr), tuple(br), tuple(bl)]
        elif arr.ndim == 2 and arr.shape[0] == 4:
            # Already 4-point format
            pts = [tuple(arr[i]) for i in range(4)]
        else:
            continue

        corners = _order_corners(pts)
        corners = _clamp_corners(corners, w, h)

        records.append({
            "file":    str(img_path),
            "width":   w,
            "height":  h,
            "source":  "uvdoc",
            # One independent warped image per record -> its own group.
            "group":   f"uvdoc/{img_path.stem}",
            "corners": corners,
        })

    print(f"  -> {len(records)} images")
    return records


# ── Roboflow ───────────────────────────────────────────────────────────────────

def _parse_yolo_line(line: str, w: int, h: int) -> dict | None:
    """
    Parse one YOLO label line into pixel-space corners.

    The Roboflow document-detector export uses YOLOv8 *pose* format
    (data.yaml: kpt_shape: [4, 3]). Each line is:

        class  cx cy bw bh  kx1 ky1 v1  kx2 ky2 v2  kx3 ky3 v3  kx4 ky4 v4

    i.e. a class id, the bounding-box (center/size, which we ignore), then four
    keypoints each as (x, y, visibility). All coords are normalized to [0, 1].
    Visibility: 0 = unlabeled, 1 = labeled-occluded, 2 = labeled-visible.

    We detect the layout by field count so the same function also handles a few
    related YOLO variants:
      * 17 fields -> pose [4, 3]  (keypoints with visibility)  ← Roboflow here
      * 13 fields -> pose [4, 2]  (keypoints without visibility)
      *  9 fields -> polygon      (class + 4 xy pairs)
      *  6 fields -> OBB          (class cx cy bw bh angle, angle in radians)
    """
    parts = line.strip().split()
    n = len(parts)

    try:
        if n == 17:  # pose [4, 3]: 4 keypoints with a visibility flag each
            kpts = parts[5:]
            triples = [kpts[i:i + 3] for i in range(0, 12, 3)]
            if any(float(v) <= 0 for *_xy, v in triples):
                return None  # at least one corner unlabeled -> can't form a quad
            pts = [(float(x) * w, float(y) * h) for x, y, _v in triples]
            return _order_corners(pts)

        if n == 13:  # pose [4, 2]: 4 keypoints, no visibility flag
            coords = [float(p) for p in parts[5:13]]
            pts = [(coords[i] * w, coords[i + 1] * h) for i in range(0, 8, 2)]
            return _order_corners(pts)

        if n == 9:   # polygon: class + 4 xy pairs
            coords = [float(p) for p in parts[1:9]]
            pts = [(coords[i] * w, coords[i + 1] * h) for i in range(0, 8, 2)]
            return _order_corners(pts)

        if n == 6:   # OBB: class cx cy bw bh angle (radians)
            cx, cy, bw, bh, angle = (float(p) for p in parts[1:6])
            cx, cy, bw, bh = cx * w, cy * h, bw * w, bh * h
            ca, sa = math.cos(angle), math.sin(angle)
            half = [(-bw / 2, -bh / 2), (bw / 2, -bh / 2),
                    (bw / 2, bh / 2), (-bw / 2, bh / 2)]
            pts = [(cx + dx * ca - dy * sa, cy + dx * sa + dy * ca)
                   for dx, dy in half]
            return _order_corners(pts)
    except (ValueError, IndexError):
        return None

    return None


# ── WarpDoc ────────────────────────────────────────────────────────────────────

def _parse_warpdoc() -> list[dict]:
    """
    WarpDoc (CVPR 2022): 1,020 camera images of deformed documents.

    Actual layout after unzip:
      data/raw/warpdoc/WarpDoc/
        image/<distortion>/####.jpg          -- warped camera photos
        digital/<distortion>/####.jpg        -- flat digital references
        digital_margin/<distortion>/####.jpg -- flat with visible page margin

    WarpDoc is a document DEWARPING dataset, not a detection dataset. The archive
    contains no corner annotations — the GT is the flat reference image, not
    corner coordinates. In every distortion category (curved, fold, perspective,
    rotate, random, incomplete) the document lies inside the frame with visible
    background, so a full-frame fallback would be badly wrong. This dataset is
    therefore skipped for corner regression training.
    """
    root = RAW_DIR / "warpdoc"
    if root.exists():
        print("[skip] WarpDoc -- no corner annotations in archive (dewarping dataset)")
    else:
        print("[skip] WarpDoc not found -- run 01_download.py first")
    return []


def _parse_roboflow() -> list[dict]:
    """
    Roboflow export: images/ + labels/ in YOLO pose format.
    data.yaml declares kpt_shape [4, 3] -- 4 document-corner keypoints, each
    (x, y, visibility). See _parse_yolo_line for the per-line format handling.
    """
    records = []
    root = RAW_DIR / "roboflow"
    if not root.exists():
        print("[skip] Roboflow dataset not found -- run 01_download.py first")
        return records

    # Roboflow ZIPs typically have train/valid/test splits
    img_dirs   = list(root.rglob("images"))
    label_dirs = list(root.rglob("labels"))

    print(f"Roboflow: found {len(img_dirs)} image dirs, {len(label_dirs)} label dirs")

    for img_dir in img_dirs:
        label_dir = img_dir.parent / "labels"
        if not label_dir.exists():
            # Try sibling labels dir
            label_dir = img_dir.parent.parent / "labels" / img_dir.parent.name
        if not label_dir.exists():
            continue

        # Roboflow exports split into train/valid/test -- preserve the upstream
        # split so the held-out test images can serve as a real-world val set.
        split_name = img_dir.parent.name.lower()
        rf_split = ("test"  if "test"  in split_name else
                    "valid" if "valid" in split_name or "val" in split_name else
                    "train")

        for img_path in sorted(img_dir.iterdir()):
            if img_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            label_file = label_dir / (img_path.stem + ".txt")
            if not label_file.exists():
                continue

            img = cv2.imread(str(img_path))
            if img is None:
                continue
            h, w = img.shape[:2]

            for line in label_file.read_text().splitlines():
                if not line.strip():
                    continue
                corners = _parse_yolo_line(line, w, h)
                if corners:
                    corners = _clamp_corners(corners, w, h)
                    records.append({
                        "file":     str(img_path),
                        "width":    w,
                        "height":   h,
                        "source":   "roboflow",
                        "group":    f"roboflow/{img_path.stem}",
                        "rf_split": rf_split,
                        "corners":  corners,
                    })
                    break  # one document per image

    print(f"  -> {len(records)} images")
    return records


# ── DocCornerDataset ───────────────────────────────────────────────────────────

def _parse_doccornerdataset() -> list[dict]:
    """mapo80/DocCornerDataset: normalized corners from annotations.json.

    All images are 640×640. Preserves the pre-defined train/val/test splits via
    the `dcd_split` field so main() can hold out the test set separately.
    """
    root = RAW_DIR / "doccornerdataset"
    ann_path = root / "annotations.json"
    if not ann_path.exists():
        print("[skip] DocCornerDataset not found -- run 01_download.py first")
        return []

    W = H = 640  # all images are 640×640 (verified)
    data = json.loads(ann_path.read_text())
    records = []
    for split, entries in data.items():
        for e in entries:
            c = e["corners_norm"]
            corners = {
                "topLeft":     {"x": c["tl_x"] * W, "y": c["tl_y"] * H},
                "topRight":    {"x": c["tr_x"] * W, "y": c["tr_y"] * H},
                "bottomRight": {"x": c["br_x"] * W, "y": c["br_y"] * H},
                "bottomLeft":  {"x": c["bl_x"] * W, "y": c["bl_y"] * H},
            }
            records.append({
                "file":      e["file"],
                "width":     W,
                "height":    H,
                "source":    "doccornerdataset",
                "group":     e["file"],  # each image is independent
                "dcd_split": split,
                "corners":   _clamp_corners(corners, W, H),
            })
    return records


# ── split + write ──────────────────────────────────────────────────────────────

def _filter_degenerate(records: list[dict], min_area_ratio: float) -> list[dict]:
    kept = []
    for r in records:
        area = _quad_area(list(r["corners"].values()))
        if area / (r["width"] * r["height"]) >= min_area_ratio:
            kept.append(r)
    return kept


def _grouped_split(records: list[dict], val_fraction: float, seed: int = 42
                   ) -> tuple[list, list]:
    """
    Stratified, group-aware train/val split.

    Frames that share a `group` (e.g. all frames of one MIDV clip or SmartDoc
    video) are kept on the same side of the split so the val metric measures
    generalization to *unseen* documents rather than memorized neighbours.
    The split is stratified per source so val mirrors the training mix instead
    of being dominated by whichever source happens to have small groups.
    """
    from collections import defaultdict

    by_source: dict[str, list] = defaultdict(list)
    for r in records:
        by_source[r["source"]].append(r)

    train, val = [], []
    for source, recs in sorted(by_source.items()):
        groups: dict[str, list] = defaultdict(list)
        for r in recs:
            groups[r.get("group", r["file"])].append(r)

        keys = sorted(groups.keys())
        random.Random((seed, source).__hash__() & 0xFFFFFFFF).shuffle(keys)

        n_target = int(len(recs) * val_fraction)
        n_val = 0
        for k in keys:
            # Fill val with whole groups until we reach the per-source target;
            # everything after goes to train. Overshooting by one group is fine.
            if n_val < n_target:
                val.extend(groups[k])
                n_val += len(groups[k])
            else:
                train.extend(groups[k])
    return train, val


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--val-split",  type=float, default=0.15)
    parser.add_argument("--min-area",   type=float, default=DEFAULT_MIN_AREA_RATIO,
                        help="Minimum doc-area / image-area ratio to keep (default 0.03)")
    args = parser.parse_args()

    all_records: list[dict] = []

    parsers = [
        ("MIDV-500",          _parse_midv500),
        ("SmartDoc",          _parse_smartdoc),
        ("UVDoc",             _parse_uvdoc),
        ("WarpDoc",           _parse_warpdoc),
        ("Roboflow",          _parse_roboflow),
        ("DocCornerDataset",  _parse_doccornerdataset),
    ]

    for name, fn in parsers:
        try:
            recs = fn()
            print(f"  {name}: {len(recs)} records parsed")
            all_records.extend(recs)
        except Exception as exc:
            print(f"  [WARN] {name} parser failed: {exc}")

    print(f"\nTotal before filtering: {len(all_records)}")
    all_records = _filter_degenerate(all_records, args.min_area)
    print(f"After area filter ({args.min_area:.0%}): {len(all_records)}")

    # Hold out Roboflow test + DocCornerDataset test as real-world metrics.
    rf_test  = [r for r in all_records if r.get("rf_split")  == "test"]
    dcd_test = [r for r in all_records if r.get("dcd_split") == "test"]
    pool     = [r for r in all_records
                if r.get("rf_split") != "test" and r.get("dcd_split") != "test"]

    train, val = _grouped_split(pool, args.val_split)
    print(f"Split -> train: {len(train)}  val: {len(val)}  "
          f"roboflow_test: {len(rf_test)}  dcd_test: {len(dcd_test)}")

    (NORM_DIR / "train.json"        ).write_text(json.dumps({"images": train   }, indent=2))
    (NORM_DIR / "val.json"          ).write_text(json.dumps({"images": val     }, indent=2))
    (NORM_DIR / "roboflow_test.json").write_text(json.dumps({"images": rf_test  }, indent=2))
    (NORM_DIR / "dcd_test.json"     ).write_text(json.dumps({"images": dcd_test }, indent=2))

    # Leakage check: no group may appear on both sides of the split.
    train_groups = {r.get("group", r["file"]) for r in train}
    val_groups   = {r.get("group", r["file"]) for r in val}
    leaked = train_groups & val_groups
    if leaked:
        print(f"\n[WARN] {len(leaked)} groups leaked across train/val: "
              f"{sorted(leaked)[:5]}")
    else:
        print("\nok No group leakage between train and val.")

    # Per-source train/val/test breakdown
    from collections import Counter
    tr_c, va_c, te_c = (Counter(r["source"] for r in s)
                        for s in (train, val, rf_test))
    print("\nBy source        train    val   test")
    for src in sorted(set(tr_c) | set(va_c) | set(te_c)):
        print(f"  {src:<12} {tr_c[src]:>6} {va_c[src]:>6} {te_c[src]:>6}")

    print(f"\nok Wrote {NORM_DIR}/train.json + val.json + roboflow_test.json")
    print("  Run  python 03_benchmark.py  next.")


if __name__ == "__main__":
    main()
