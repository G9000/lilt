import { shared } from "../ui/shared";
import { pages } from "../ui/pages";
import { cx } from "../ui/cx";
import { useEffect, useRef, useState } from "react";
import { api, type BackupPreview, type BackupStatus, type BackupSummary, type RestoreResult } from "../api";
import { Row } from "../pages/Settings";

const dateLabel = (date: string) => new Date(date).toLocaleString();
const sizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const contents = (backup: BackupPreview) => `${backup.recordings} recording${backup.recordings === 1 ? "" : "s"} · ${backup.files} files · ${sizeLabel(backup.bytes)} unpacked`;

export function BackupSettings() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"loading" | "create" | "preview" | "restore" | null>("loading");
  const [created, setCreated] = useState<BackupSummary | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [filename, setFilename] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [restored, setRestored] = useState<RestoreResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const live = useRef(false);
  const explain = (e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
  const load = async () => {
    setBusy("loading"); setError(null);
    try { const value = await api.backups(); if (live.current) setStatus(value); }
    catch (e) { if (live.current) explain(e); }
    finally { if (live.current) setBusy(null); }
  };
  useEffect(() => { live.current = true; void load(); return () => { live.current = false; }; }, []);
  const create = async () => {
    setBusy("create"); setError(null);
    try {
      const value = await api.createBackup();
      if (live.current) { setCreated(value); setStatus(s => s && { ...s, last_backup: value }); }
    } catch (e) { if (live.current) explain(e); }
    finally { if (live.current) setBusy(null); }
  };
  const choose = async (file?: File) => {
    if (!file || busy || !status) return;
    setPreview(null); setConfirmed(false); setError(null); setFilename(file.name);
    if (file.size > status.max_upload_bytes) { setError(`This file is too large. Choose a backup smaller than ${sizeLabel(status.max_upload_bytes)}.`); return; }
    setBusy("preview");
    try { const value = await api.previewBackup(file); if (live.current) setPreview(value); }
    catch (e) { if (live.current) explain(e); }
    finally { if (live.current) setBusy(null); }
  };
  const restore = async () => {
    if (!preview || !status || !confirmed || busy) return;
    setBusy("restore"); setError(null);
    try { const value = await api.restoreBackup(preview.id, status.generation); if (live.current) setRestored(value); }
    catch (e) { if (live.current) explain(e); }
    finally { if (live.current) setBusy(null); }
  };
  if (restored) return <div className={cx(pages.sxBackups, "sx-backups")}>
    <p role="status">Your practice data has been restored.</p>
    <p className={cx(pages.sxNote, "sx-note")}>Reload Lilt to use it. Reload any other open Lilt windows too.</p>
    <div className={cx(pages.sxGroup, "sx-group")}><Row label="Safety copy" help="Your data from just before this restore. Download it and keep it somewhere safe." stack>
      <a href={restored.safety_backup.download_url} download>Download safety copy</a>
    </Row></div>
    <button className={[cx(pages.sxBtn, "btn-primary sx-btn"), shared["btn-primary"]].filter(Boolean).join(' ')} onClick={() => window.location.reload()}>Reload Lilt</button>
  </div>;
  return <div className={cx(pages.sxBackups, "sx-backups")} aria-busy={busy !== null}>
    <p className={cx(pages.sxNote, "sx-note")}>Back up your recordings, courses, practice progress, photos, practice notes and settings. Download the ZIP and keep your copy somewhere safe.</p>
    <div className={cx(pages.sxGroup, "sx-group")}>
      <Row label="Back up your practice" help={status?.last_backup ? `Last backup created ${dateLabel(status.last_backup.created_utc)}. Download it to keep your own copy.` : "Keep a copy somewhere safe, such as an external drive."} stack>
        <button className={[cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"]].filter(Boolean).join(' ')} disabled={!!busy || !status} onClick={() => void create()}>{busy === "create" ? "Creating backup…" : "Create backup"}</button>
        {(created ?? status?.last_backup) && <a href={(created ?? status!.last_backup!).download_url} download>Download backup</a>}
      </Row>
      <Row label="Restore a backup" help="Choose a ZIP created here. You can review it before replacing your current practice data." stack>
        <input ref={fileInput} type="file" accept=".zip,application/zip" aria-label="Choose a backup ZIP" disabled={!!busy || !status} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void choose(file); }} />
      </Row>
    </div>
    {busy === "loading" && <p role="status">Loading backup details…</p>}
    {busy === "preview" && <p role="status">Checking {filename}…</p>}
    {created && <p role="status">Backup created. Use Download backup to save your copy.</p>}
    {preview && <section className={cx(pages.sxBackupPreview, "sx-backup-preview")} aria-label="Backup preview">
      <h3>{filename}</h3>
      <p>Created {dateLabel(preview.created_utc)}</p>
      <p>{contents(preview)}</p>
      <p>This replaces your current practice data. Lilt will keep a safety copy first. Finish any recording or analysis before restoring.</p>
      <label className={cx(pages.sxBackupConfirm, "sx-backup-confirm")}><input type="checkbox" checked={confirmed} disabled={!!busy} onChange={e => setConfirmed(e.target.checked)} /> <span>Replace my current practice data with this backup</span></label>
      <div className={cx(pages.sxBackupActions, "sx-backup-actions")}>
        <button className={[cx(pages.sxBtn, "btn-primary sx-btn"), shared["btn-primary"]].filter(Boolean).join(' ')} disabled={!confirmed || !!busy} onClick={() => void restore()}>{busy === "restore" ? "Restoring…" : "Restore backup"}</button>
        <button className={[cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"]].filter(Boolean).join(' ')} disabled={!!busy} onClick={() => { setPreview(null); setConfirmed(false); setError(null); }}>Cancel</button>
      </div>
    </section>}
    {error && <div role="alert"><p>{error}</p>{!status && !busy && <button className={[cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"]].filter(Boolean).join(' ')} onClick={() => void load()}>Try again</button>}</div>}
    <p className={cx(pages.sxNote, "sx-note")}>Sign-ins and AI connections aren’t included. Room appearance, layout, sticky-note styles and uploaded monitor media stay in this browser. Restoring leaves those choices and this computer’s sign-ins as they are.</p>
    <p className={cx(pages.sxNote, "sx-note")}>Backups contain private recordings and notes and aren’t password protected. Keep the file somewhere you trust.</p>
  </div>;
}
