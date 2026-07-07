"""
07_quantize_simcc.py: INT8-quantize the existing DocCornerNet (SimCC) ONNX.

ORT static quantisation (QDQ, per-channel, calibrated on val images), the same
lossless path used for the regression model. Input is NHWC [1,224,224,3].

    python 07_quantize_simcc.py
-> scripts/ml-spike/model/doccornernet_int8.onnx
"""
import json
from pathlib import Path
import cv2, numpy as np
import onnxruntime as ort
ort.set_default_logger_severity(3)
from onnxruntime.quantization import (
    CalibrationDataReader, quantize_static, QuantType, QuantFormat,
)
from onnxruntime.quantization.shape_inference import quant_pre_process

REPO = Path(__file__).resolve().parent.parent
SRC  = REPO / "scripts/ml-spike/model/doccornernet.onnx"
PREP = REPO / "scripts/ml-spike/model/doccornernet_prep.onnx"
DST  = REPO / "scripts/ml-spike/model/doccornernet_int8.onnx"
NORM = Path(__file__).parent / "data" / "normalized"

SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD  = np.array([0.229, 0.224, 0.225], np.float32)


def preprocess_nhwc(path):
    bgr = cv2.imread(path)
    rgb = cv2.cvtColor(cv2.resize(bgr, (SIZE, SIZE), interpolation=cv2.INTER_AREA),
                       cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return ((rgb - MEAN) / STD)[None]  # [1,224,224,3]


class Reader(CalibrationDataReader):
    def __init__(self, files, input_name):
        self.data = iter([{input_name: preprocess_nhwc(f)} for f in files])
    def get_next(self):
        return next(self.data, None)


def main():
    val = json.loads((NORM / "val.json").read_text())["images"]
    files = [r["file"] for r in val[:300]]
    print(f"calibrating on {len(files)} val images")

    quant_pre_process(str(SRC), str(PREP), skip_symbolic_shape=False)
    input_name = ort.InferenceSession(str(PREP), providers=["CPUExecutionProvider"]) \
                    .get_inputs()[0].name

    quantize_static(str(PREP), str(DST), Reader(files, input_name),
                    quant_format=QuantFormat.QDQ,
                    activation_type=QuantType.QInt8,
                    weight_type=QuantType.QInt8,
                    per_channel=True)
    PREP.unlink(missing_ok=True)
    print(f"float32: {SRC.stat().st_size/1e6:.2f} MB  ->  INT8: {DST.stat().st_size/1e6:.2f} MB")
    print(f"wrote {DST}")


if __name__ == "__main__":
    main()
