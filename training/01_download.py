"""
Step 1 -- Download datasets + model weights.

Datasets fetched:
  • MIDV-500        ftp://smartengines.com/midv-500/   (15 K frames, JSON quad corners)
  • SmartDoc 2015   https://zenodo.org/records/1230218 (XML quad corners, CC-BY-4.0)
  • UVDoc           https://datasets.iai.uni-bonn.de/uvdoc/ (grid2d coords, MIT)
  • WarpDoc         https://sg-vilab.github.io/event/warpdoc/ (1020 imgs, Google Drive)
  • Roboflow DS     https://app.roboflow.com/ds/36EORXAglU?key=IY7GpshBBM

Model weights:
  • mapo80/DocCornerNet-CoordClass-V2 Keras SavedModel (HuggingFace)

Usage:
    python 01_download.py [--datasets all|midv500|smartdoc|uvdoc|warpdoc|roboflow]
                          [--model] [--midv-clips N]

All data lands in  training/data/raw/<dataset-name>/
Model lands in     training/models/base/
"""

import argparse
import ftplib
import json
import os
import tarfile
import zipfile
from pathlib import Path

import requests
from tqdm import tqdm

# ── paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
RAW_DIR    = SCRIPT_DIR / "data" / "raw"
MODELS_DIR = SCRIPT_DIR / "models" / "base"

RAW_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)


# ── helpers ────────────────────────────────────────────────────────────────────

def _progress_bar(desc: str, total: int | None):
    return tqdm(total=total, unit="B", unit_scale=True, unit_divisor=1024, desc=desc)


def _download_http(url: str, dest: Path, desc: str | None = None) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        print(f"  [skip] {dest.name} already downloaded")
        return dest
    desc = desc or dest.name
    resp = requests.get(url, stream=True, timeout=120)
    resp.raise_for_status()
    total = int(resp.headers.get("content-length", 0)) or None
    with _progress_bar(desc, total) as bar, open(dest, "wb") as f:
        for chunk in resp.iter_content(65536):
            f.write(chunk)
            bar.update(len(chunk))
    return dest


def _extract(archive: Path, dest: Path):
    dest.mkdir(parents=True, exist_ok=True)
    name = archive.name.lower()
    print(f"  Extracting {archive.name} -> {dest} ...")
    if name.endswith(".tar.gz") or name.endswith(".tgz"):
        with tarfile.open(archive, "r:gz") as tf:
            tf.extractall(dest)
    elif name.endswith(".tar"):
        with tarfile.open(archive, "r:") as tf:
            tf.extractall(dest)
    elif name.endswith(".zip"):
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(dest)
    else:
        raise ValueError(f"Unknown archive format: {archive.name}")
    print("  Done.")


# ── MIDV-500 ───────────────────────────────────────────────────────────────────

MIDV500_FTP_HOST = "smartengines.com"
MIDV500_FTP_BASE = "/midv-500/dataset/"  # 50 ZIPs, one per document type


