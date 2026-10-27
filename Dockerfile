# syntax=docker/dockerfile:1
# Lilt: Rust server + React UI + Python/Praat analysis helper in one image.

FROM node:22-bookworm-slim AS web
WORKDIR /src/web
RUN corepack enable
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm build

FROM rust:1.94-bookworm AS server
WORKDIR /src/server
COPY server/Cargo.toml server/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY server/src ./src
RUN touch src/main.rs && cargo build --release

# Parselmouth has no Linux ARM wheels, so this stage can compile it (cached afterwards).
FROM python:3.12-slim-bookworm AS pyenv
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.6.16 /uv /usr/local/bin/uv
WORKDIR /app/analysis
COPY analysis/pyproject.toml analysis/uv.lock analysis/.python-version ./
RUN UV_PROJECT_ENVIRONMENT=/opt/venv UV_PYTHON_DOWNLOADS=never uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY --from=pyenv /opt/venv /opt/venv
COPY analysis/lilt_analysis ./analysis/lilt_analysis
COPY content ./content
COPY --from=web /src/web/dist ./web
COPY --from=server /src/server/target/release/lilt /usr/local/bin/lilt
RUN useradd --uid 1000 --create-home lilt && mkdir -p /data && chown lilt /data
USER lilt
ENV LILT_DATA_DIR=/data \
    LILT_BIND=0.0.0.0:7878 \
    LILT_PYTHON=/opt/venv/bin/python \
    LILT_ANALYSIS_DIR=/app/analysis \
    LILT_CONTENT_DIR=/app/content \
    LILT_WEB_DIR=/app/web
EXPOSE 7878
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["/opt/venv/bin/python", "-c", "import urllib.request,sys,json; sys.exit(0 if json.load(urllib.request.urlopen('http://127.0.0.1:7878/healthz'))['ok'] else 1)"]
CMD ["lilt", "serve"]
