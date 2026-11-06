#!/usr/bin/env bash
# Local ad-hoc build by default; --release requires all signing and notarization credentials.
set -euo pipefail
cd "$(dirname "$0")"
DESKTOP=$PWD
ROOT=$(cd .. && pwd)
TAURI_CLI="@tauri-apps/cli@2.12.4"
MODE=${1:-local}
case "$MODE" in
  local) unset LILT_UPDATER_PUBLIC_KEY ;;
  --release) node scripts/release.mjs preflight ;;
  *) echo "Usage: desktop/build.sh [--release]" >&2; exit 1 ;;
esac
VERSION=$(node scripts/release.mjs version "$ROOT")
[ "$(uname -s)" = Darwin ] || { echo "The desktop package must be built on a Mac." >&2; exit 1; }
case "$(uname -m)" in
  arm64) ARCH=aarch64 ;;
  x86_64) ARCH=x86_64 ;;
  *) echo "Unsupported Mac architecture." >&2; exit 1 ;;
esac
PY_VERSION=$(cat "$ROOT/analysis/.python-version")
export MACOSX_DEPLOYMENT_TARGET=11.0
if [ -z "${DEVELOPER_DIR:-}" ] && ! cc --version >/dev/null 2>&1 && [ -d /Library/Developer/CommandLineTools ]; then
  export DEVELOPER_DIR=/Library/Developer/CommandLineTools
fi
mkdir -p "$DESKTOP/target"
if [ "$MODE" = --release ]; then
  security find-identity -v -p codesigning | grep -F -- "$APPLE_SIGNING_IDENTITY" >/dev/null \
    || { echo "The Developer ID Application certificate and private key are not available." >&2; exit 1; }
  xcrun notarytool history --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" >/dev/null
fi

echo "==> Web app"
(cd "$ROOT" && bun install --frozen-lockfile)
(cd "$ROOT/web" && bunx vite build --outDir "$DESKTOP/target/web" --emptyOutDir)
echo "==> Server"
(cd "$ROOT/server" && cargo build --locked --release --target-dir "$DESKTOP/target/server")

echo "==> Runtime: server, web app, courses, Python and the measuring helper"
RT="$DESKTOP/runtime"
rm -rf "$RT"
mkdir -p "$RT"
cp "$DESKTOP/target/server/release/lilt" "$RT/lilt"
ditto "$DESKTOP/target/web" "$RT/web"
ditto "$ROOT/content" "$RT/content"
uv python install -q "$PY_VERSION"
# Resolve uv's python3 shim to the actual relocatable distribution before copying.
PY_HOME=$(uv run --no-project --managed-python --python "$PY_VERSION" python -c 'import sys; print(sys.base_prefix)')
ditto "$PY_HOME" "$RT/python"
PYLIB="$RT/python/lib/python$PY_VERSION"
rm -rf "$RT/python/include" "$RT/python/share" "$PYLIB"/{test,idlelib,tkinter,turtledemo,ensurepip,lib2to3} \
  "$PYLIB"/lib-dynload/_tkinter* "$RT/python/lib"/{tcl*,tk*,itcl*,thread*,libtcl*,libtk*} "$PYLIB/site-packages"/pip*
find "$RT/python/bin" -mindepth 1 ! -name "python3*" -delete
(cd "$ROOT/analysis" && uv export --frozen --no-dev --no-hashes --no-emit-project -q) > "$DESKTOP/target/requirements.txt"
uv pip install -q --python "$RT/python/bin/python3" --target "$RT/analysis" -r "$DESKTOP/target/requirements.txt"
ditto "$ROOT/analysis/lilt_analysis" "$RT/analysis/lilt_analysis"
find "$RT" -name __pycache__ -type d -prune -exec rm -rf {} +
rm -rf "$RT/analysis/numpy/"{tests,*/tests} "$RT/analysis/bin"
PYTHONPATH="$RT/analysis" PYTHONDONTWRITEBYTECODE=1 "$RT/python/bin/python3" -c "import lilt_analysis, parselmouth, av, numpy"