def download_midv500(n_zips: int = 10):
    """Download up to n_zips document-type ZIPs from MIDV-500 via FTP.

    The dataset is stored as 50 ZIPs at ftp://smartengines.com/midv-500/dataset/
    (one per document type, e.g. 01_alb_id.zip). Each ZIP contains ~30 video
    clips with JPEG frames and gt/result.json corner annotations.

    10 ZIPs gives ~3,000 annotated frames (default). Use --midv-clips 50 for all.
    """
    dest = RAW_DIR / "midv500"
    if (dest / ".done").exists():
        print("[skip] MIDV-500 already downloaded")
        return

    print(f"\n=== MIDV-500 (first {n_zips} document-type ZIPs via FTP) ===")
    dest.mkdir(parents=True, exist_ok=True)

    try:
        ftp = ftplib.FTP(MIDV500_FTP_HOST, timeout=60)
        ftp.login()
        ftp.cwd(MIDV500_FTP_BASE)

        all_zips = sorted(z for z in ftp.nlst() if z.endswith(".zip"))
        to_download = all_zips[:n_zips]
        print(f"  Available: {len(all_zips)} ZIPs  |  Downloading: {len(to_download)}")

        for i, zip_name in enumerate(to_download, 1):
            zip_path = dest / zip_name
            doc_dir  = dest / zip_name.replace(".zip", "")

            if doc_dir.exists():
                print(f"  [{i}/{len(to_download)}] {zip_name} (already extracted)")
                continue

            print(f"  [{i}/{len(to_download)}] Downloading {zip_name} ...")
            with open(zip_path, "wb") as f:
                ftp.retrbinary(f"RETR {zip_name}", f.write)
            print(f"    {zip_path.stat().st_size // 1024} KB -> extracting ...")
            _extract(zip_path, doc_dir)
            # Windows antivirus/indexer may briefly lock the file after write;
            # retry the delete a few times before giving up.
            for _attempt in range(5):
                try:
                    zip_path.unlink(missing_ok=True)
                    break
                except PermissionError:
                    import time as _time; _time.sleep(1)

        ftp.quit()
        (dest / ".done").write_text(str(len(to_download)))
        print(f"MIDV-500: {len(to_download)} doc types -> {dest}")

    except Exception as exc:
        print(f"  [WARN] MIDV-500 FTP failed: {exc}")
        print("  Manual: wget -r --no-parent ftp://smartengines.com/midv-500/dataset/ -P data/raw/midv500/")
        helper = dest / "manual_download.sh"
        helper.write_text(
            "#!/bin/bash\n"
            "wget -r --no-parent ftp://smartengines.com/midv-500/dataset/ -P data/raw/midv500/\n"
        )
        print(f"  Helper written: {helper}")


# ── SmartDoc 2015 ──────────────────────────────────────────────────────────────

SMARTDOC_SAMPLE_URL = "https://zenodo.org/records/1230218/files/sampleDataset.tar.gz"
SMARTDOC_TEST_URL   = "https://zenodo.org/records/1230218/files/testDataset.tar.gz"


def download_smartdoc(full: bool = False):
    """Download SmartDoc 2015 Challenge-1 from Zenodo (CC-BY-4.0).

    By default downloads the sample set (~21 MB) which is enough for
    benchmarking. Pass full=True to also grab the 1.5 GB test set.
    """
    dest = RAW_DIR / "smartdoc15"
    if (dest / ".done").exists():
        print("[skip] SmartDoc 2015 already downloaded")
        return

    print("\n=== SmartDoc 2015 (Zenodo, CC-BY-4.0) ===")
    dest.mkdir(parents=True, exist_ok=True)

    archives = [(SMARTDOC_SAMPLE_URL, dest / "sampleDataset.tar.gz")]
    if full:
        archives.append((SMARTDOC_TEST_URL, dest / "testDataset.tar.gz"))

    for url, archive_path in archives:
        _download_http(url, archive_path, archive_path.name)
        _extract(archive_path, dest)
        archive_path.unlink(missing_ok=True)

    (dest / ".done").write_text("ok")
    print(f"SmartDoc 2015 -> {dest}")


# ── UVDoc ──────────────────────────────────────────────────────────────────────

# UVDoc benchmark split is small (~300 MB) and MIT licensed.
# The full dataset (UVDoc_final.zip) is several GB; we use the benchmark split.
UVDOC_BENCHMARK_URL = (
    "https://igl.ethz.ch/projects/uvdoc/UVDoc_benchmark.zip"
)


def download_uvdoc():
    """Download UVDoc benchmark split (MIT license).

    Contains warped document images + grid2d/grid3d corner coordinates.
    The 4 extreme corners of grid2d give us the document quad corners.
    """
    dest = RAW_DIR / "uvdoc"
    if (dest / ".done").exists():
        print("[skip] UVDoc already downloaded")
        return

    print("\n=== UVDoc Benchmark (MIT) ===")
    dest.mkdir(parents=True, exist_ok=True)

    archive = dest / "UVDoc_benchmark.zip"
    _download_http(UVDOC_BENCHMARK_URL, archive, "UVDoc_benchmark.zip")
    _extract(archive, dest)
    archive.unlink(missing_ok=True)

    (dest / ".done").write_text("ok")
    print(f"UVDoc -> {dest}")


