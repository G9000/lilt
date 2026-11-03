#!/usr/bin/env bash
# Build Lilt.app and Lilt.dmg for this Mac (Apple silicon or Intel, whichever this is).
# Needs what ./lilt.sh needs (Rust, Node + pnpm, uv); people who install the .dmg need none of it.
# Output: desktop/dist/Lilt.app and desktop/dist/Lilt-<version>-<arch>.dmg
set -euo pipefail
cd "$(dirname "$0")"
DESKTOP=$PWD
ROOT=$(cd .. && pwd)
TAURI_CLI="@tauri-apps/cli@2.12.4"
PY_VERSION=$(cat "$ROOT/analysis/.python-version")
VERSION=$(sed -n 's/^version = "\(.*\)"/\1/p' Cargo.toml | head -1)
ARCH=$(uname -m)

# Building needs Apple's compiler; the Command Line Tools work even if Xcode's licence was never accepted.
if [ -z "${DEVELOPER_DIR:-}" ] && ! cc --version >/dev/null 2>&1 && [ -d /Library/Developer/CommandLineTools ]; then
  export DEVELOPER_DIR=/Library/Developer/CommandLineTools
fi

echo "==> Web app"
(cd "$ROOT/web" && pnpm install --frozen-lockfile && pnpm build)
echo "==> Server"
(cd "$ROOT/server" && cargo build --release)

echo "==> Runtime: server, web app, courses, Python and the measuring helper"
RT="$DESKTOP/runtime"
rm -rf "$RT" && mkdir -p "$RT"
cp "$ROOT/server/target/release/lilt" "$RT/lilt"
cp -R "$ROOT/web/dist" "$RT/web"
cp -R "$ROOT/content" "$RT/content"
# A standalone Python (relocatable, from python-build-standalone via uv), trimmed of what Lilt never uses.
uv python install -q "$PY_VERSION"
PY_HOME=$(dirname "$(dirname "$(uv python find "$PY_VERSION")")")
cp -R "$PY_HOME" "$RT/python"
PYLIB="$RT/python/lib/python$PY_VERSION"
rm -rf "$RT/python/include" "$RT/python/share" "$PYLIB"/{test,idlelib,tkinter,turtledemo,ensurepip,lib2to3} \
  "$PYLIB"/lib-dynload/_tkinter* "$RT/python/lib"/{tcl*,tk*,itcl*,thread*,libtcl*,libtk*} "$PYLIB/site-packages"/pip*
find "$RT/python/bin" -mindepth 1 ! -name "python3*" -delete
# The helper and its libraries in one folder, which the server puts on PYTHONPATH.
(cd "$ROOT/analysis" && uv export --frozen --no-dev --no-hashes --no-emit-project -q) > "$DESKTOP/target/requirements.txt"
uv pip install -q --python "$RT/python/bin/python3" --target "$RT/analysis" -r "$DESKTOP/target/requirements.txt"
cp -R "$ROOT/analysis/lilt_analysis" "$RT/analysis/"
find "$RT" -name __pycache__ -type d -prune -exec rm -rf {} +
rm -rf "$RT/analysis/numpy/"{tests,*/tests} "$RT/analysis/bin"
# Check the helper actually runs from here before shipping it.
PYTHONPATH="$RT/analysis" PYTHONDONTWRITEBYTECODE=1 "$RT/python/bin/python3" -c "import lilt_analysis, parselmouth, av, numpy" \
  || { echo "The bundled measuring helper doesn't import; not building." >&2; exit 1; }

echo "==> Lilt.app"
npx -y "$TAURI_CLI" build --bundles app
APP="$DESKTOP/target/release/bundle/macos/Lilt.app"
# Tauri's resource copier doesn't keep Python's symlinks, so the runtime goes in with ditto.
ditto "$RT" "$APP/Contents/Resources/runtime"
# Signed ad hoc (no Apple Developer ID): it runs, but the first open needs Privacy & Security → Open Anyway.
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"

echo "==> Lilt.dmg"
OUT="$DESKTOP/dist"
rm -rf "$OUT" && mkdir -p "$OUT"
ditto "$APP" "$OUT/Lilt.app"
STAGE=$(mktemp -d)
ditto "$APP" "$STAGE/Lilt.app"
ln -s /Applications "$STAGE/Applications"
DMG="$OUT/Lilt-$VERSION-$ARCH.dmg"
hdiutil create -quiet -volname "Lilt" -srcfolder "$STAGE" -fs HFS+ -format UDZO -ov "$DMG"
rm -rf "$STAGE"
du -sh "$OUT/Lilt.app" "$DMG"
echo "Done: $DMG"
