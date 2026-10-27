#!/usr/bin/env bash
# Build (first run) and start Lilt natively on http://127.0.0.1:7878
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x analysis/.venv/bin/python ]; then (cd analysis && uv sync --no-dev); fi
if [ ! -f web/dist/index.html ]; then (cd web && pnpm install --frozen-lockfile && pnpm build); fi
if [ ! -x server/target/release/lilt ] || [ -n "$(find server/src -newer server/target/release/lilt 2>/dev/null | head -1)" ]; then
  (cd server && cargo build --release)
fi
export LILT_DATA_DIR="${LILT_DATA_DIR:-$HOME/Lilt/data}"
echo "Lilt data: $LILT_DATA_DIR"
echo "Open http://127.0.0.1:7878"
exec server/target/release/lilt serve
