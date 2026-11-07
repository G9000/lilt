import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ResetStatus } from "../api";
import { dataClient } from "../dataGeneration";
import { reloadForReset, RESET_CONFIRMATION } from "../resetBrowserData";
import { shared } from "../ui/shared";
import { pages } from "../ui/pages";
import { cx } from "../ui/cx";

const secondary = cx(pages.sxBtn, shared["btn-secondary"], "sx-btn btn-secondary");
const primary = cx(pages.sxBtn, shared["btn-primary"], "sx-btn btn-primary");

export function ResetDataSettings() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ResetStatus | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"loading" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const live = useRef(false);
  const submitting = useRef(false);
  const wasOpen = useRef(false);
  const request = useRef(0);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (open) cancel.current?.focus();
    else if (wasOpen.current) opener.current?.focus();
    wasOpen.current = open;
  }, [open]);
  const show = async () => {
    const current = ++request.current;
    setOpen(true); setConfirmation(""); setError(null); setStatus(null); setBusy("loading");
    try { const result = await api.resetStatus(); if (live.current && current === request.current) setStatus(result); }
    catch (e) { if (live.current && current === request.current) setError(e instanceof Error ? e.message : "Lilt couldn’t check the current data. Try opening this confirmation again."); }
    finally { if (live.current && current === request.current) setBusy(null); }
  };
  const close = () => { request.current++; setOpen(false); setConfirmation(""); setError(null); };
  const reset = async () => {
    if (!status || confirmation !== RESET_CONFIRMATION || busy || uncertain || submitting.current || status.pending_cleanup) return;
    submitting.current = true; setBusy("reset"); setError(null);
    try {
      const result = await api.resetAllData(status.generation, confirmation);
      if (result.reset !== true || !result.reset_id) throw new Error("Lilt couldn’t confirm the reset result.");
      reloadForReset(result.reset_id, "complete");
    } catch (e) {
      const marker = dataClient.resetId();
      if (marker && marker !== status.reset_id) { reloadForReset(marker, "incomplete"); return; }
      if (!live.current) return;
      const rejected = e instanceof ApiError && [400, 403, 409].includes(e.status);
      setUncertain(!rejected);
      setConfirmation("");
      setError(`${e instanceof Error ? e.message : "The connection ended before Lilt confirmed the reset."}${rejected ? "" : " The reset may have happened. Reload Lilt to check; this request will not be sent again."}`);
    } finally { submitting.current = false; if (live.current) setBusy(null); }
  };
  return <section className="mt-8 border-t border-[var(--hair)] pt-6" aria-label="Reset all data">
    <h3 className="mb-2 text-lg font-semibold">Reset all data</h3>
    <p className={cx(pages.sxNote, "sx-note")}>Permanently delete your saved Lilt data and start fresh. This cannot be undone.</p>
    {!open && <button ref={opener} className={secondary} onClick={() => void show()}>Reset all data…</button>}
    {open && <div className="mt-4 grid gap-3" aria-busy={busy !== null}>
      <p>This deletes all recordings, photos, progress, custom courses, notes, settings, sign-ins and AI connections, plus Lilt-managed backups and recovery files.</p>
      <p>It also clears Lilt’s browser data: room choices and layout, sticky notes, flashcard progress, saved recording chunks and uploaded monitor media. Other Lilt browser addresses clear their local data when they next connect.</p>
      <p>No safety backup is made. Copies you downloaded or exported elsewhere are not removed. The installed app and bundled courses remain.</p>
      <p>Finish any recording, analysis or update first. Keep this window open while the reset runs.</p>
      <label className="grid gap-2" htmlFor="reset-confirmation">Type DELETE ALL DATA to confirm
        <input id="reset-confirmation" className="max-w-full rounded-lg border border-[var(--hair)] bg-[var(--fill)] px-3 py-2 text-[var(--ink)]" value={confirmation} autoComplete="off" spellCheck={false} disabled={busy === "reset" || uncertain} onChange={event => setConfirmation(event.target.value)} />
      </label>
      {busy === "loading" && <p role="status">Checking the current data…</p>}
      {status?.pending_cleanup && <p role="alert">An earlier reset still needs cleanup. Restart Lilt to finish deleting the old files before making changes.</p>}
      {error && <p role="alert">{error}</p>}
      <div className={cx(pages.sxStorageActions, "sx-storage-actions")}>
        <button ref={cancel} className={secondary} disabled={busy === "reset"} onClick={close}>Cancel</button>
        <button className={primary} disabled={!status || confirmation !== RESET_CONFIRMATION || busy !== null || uncertain || status.pending_cleanup === true} onClick={() => void reset()}>{busy === "reset" ? "Resetting all data…" : "Delete all data"}</button>
        {uncertain && <button className={secondary} onClick={() => location.reload()}>Reload Lilt to check</button>}
      </div>
    </div>}
  </section>;
}