# ── Roboflow ───────────────────────────────────────────────────────────────────

ROBOFLOW_DS_ID  = "36EORXAglU"
ROBOFLOW_API_KEY = "IY7GpshBBM"

# The /ds/ export URL directly returns a ZIP with images + YOLO annotations.
ROBOFLOW_EXPORT_URL = (
    f"https://app.roboflow.com/ds/{ROBOFLOW_DS_ID}?key={ROBOFLOW_API_KEY}"
)


def download_roboflow():
    """Download the Roboflow dataset via the export link.

    The response is a redirect to a signed GCS URL for a ZIP containing
    images + annotation files (YOLO OBB or keypoint format).
    """
    dest = RAW_DIR / "roboflow"
    if (dest / ".done").exists():
        print("[skip] Roboflow dataset already downloaded")
        return

    print("\n=== Roboflow Dataset ===")
    dest.mkdir(parents=True, exist_ok=True)

    archive = dest / "roboflow_dataset.zip"

    # The export URL may redirect -- requests follows redirects automatically.
    print(f"  Fetching export URL: {ROBOFLOW_EXPORT_URL}")
    resp = requests.get(ROBOFLOW_EXPORT_URL, stream=True, timeout=120, allow_redirects=True)

    if resp.status_code != 200:
        print(f"  [WARN] Roboflow download returned HTTP {resp.status_code}")
        print("  Trying roboflow Python package as fallback ...")
        _download_roboflow_package(dest)
        return

    content_type = resp.headers.get("content-type", "")
    if "json" in content_type:
        # The API returned a JSON with a download URL
        payload = resp.json()
        dl_url = payload.get("export", {}).get("link") or payload.get("url")
        if dl_url:
            _download_http(dl_url, archive, "roboflow_dataset.zip")
        else:
            print(f"  [WARN] Unexpected JSON response: {list(payload.keys())}")
            print("  Trying roboflow Python package ...")
            _download_roboflow_package(dest)
            return
    else:
        total = int(resp.headers.get("content-length", 0)) or None
        with _progress_bar("roboflow_dataset.zip", total) as bar, open(archive, "wb") as f:
            for chunk in resp.iter_content(65536):
                f.write(chunk)
                bar.update(len(chunk))

    _extract(archive, dest)
    if archive.exists():
        archive.unlink()

    (dest / ".done").write_text("ok")
    print(f"Roboflow -> {dest}")


# ── WarpDoc ────────────────────────────────────────────────────────────────────

WARPDOC_GDRIVE_ID = "1UHzgERrRR6E08bpL1AyCzD01bFczlAVP"


def download_warpdoc():
    """Download WarpDoc from Google Drive using gdown (pip install gdown).

    WarpDoc contains 1,020 camera images of deformed documents (scientific
    papers, magazines, envelopes). Annotations are the flat/rectified reference
    images; we extract quad corners from the document boundary in 02_normalize.py.
    Dataset from CVPR 2022: 'Fourier Document Restoration for Robust Document
    Dewarping and Recognition'.
    """
    dest = RAW_DIR / "warpdoc"
    if (dest / ".done").exists():
        print("[skip] WarpDoc already downloaded")
        return

    print("\n=== WarpDoc (Google Drive, CVPR 2022) ===")
    dest.mkdir(parents=True, exist_ok=True)

    archive = dest / "warpdoc.zip"
    try:
        import gdown  # type: ignore
        url = f"https://drive.google.com/uc?id={WARPDOC_GDRIVE_ID}"
        gdown.download(url, str(archive), quiet=False)
    except ImportError:
        print("  gdown not installed. Trying requests with direct link ...")
        # Google Drive direct-download URL for files < 100 MB
        url = (
            f"https://drive.google.com/uc?export=download&id={WARPDOC_GDRIVE_ID}"
            "&confirm=t"
        )
        try:
            _download_http(url, archive, "warpdoc.zip")
        except Exception as exc:
            print(f"  [WARN] Automatic download failed: {exc}")
            print(
                "\n  Manual download:\n"
                f"  1. pip install gdown\n"
                f"  2. gdown https://drive.google.com/uc?id={WARPDOC_GDRIVE_ID} -O {archive}\n"
                f"     OR visit: https://drive.google.com/file/d/{WARPDOC_GDRIVE_ID}/view\n"
                f"  3. Save as {archive} and re-run this script.\n"
            )
            return

    if archive.exists() and archive.stat().st_size > 1024:
        _extract(archive, dest)
        archive.unlink(missing_ok=True)
        (dest / ".done").write_text("ok")
        print(f"WarpDoc -> {dest}")
    else:
        print("  [WARN] Downloaded file appears empty; check the Google Drive link.")


