# Desktop releases

Lilt's Mac updates are complete app replacements: the desktop window, Rust server, web app,
courses, Python and measuring libraries travel together. Recordings and preferences remain
in the owner's data folder. The updater does not delete or migrate that folder.

The release workflow is manual and creates a **draft**, never a public release. No release
credentials have been configured or used as part of implementing this pipeline. Mac signing,
notarization and installation must still pass the acceptance checks below before publication.

## Set up the two signing identities

Apple code signing and Tauri updater signing serve different purposes. Keep both private
keys backed up securely, outside this repository. Do not paste private keys into issues,
release notes, chat, or workflow logs.

1. In the Apple Developer account, create a **Developer ID Application** certificate for
   distribution outside the App Store. Install the certificate and its private key in a
   Mac keychain. Export them together as a password-protected `.p12` from Keychain Access.
   Use `security find-identity -v -p codesigning` to find the full identity name.
2. Create an app-specific password for the Apple ID used for notarization, and note the
   Apple team ID. This pipeline uses Apple ID notarization credentials, not an App Store
   Connect API key. The password is not the account's normal sign-in password.
3. Once, on a trusted computer, generate a Tauri updater key pair outside the checkout:

   ```bash
   bunx @tauri-apps/cli@2.12.4 signer generate -w "$HOME/.lilt-release/lilt-updater.key"
   ```

   Back up the private key and password securely. Keep using this pair for future releases:
   already-installed apps trust its public key. Losing it prevents those apps from accepting
   new updates. Key rotation requires a separately planned transition or manual install.
   The repository does not contain a generated release key.

