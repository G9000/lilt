# Mac desktop updates

The owner approved a Mac-first updater hosted by GitHub Releases: check on launch and
from Settings, show release notes, download on request, then explicitly update and restart.
An Apple Developer account exists. Certificates and release secrets still need configuring.

## Experience

The Mac menu and Settings → Updates open a small bundled update window. It shows the
installed desktop version, check/error/up-to-date/available/downloading/ready states,
plain-text release notes, progress, Download update and Update and restart. Checks never
install anything. A silent launch check caches availability for the next opening; a check
failure does not interrupt practice. Closing the window does not abandon a download.
Browser users see an explanation that app updates are available in the installed Mac app.
Unconfigured development builds explicitly say that updates are not configured.

## Architecture

Use Tauri 2's Rust updater plugin, with a fixed HTTPS GitHub latest.json endpoint and a
public verification key supplied at build time. GitHub repository G9000/lilt is public.
Keep private signing keys out of the repository and app. Download and signature verification
happen before the install action. Serialized native operations reject overlapping requests.

Only the bundled updates window can call custom update commands. Use explicit Tauri
AppManifest command permissions, local-only capabilities, and window/URL checks. Do not
grant updater or restart access to the localhost practice page or embedded remote content.
Settings requests opening the window through a narrow intercepted lilt://updates navigation;
this cannot download or install. Keep the update window on its bundled page.

The native app owns the server child. Give that child a random, per-launch desktop control
token through its environment. A private server endpoint atomically checks for recording or
saving takes and blocks new take creation under the same lock. Requests without the token
are refused; normal browser and MCP clients never receive it. If active work prevents an
update, keep the downloaded update and explain that the take must finish saving first.
The browser must wait for server take admission before starting MediaRecorder, including
delayed/denied admission. The server must treat a saved take awaiting durable analysis-job
creation as unfinished, so the finalization-to-enqueue gap cannot lose its analysis on restart.
Install only when this desktop instance owns the server, never a separately started server.
Stop and wait for the owned server before replacing the app, then restart Lilt explicitly.
If installation fails, restore service using the installed bundle and allow retry. Do not
let a normal Quit interrupt bundle replacement. A window close may hide the update UI while
work continues; install errors remain available on reopening. If service recovery fails,
explain how to quit and reopen without falsely reporting a working app. Do not
delete or migrate owner data in the updater; any future schema migration is separate work.

## Release process

The authoritative desktop version is tauri.conf.json; Cargo and the displayed release must
match it. Begin at 0.2.1. Build separately on macos-15 (Apple silicon) and macos-15-intel.
Use a manual GitHub workflow, never automatic publishing on every push. Require release
signing secrets and fail before building if missing. Produce a draft release for review.

The existing build script appends Python, the server, UI and content after Tauri builds.
Therefore sign all nested executable code and the final app, notarize and staple it, then
create and updater-sign the complete .app.tar.gz. Generate the .dmg for first installation
from the same final app. Never sign or publish a pre-runtime updater archive. Build a
latest.json from both architectures with matching version, HTTPS URLs, and signatures.
Validate release inputs and package completeness. Preserve Python symlinks. Ad-hoc local
builds remain possible but cannot masquerade as signed public updater releases.

## Validation and limits

Test recovery and serialization of update state, caller restrictions, unsigned/unconfigured
handling, recording/saving interlock, prevention of new recordings during install, and
recovery after failure. Browser-test the update window with a stub native bridge and the
Settings entry. Test release metadata generation with fixtures, including mismatch and
missing-file cases. Run all repository checks in scratch targets/output directories.

This Windows host cannot prove Mac signing, notarization, or native replacement. Before
public launch, build two signed Mac versions and test a real update on both supported chips,
including denied signatures, interrupted download, busy recording, restart, and data retained.
Do not claim live distribution is enabled until secrets are configured and those checks pass.
Do not push, publish, or upload private keys without the owner's explicit instruction.

## Alternatives

GitHub Releases is sufficient for this first release. A dedicated update service would add
operational work without a present need. A manual-download-only button would avoid native
installation work but would not meet the requested whole-app update experience.
