#!/usr/bin/env bash
# Build (first run) and start Lilt natively on http://127.0.0.1:7878
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x analysis/.venv/bin/python ]; then (cd analysis && uv sync --no-dev); fi
if [ ! -f web/dist/index.html ]; then
  bun install --frozen-lockfile
  bun run build
fi
if [ ! -x server/target/release/lilt ] || [ -n "$(find server/src -newer server/target/release/lilt 2>/dev/null | head -1)" ]; then
  # Building needs Apple's compiler. If Xcode is installed but its licence was never accepted, the
  # compiler refuses to run; the Command Line Tools work without it (and without a password).
  if [ "$(uname)" = Darwin ] && [ -z "${DEVELOPER_DIR:-}" ] && ! cc --version >/dev/null 2>&1 \
    && [ -d /Library/Developer/CommandLineTools ]; then
    export DEVELOPER_DIR=/Library/Developer/CommandLineTools
  fi
  (cd server && cargo build --release)
fi
export LILT_DATA_DIR="${LILT_DATA_DIR:-$HOME/Lilt/data}"
echo "Lilt data: $LILT_DATA_DIR"
echo "Open http://127.0.0.1:7878"
exec server/target/release/lilt serve