def _download_roboflow_package(dest: Path):
    """Fallback: use the roboflow Python package."""
    try:
        from roboflow import Roboflow  # type: ignore
        rf = Roboflow(api_key=ROBOFLOW_API_KEY)
        # The workspace/project names are embedded in the export URL; try
        # downloading directly via dataset export link format.
        dataset = rf.download_zip(
            f"https://app.roboflow.com/ds/{ROBOFLOW_DS_ID}?key={ROBOFLOW_API_KEY}",
            location=str(dest),
        )
        (dest / ".done").write_text("roboflow-pkg")
    except Exception as exc:
        print(f"  [WARN] roboflow package also failed: {exc}")
        print(
            f"\n  Manual download:\n"
            f"  curl -L '{ROBOFLOW_EXPORT_URL}' -o {dest}/dataset.zip\n"
            f"  unzip {dest}/dataset.zip -d {dest}/\n"
        )


# ── DocCornerDataset (HuggingFace) ────────────────────────────────────────────

HF_DOCCORNER_DATASET = "mapo80/DocCornerDataset"


def download_doccornerdataset():
    """Download mapo80/DocCornerDataset from HuggingFace.

    ~49 K annotated phone photos of documents with pre-defined train/val/test
    splits. Images are JPEG bytes embedded in Parquet shards; we extract them
    to disk one shard at a time (avoids double-storing ~5 GB) and write a
    single annotations.json for 02_normalize.py.

    Corners are stored normalised [0, 1]; 02_normalize.py converts them to
    pixel coords. Negative examples (is_negative=True) are skipped.
    """
    dest = RAW_DIR / "doccornerdataset"
    if (dest / ".done").exists():
        print("[skip] DocCornerDataset already downloaded")
        return

    print(f"\n=== DocCornerDataset ({HF_DOCCORNER_DATASET}) ===")
    dest.mkdir(parents=True, exist_ok=True)

    try:
        import pandas as pd
        from huggingface_hub import HfApi, hf_hub_download
    except ImportError as exc:
        print(f"  [WARN] Missing dependency: {exc}")
        print("  pip install huggingface_hub pandas pyarrow")
        return

    try:
        api = HfApi()
        info = api.dataset_info(HF_DOCCORNER_DATASET)
    except Exception as exc:
        print(f"  [WARN] Could not reach HuggingFace: {exc}")
        return

    parquet_files = sorted(
        f.rfilename for f in info.siblings
        if any(f.rfilename.startswith(s + "/") for s in ("train", "val", "test"))
        and f.rfilename.endswith(".parquet")
    )
    print(f"  {len(parquet_files)} shards ({sum(1 for f in parquet_files if f.startswith('train/'))} train / "
          f"{sum(1 for f in parquet_files if f.startswith('val/'))} val / "
          f"{sum(1 for f in parquet_files if f.startswith('test/'))} test)")

    cache_dir = dest / "_cache"
    annotations: dict[str, list] = {"train": [], "val": [], "test": []}

    try:
        for shard_name in tqdm(parquet_files, desc="  shards"):
            split = shard_name.split("/")[0]
            split_dir = dest / split
            split_dir.mkdir(exist_ok=True)

            local_shard = Path(hf_hub_download(
                repo_id=HF_DOCCORNER_DATASET,
                filename=shard_name,
                repo_type="dataset",
                local_dir=str(cache_dir),
            ))

            df = pd.read_parquet(local_shard)
            for _, row in df.iterrows():
                fname = row["filename"]
                out_path = split_dir / fname
                if not out_path.exists():
                    out_path.write_bytes(row["image"]["bytes"])
                if not bool(row["is_negative"]):
                    annotations[split].append({
                        "file": str(out_path),
                        "corners_norm": {
                            "tl_x": float(row["corner_tl_x"]),
                            "tl_y": float(row["corner_tl_y"]),
                            "tr_x": float(row["corner_tr_x"]),
                            "tr_y": float(row["corner_tr_y"]),
                            "br_x": float(row["corner_br_x"]),
                            "br_y": float(row["corner_br_y"]),
                            "bl_x": float(row["corner_bl_x"]),
                            "bl_y": float(row["corner_bl_y"]),
                        },
                    })

            local_shard.unlink(missing_ok=True)

    except Exception as exc:
        print(f"  [WARN] Download/extraction failed: {exc}")
        print("  Check HF login: huggingface-cli login")
        import shutil
        shutil.rmtree(cache_dir, ignore_errors=True)
        return

    import shutil
    shutil.rmtree(cache_dir, ignore_errors=True)

    ann_path = dest / "annotations.json"
    ann_path.write_text(json.dumps(annotations, indent=2))

    for split, records in annotations.items():
        print(f"  {split}: {len(records)} positive examples extracted")
    print(f"  Annotations -> {ann_path}")

    (dest / ".done").write_text("ok")
    print(f"DocCornerDataset -> {dest}")


