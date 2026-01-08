FROM rust:1.83

# Install dependencies for wasm-pack
RUN apt-get update && apt-get install -y curl pkg-config libssl-dev

# Install wasm-pack using the binary installer (much faster and avoids compilation issues)
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /code

CMD ["bash"]