See [Apple's notarization requirements](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution),
[Tauri's Mac signing guide](https://v2.tauri.app/distribute/sign/macos/), and
[Tauri's updater signing guide](https://v2.tauri.app/plugin/updater/).

## GitHub repository secrets

Configure these in **G9000/lilt → Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64 of the exported Developer ID Application `.p12` file |
| `APPLE_CERTIFICATE_PASSWORD` | Nonempty password protecting that `.p12` |
| `APPLE_SIGNING_IDENTITY` | Full `Developer ID Application: … (TEAMID)` identity |
| `APPLE_ID` | Apple ID email used for notarization |
| `APPLE_PASSWORD` | App-specific password for that Apple ID |
| `APPLE_TEAM_ID` | Apple Developer team ID |
| `LILT_UPDATER_PUBLIC_KEY` | Literal contents of the updater `.pub` file |
| `TAURI_SIGNING_PRIVATE_KEY` | Literal contents of the updater private key file, not its path |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Updater key password; may be empty for an unencrypted key |

The workflow explicitly provides an empty password environment variable when that secret
is absent; this is the supported unencrypted-key case. Local release builds must explicitly
set the variable, even when empty. Encrypted keys always need their actual password.

The public key is not confidential, but keeping its build input alongside the private key
makes the pair explicit. It is compiled into the desktop app and used again to verify both
finished archives before the draft is made. Do not change it between releases casually.

The certificate is imported into a temporary runner keychain. The workflow removes the
keychain and exported certificate even if the build fails. Private keys and certificates
are excluded from uploaded artifacts.

## Prepare a draft

1. Set the new stable version in `desktop/tauri.conf.json`, `desktop/Cargo.toml` and the first
   entry in `web/src/release.ts`; update the lockfile. The initial updater-enabled version is
   `0.2.1`. Tauri's version is authoritative and the checks reject a mismatch.
2. Finish the repository checks described in `AGENTS.md`, including
   `node --test desktop/scripts/*.test.mjs`. Commit and push only when the owner requests it.
3. In GitHub Actions, choose **Prepare Mac release draft**, select **main**, and enter the
   plain-text release notes. Other branches cannot run the release jobs. No push or tag event
   triggers this workflow.
4. The first job checks credentials and versions. Separate `macos-15` Apple silicon and
   `macos-15-intel` Intel jobs build the whole runtime. The final job downloads both completed
   build artifacts, verifies signatures/checksums/version agreement, and creates a draft.
   Existing release tags are never overwritten.
5. Review the draft and test the exact artifacts. Publishing the draft is a separate owner
   action. Until it is published, the public updater cannot see that version.

Every release contains these files for each architecture (`aarch64` and `x86_64`):

- `Lilt-<version>-<arch>.dmg` for first or manual installation.
- `Lilt-<version>-<arch>.app.tar.gz` for the updater.
- `Lilt-<version>-<arch>.app.tar.gz.sig` with the updater signature.
- One `latest.json` containing both `darwin-aarch64` and `darwin-x86_64` entries.

The app checks the fixed public endpoint
`https://github.com/G9000/lilt/releases/latest/download/latest.json`. Each manifest entry
uses the version-specific HTTPS release URL; it cannot select an arbitrary repository.
Publishing a release without a complete `latest.json` will break update checks. Drafts and
prereleases do not provide the stable latest release endpoint. Keep old artifacts available.

## Build locally on a Mac

`bash desktop/build.sh` creates an ad-hoc app and DMG for development, with updates disabled.
It does not create an updater archive or release metadata. Gatekeeper may require approving
that local app through Privacy & Security. Do not distribute it as a signed public release.

For a release, load the secrets above into the environment and run:

```bash
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD='' # only when the updater key is unencrypted
bash desktop/build.sh --release
```

The Developer ID certificate/private key must already be in the Mac's keychain for a local
build; `APPLE_CERTIFICATE` and its password are only needed by the GitHub import step.
Missing release inputs stop the script before building. Nothing reads a `.env` file.

An optional real-signer regression check uses the pinned CLI, creates a temporary test-only
key under ignored `desktop/target`, signs two dummy artifacts, verifies them and rejects
tampering. It deletes that private key even when the test fails. This needs Bun and may
download the CLI; the ordinary fixture suite does not need the network or release keys:

```bash
LILT_TEST_REAL_SIGNER=1 node --test desktop/scripts/signer-roundtrip.test.mjs
```

In PowerShell, set `$env:LILT_TEST_REAL_SIGNER='1'` before running the same Node command.

Build output is in `desktop/dist`. Server and web compilation use `desktop/target/server`
and `desktop/target/web`, leaving the owner's running server and `web/dist` alone. The
script creates no practice server and does not access the owner's practice data.

## Why signing happens after packaging

Tauri builds the shell first. `ditto` then copies the entire runtime while preserving Python's
symlinks. Every nested Mach-O file is signed with Developer ID and hardened runtime, followed
by nested bundles and the outer app. Each Mach-O is checked for the intended architecture.
The app has microphone entitlement; only Python receives the executable-memory entitlement
needed for libffi callbacks. Library validation stays enabled.

The final app is notarized and stapled, then copied into the DMG. The DMG is also signed,
notarized and stapled. The updater archive is made from that same stapled app. The script
extracts it again, verifies the app signature and staple, and imports the bundled analysis
libraries. Only then does it run `tauri signer sign --app-version <version>` on the archive.
Never re-sign, strip or otherwise modify an app after making its updater archive.

CLI `2.12.4` supports the signed-version trusted comment introduced in CLI `2.12.0`.
Lilt requires it: the manifest's version must match the version covered by the signature.
The metadata tool checks the archive signature, the signature's trusted comment and both
builds' checksums against the configured public key. A signed older archive cannot be
relabeled with a newer version. See the [Tauri CLI release notes](https://v2.tauri.app/release/@tauri-apps/cli/)
and [Apple's inside-out signing guidance](https://developer.apple.com/library/archive/technotes/tn2206/).

## First install and acceptance gate

Existing ad-hoc builds do not have the updater or its public key. Install the first signed
release manually from the matching DMG, drag Lilt into Applications, eject the disk image,
then open the installed app. Never run an update from the mounted DMG. The app replaces
itself in Applications; practice data remains outside the app.

Before the first public release, test two signed versions on both Apple silicon and Intel
using disposable practice data and a separate port. Exercise the same endpoint and signed
artifacts intended for production in a controlled acceptance build; do not publish a dummy
stable release to test the owner's installed app. Keep results in `docs/validation`.

- Open the downloaded DMG/app on a clean Mac with Gatekeeper enabled, including offline
  launch after stapling. Confirm microphone access, recording, saving and real analysis.
- From the older installed version, check, read notes, download, explicitly install and
  restart into the newer version. Confirm recordings, settings and course progress remain.
- Confirm altered archives, mismatched keys and relabeled versions are rejected, and an
  interrupted download can be retried without damaging the current app.
- Try updating while recording and while saving. The take must finish; the downloaded
  update must remain available. New recordings must not begin during installation.
- Test an independently started server, installation failure, server recovery, leaving
  Settings during a download and quitting during replacement. Confirm no false success message.

Windows fixture and browser tests cannot establish any of those native Mac outcomes.
The draft workflow is ready to configure; live distribution is not verified or enabled.

## Windows releases

Windows updates use the same Tauri updater key pair as the Mac (one public key for both feeds).
The release build runs on the owner's Windows computer; there is no Windows workflow yet.

1. The key pair lives outside the checkout, in `%USERPROFILE%\.lilt-release\lilt-updater.key`
   and `lilt-updater.key.pub` (made on 9 November 2026 with `signer generate --ci`, unencrypted).
   **Back up both files somewhere safe.** Installed apps trust only this public key: losing the
   private key means existing installs can no longer update and need a manual install.
2. Set the version as for the Mac, run the checks, and commit and push when the owner asks.
3. Build with the key and a plain-text note that Settings → Updates shows:

   ```powershell
   $env:LILT_UPDATER_PUBLIC_KEY = (Get-Content -Raw "$env:USERPROFILE\.lilt-release\lilt-updater.key.pub").Trim()
   $env:TAURI_SIGNING_PRIVATE_KEY_PATH = "$env:USERPROFILE\.lilt-release\lilt-updater.key"
   powershell -NoProfile -ExecutionPolicy Bypass -File desktop/build.ps1 -Release -NotesFile notes.txt
   ```

   The build compiles the public key into the app, signs the finished installer with
   `signer sign --app-version`, verifies the signature against the public key, and writes
   `desktop/dist/Lilt-<version>-x64-setup.exe`, its `.sig` and `latest.json`.
4. Smoke-test the installer (`desktop/scripts/windows-smoke.mjs`), then make a **draft** release
   tagged `v<version>` with the installer and `latest.json` (the `.sig` is already inside
   `latest.json`). The owner publishes it. Installed apps read
   `releases/latest/download/latest.json`, so an update appears only once the release is published
   and marked latest.

When the Mac feed is published as well, both platforms must share one `latest.json`: merge the
`darwin-*` and `windows-x86_64` entries before uploading.