# ── HuggingFace model weights ──────────────────────────────────────────────────

HF_REPO = "mapo80/DocCornerNet-CoordClass-V2"


def download_model():
    """Download DocCornerNet-CoordClass-V2 Keras SavedModel from HuggingFace."""
    if (MODELS_DIR / ".done").exists():
        print("[skip] Model already downloaded")
        return

    print(f"\n=== DocCornerNet V2 Keras model ({HF_REPO}) ===")
    try:
        from huggingface_hub import snapshot_download  # type: ignore
        local = snapshot_download(
            repo_id=HF_REPO,
            local_dir=str(MODELS_DIR),
            ignore_patterns=["*.msgpack", "*.h5.index", "flax_model*"],
        )
        (MODELS_DIR / ".done").write_text(local)
        print(f"Model -> {MODELS_DIR}")
    except Exception as exc:
        print(f"  [WARN] HuggingFace download failed: {exc}")
        print(f"  Manual: pip install huggingface_hub && huggingface-cli download {HF_REPO}")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Download datasets and model weights")
    parser.add_argument(
        "--datasets", default="all",
        help="Comma-separated list: all | midv500 | smartdoc | uvdoc | roboflow | doccornerdataset"
    )
    parser.add_argument("--model", action="store_true", default=True,
                        help="Download HuggingFace model weights (default: on)")
    parser.add_argument("--no-model", dest="model", action="store_false")
    parser.add_argument("--midv-clips", type=int, default=10,
                        help="Number of MIDV-500 document-type ZIPs to download (default: 10, max 50)")
    parser.add_argument("--smartdoc-full", action="store_true",
                        help="Download the full SmartDoc test set (1.5 GB)")
    args = parser.parse_args()

    selected = {s.strip() for s in args.datasets.split(",")}
    do_all = "all" in selected

    if do_all or "midv500"          in selected: download_midv500(args.midv_clips)
    if do_all or "smartdoc"        in selected: download_smartdoc(args.smartdoc_full)
    if do_all or "uvdoc"           in selected: download_uvdoc()
    if do_all or "warpdoc"         in selected: download_warpdoc()
    if do_all or "roboflow"        in selected: download_roboflow()
    if do_all or "doccornerdataset" in selected: download_doccornerdataset()
    if args.model:                               download_model()

    print("\nok All downloads complete. Run  python 02_normalize.py  next.")


if __name__ == "__main__":
    main()
