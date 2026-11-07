import { shared } from "../ui/shared";
import { pages } from "../ui/pages";
import { cx } from "../ui/cx";
import { useEffect, useRef, useState } from "react";
import { api, type StorageOverview } from "../api";
import { Row } from "../pages/Settings";
import { folderResult, storageSize } from "../storage";
import { isDesktop } from "../useDesktopUpdate";
import { ResetDataSettings } from "./ResetDataSettings";

const GROUPS = {
  recordings: ["Recordings & analysis", "Original audio, recording chunks and saved measurements."],
  photos: ["Photos", "Pictures added to Lilt’s Photos app."],
  backups: ["Backups & recovery files", "Backup ZIPs, safety copies, restore files and backup settings."],
  other: ["Other saved data", "Courses, progress, notes, settings and other local app files."],
} as const;

export function StorageSettings() {
  const [summary, setSummary] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderMessage, setFolderMessage] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const request = useRef(0);
  const activeScan = useRef<AbortController | null>(null);
  const openTimer = useRef<number | null>(null);
  const clearOpen = () => { if (openTimer.current !== null) window.clearTimeout(openTimer.current); openTimer.current = null; };
  const refresh = async () => {
    const current = ++request.current;
    activeScan.current?.abort();
    const scan = new AbortController();
    activeScan.current = scan;
    const timeout = window.setTimeout(() => scan.abort(), 15000);
    setLoading(true); setError(null);
    try { const result = await api.storage(scan.signal); if (current === request.current) setSummary(result); }
    catch (e) { if (current === request.current) setError(scan.signal.aborted ? "Counting took too long. Try refreshing when Lilt is quiet." : e instanceof Error ? e.message : "Lilt couldn’t count your saved files. Try refreshing."); }
    finally { window.clearTimeout(timeout); if (current === request.current) { activeScan.current = null; setLoading(false); } }
  };
  useEffect(() => {
    void refresh();
    const onFolder = (event: Event) => {
      if (openTimer.current === null) return;
      const result = folderResult((event as CustomEvent<unknown>).detail);
      if (!result) return;
      clearOpen(); setOpening(false);
      setFolderMessage(result.error ?? "Asked your file manager to open the data folder.");
    };
    window.addEventListener("lilt:data-folder", onFolder);
    return () => { request.current++; activeScan.current?.abort(); clearOpen(); window.removeEventListener("lilt:data-folder", onFolder); };
  }, []);
  const copyPath = async () => {
    if (!summary) return;
    try { await navigator.clipboard.writeText(summary.data_path); setFolderMessage("Folder path copied."); }
    catch { setFolderMessage("Select the folder path above and copy it. This browser couldn’t copy it automatically."); }
  };
  const openFolder = () => {
    if (!isDesktop() || opening) return;
    setOpening(true); setFolderMessage(null);
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null; setOpening(false);
      setFolderMessage("Lilt couldn’t confirm the folder opened. Use Copy folder path to find it.");
    }, 15000);
    window.location.href = "lilt://data-folder";
  };
  return <div className={cx(pages.sxStorage, "sx-storage")} data-storage-loading={String(loading)} aria-busy={loading}>
    <div className={cx(pages.sxStorageTotal, "sx-storage-total")}>
      <div>{summary && <><strong>{summary.complete ? "" : "At least "}{storageSize(summary.total_bytes)}</strong><span>Lilt’s saved files</span></>}
        {loading && <p role="status">Counting saved files…</p>}
      </div>
      <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} disabled={loading} onClick={() => void refresh()}>Refresh</button>
    </div>
    {error && <div role="alert"><p>{error}</p>{summary && <p>Showing the previous count. Refresh when you’re ready.</p>}</div>}
    {summary && <>
      {!summary.complete && <p role="status">Some files couldn’t be counted. This is a partial total; linked files and folders aren’t included. Try refreshing when Lilt is quiet.</p>}
      <div className={cx(pages.sxGroup, "sx-group")}>
        {summary.categories.map(category => <Row key={category.id} label={GROUPS[category.id][0]} help={GROUPS[category.id][1]}>
          <span className={cx(pages.sxStorageSize, "sx-storage-size")}>{storageSize(category.bytes)}</span>
        </Row>)}
      </div>
      <p className={cx(pages.sxNote, "sx-note")}>Counted {new Date(summary.scanned_utc).toLocaleString()}. These are file sizes, not allocated disk space. They may change while you practise.</p>
      <div className={cx(pages.sxGroup, "sx-group")}><Row label="Data folder" help="Your recordings and other saved practice data live here." stack>
        <code className={cx(pages.sxStoragePath, "sx-storage-path")}>{summary.data_path}</code>
        <div className={cx(pages.sxStorageActions, "sx-storage-actions")}>
          {isDesktop() && <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} disabled={opening} onClick={openFolder}>{opening ? "Opening folder…" : "Open data folder"}</button>}
          <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} onClick={() => void copyPath()}>Copy folder path</button>
        </div>
      </Row><Row label="Backup folder" help="Backup and recovery files are kept separately from practice data." stack>
        <code className={cx(pages.sxStoragePath, "sx-storage-path")}>{summary.backup_path}</code>
      </Row></div>
      {folderMessage && <p role="status">{folderMessage}</p>}
      {!isDesktop() && <p className={cx(pages.sxNote, "sx-note")}>Copy the data folder path to find it on the computer running Lilt.</p>}
    </>}
    <p className={cx(pages.sxNote, "sx-note")}>This counts Lilt’s data and backup folders. The installed app, room media stored in your browser, and copies downloaded elsewhere aren’t included.</p>
    <ResetDataSettings />
  </div>;
}
