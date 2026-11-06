#!/usr/bin/env bash
set -euo pipefail
: "${RUNNER_TEMP:?This helper is for GitHub hosted runners}"
: "${APPLE_CERTIFICATE:?Base64 Developer ID certificate required}"
: "${APPLE_CERTIFICATE_PASSWORD:?Certificate password required}"
umask 077
CERT="$RUNNER_TEMP/lilt-release.p12"
KEYCHAIN="$RUNNER_TEMP/lilt-release.keychain-db"
KEYCHAIN_PASSWORD=$(openssl rand -base64 32)
echo "::add-mask::$KEYCHAIN_PASSWORD"
printf '%s' "$APPLE_CERTIFICATE" | base64 --decode > "$CERT"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security import "$CERT" -P "$APPLE_CERTIFICATE_PASSWORD" -k "$KEYCHAIN" -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
security list-keychains -d user -s "$KEYCHAIN" "$HOME/Library/Keychains/login.keychain-db"
rm -f "$CERT"
