# Update notices and version in Settings

The owner approved the proposed follow-up: a quiet notification-center item for an available
app update, plus the installed desktop version and availability directly in Settings.

Use the existing notification center and its read/clear behavior. Identify an update notice by
version, so checking again or moving from downloading to ready does not create another unread
notice. Opening it opens the native Updates window, never starts download or installation.
A later version gets a new notice. Up-to-date, unconfigured and failed checks make no notice.
No system notification, toast, sound or automatic opening is added.

Settings → Updates shows Installed version and Update status using the native app's version,
not the web release constant (the app may attach to a separately started server). Cover waiting,
checking, up to date, available, downloading, ready, installing, unconfigured and failed check.
Keep Open app updates for explicit actions. Browser-only use shows Web version from the
bundled release constant and explains that desktop updates belong to the installed Mac app.

Native code pushes a read-only projection into the main practice window after page load and
when visible status changes: `window.__LILT_APP_UPDATE__ = {current, phase, version, failed}`,
then dispatches `lilt:app-update`. `version` is null unless phase is available, downloading,
ready or installing; `failed` means the native snapshot has an error. Do not expose notes,
download URLs, tokens or privileged commands. Restrict delivery to the main window at the exact
configured loopback HTTP origin, with a second origin check inside the evaluated script.
No new remote IPC capabilities or server endpoints. Re-send on reload; progress byte changes
need no broadcast. The web validates the projection and shares it between Settings and Inbox.

Tests cover native projection/origin policy, web status wording and malformed data, browser
delivery before/after mount and reload, notification dedup/read/clear/new-version behavior,
opening only the Updates window, browser mode, keyboard and narrow/light/dark layouts.
Run repository checks in scratch outputs, document Mac delivery as requiring native acceptance,
and commit checked work on main without pushing.
