#!/usr/bin/env bash
# Build what's missing or out of date, then start Lilt natively on http://127.0.0.1:7878
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x analysis/.venv/bin/python ]; then (cd analysis && uv sync --no-dev); fi
# The web app is rebuilt when it's missing or anything it's made from is newer than the last build,
# so a pull or an edit never leaves you looking at old pages.
web_sources="web/src web/public web/index.html web/package.json web/vite.config.ts web/tsconfig.json bun.lock"
if [ ! -f web/dist/index.html ] || [ -n "$(find $web_sources -newer web/dist/index.html 2>/dev/null | head -1)" ]; then
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