echo "==> Lilt.app"
# Never notarize or updater-sign Tauri's incomplete bundle. Runtime must be added first.
env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID -u APPLE_API_KEY -u APPLE_API_ISSUER \
  -u APPLE_API_KEY_PATH -u TAURI_SIGNING_PRIVATE_KEY -u TAURI_SIGNING_PRIVATE_KEY_PATH \
  -u TAURI_SIGNING_PRIVATE_KEY_PASSWORD APPLE_SIGNING_IDENTITY=- \
  bunx "$TAURI_CLI" build --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}' -- --locked
APP="$DESKTOP/target/release/bundle/macos/Lilt.app"
[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist")" = "$VERSION" ] \
  || { echo "Built app version does not match release version." >&2; exit 1; }
# ditto preserves the Python symlinks that Tauri's resource copier would flatten.
ditto "$RT" "$APP/Contents/Resources/runtime"
OUT="$DESKTOP/dist"
rm -rf "$OUT"
mkdir -p "$OUT"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

if [ "$MODE" = --release ]; then
  bash "$DESKTOP/scripts/sign-macos.sh" "$APP"
  ditto -c -k --keepParent "$APP" "$STAGE/Lilt-notarization.zip"
  xcrun notarytool submit "$STAGE/Lilt-notarization.zip" --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait
  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
  codesign --verify --deep --strict --verbose=2 "$APP"
  spctl --assess --type execute --verbose=2 "$APP"
else
  codesign --force --deep --sign - "$APP"
  codesign --verify --deep --strict "$APP"
fi
# Check imports again with the final code signatures, without modifying the signed bundle.
PYTHONPATH="$APP/Contents/Resources/runtime/analysis" PYTHONDONTWRITEBYTECODE=1 \
  "$APP/Contents/Resources/runtime/python/bin/python3" -c "import lilt_analysis, parselmouth, av, numpy"
ditto "$APP" "$OUT/Lilt.app"
ditto "$APP" "$STAGE/Lilt.app"
ln -s /Applications "$STAGE/Applications"
DMG="$OUT/Lilt-$VERSION-$ARCH.dmg"
# The notarization ZIP must not become part of the installer.
rm -f "$STAGE/Lilt-notarization.zip"
hdiutil create -quiet -volname "Lilt" -srcfolder "$STAGE" -fs HFS+ -format UDZO -ov "$DMG"
if [ "$MODE" = --release ]; then
  codesign --force --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$DMG"
  xcrun notarytool submit "$DMG" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait
  xcrun stapler staple "$DMG"
  xcrun stapler validate "$DMG"
  ARCHIVE="$OUT/Lilt-$VERSION-$ARCH.app.tar.gz"
  # Stapling changes the app bytes: only this final app may enter the updater archive.
  COPYFILE_DISABLE=1 tar -czf "$ARCHIVE" -C "$OUT" Lilt.app
  tar -tzf "$ARCHIVE" > "$DESKTOP/target/archive-entries.txt"
  node scripts/release.mjs archive "$DESKTOP/target/archive-entries.txt"
  mkdir "$STAGE/archive-check"
  tar -xzf "$ARCHIVE" -C "$STAGE/archive-check"
  codesign --verify --deep --strict "$STAGE/archive-check/Lilt.app"
  xcrun stapler validate "$STAGE/archive-check/Lilt.app"
  PYTHONPATH="$STAGE/archive-check/Lilt.app/Contents/Resources/runtime/analysis" PYTHONDONTWRITEBYTECODE=1 \
    "$STAGE/archive-check/Lilt.app/Contents/Resources/runtime/python/bin/python3" -c "import lilt_analysis, parselmouth, av, numpy"
  bunx "$TAURI_CLI" signer sign --app-version "$VERSION" "$ARCHIVE"
  node scripts/release.mjs artifact "$OUT" "$ARCH" "$VERSION"
fi
du -sh "$OUT/Lilt.app" "$DMG"
echo "Done: $DMG"
