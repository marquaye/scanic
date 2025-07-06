FROM rust:1.83

# Install dependencies for wasm-pack
RUN apt-get update && apt-get install -y pkg-config libssl-dev

# Install wasm-pack
RUN cargo install wasm-pack

WORKDIR /code

CMD ["bash"]
