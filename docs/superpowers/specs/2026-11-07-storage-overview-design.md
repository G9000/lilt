# Storage overview in Settings

The owner chose the proposed Storage overview: show recordings, photos and backup sizes and open
the data folder. Add Settings → Storage with a total and four plain rows: Recordings & analysis,
Photos, Backups & recovery files, Other saved data. Show Refresh, data folder path and Copy folder
path; the installed desktop app also offers Open data folder. No cleanup/deletion or disk-capacity
meter. Explain that logical file sizes exclude the installed app, browser-only room media and
downloaded copies. Sizes can change while practising; a partial scan must never look complete.

`GET /api/storage` returns `{data_path, backup_path, scanned_utc, complete, skipped_entries,
total_bytes, categories:[{id,bytes,files}]}`. IDs in order: recordings, photos, backups, other.
Count original/derived files under sessions/<session>/recordings and sessions/<session>/analyses
as recordings; data/photos as photos; all files in the controller's actual sibling control folder
as backups (including staged previews and recovery data); remaining data files as other. Include
local private-file sizes but never contents or per-file paths. Count each regular file's length;
do not claim allocated disk space. Missing, unreadable, linked/reparse, special, deep or budget-
limited entries yield an incomplete result. Never follow links. Bound traversal by time, entries
and depth. Keep existing host/origin/remote gates. A blocking scan owns App admission until done
even when the caller disconnects; restore and backup maintenance cannot replace its root mid-scan.

For folder opening, use the native host, not a general filesystem API. The main window navigates
to the fixed `lilt://data-folder` action. Native verifies its main window's exact running loopback
origin, asks its owned server for `GET /api/desktop/data-folder` with the existing desktop bearer
token, validates an absolute existing directory, then opens it via the existing opener plugin.
Server returns only its configured/canonical data folder as `{path}` after token verification.
No frontend-provided paths, new remote IPC capabilities, shell strings, or arbitrary destination.
Borrowed/external server ownership fails with a useful Copy folder path fallback. Native posts
`lilt:data-folder` with `{error:string|null}` to the same trusted main origin when finished;
success means the open request succeeded, not that Finder was observed. Prevent overlapping opens.

Tests cover category totals, empty/large data, private/unknown files, backup recovery files,
link/cycle and incomplete scans, local gates, authenticated fixed-folder descriptor, native trust
and path validation, Settings refresh/error/partial states, clipboard failure, native outcome,
browser fallback, keyboard and light/dark narrow layouts. Use scratch data/ports/builds only.
Document actual Windows acceptance and retain the packaged Mac smoke-test limitation.
