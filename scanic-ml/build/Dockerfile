# Reproducible build environment for the minimal ONNX Runtime Web wasm that
# powers scanic's optional ML detector. ORT's build script downloads and manages
# its own emscripten SDK, so we only need Python, a recent CMake, git and a C/C++
# toolchain here.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      git build-essential ninja-build ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# ORT v1.23.2 requires CMake >= 3.28; the pip wheel ships a recent binary.
# A dedicated venv keeps the build interpreter free of a host's (possibly broken)
# global packages — notably torch, which ORT's tools import opportunistically.
RUN python -m venv /opt/ortbuild && \
    /opt/ortbuild/bin/pip install --no-cache-dir "cmake>=3.28" onnxruntime onnx flatbuffers packaging numpy

ENV PATH="/opt/ortbuild/bin:${PATH}"
ENV PYTHONNOUSERSITE=1

WORKDIR /work
CMD ["bash", "build/build.sh"]
