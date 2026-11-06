#!/usr/bin/env bash
# Sign executable leaves before enclosing bundles; never use --deep to create a release signature.
set -euo pipefail
APP=${1:?App bundle required}
DESKTOP=$(cd "$(dirname "$0")/.." && pwd)
: "${APPLE_SIGNING_IDENTITY:?Developer ID Application identity required}"
xattr -cr "$APP"
while IFS= read -r -d '' item; do
  if file -b "$item" | grep -q 'Mach-O'; then
    lipo -verify_arch "$(uname -m)" "$item"
    args=(--force --timestamp --options runtime --sign "$APPLE_SIGNING_IDENTITY")
    case "$item" in
      */runtime/python/bin/python3*) args+=(--entitlements "$DESKTOP/scripts/python-entitlements.plist") ;;
    esac
    codesign "${args[@]}" "$item"
  fi
done < <(find "$APP" -type f -print0)
while IFS= read -r -d '' bundle; do
  codesign --force --timestamp --options runtime --sign "$APPLE_SIGNING_IDENTITY" "$bundle"
done < <(find "$APP" -depth -type d \( -name '*.framework' -o -name '*.app' -o -name '*.xpc' -o -name '*.bundle' \) ! -path "$APP" -print0)
codesign --force --timestamp --options runtime --entitlements "$DESKTOP/entitlements.plist" \
  --sign "$APPLE_SIGNING_IDENTITY" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
