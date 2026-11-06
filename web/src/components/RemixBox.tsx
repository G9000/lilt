import { shared } from "../ui/shared";
import { pages } from "../ui/pages";
import { cx } from "../ui/cx";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { openSettings } from "../desk/SettingsSheet";
import { REMIX_AVAILABLE } from "../remix";

/**
 * Remix with your ChatGPT, right where you practise: say what should change, and the rewritten
 * chapter (or chapters) goes into your mixtape, your own copy of the course. The original is never
 * changed, and Undo takes it back.
 */
export function RemixBox({ course, chapter, chapterTitle, onDone }: { course?: string; chapter?: string; chapterTitle?: string; onDone?: () => void }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (REMIX_AVAILABLE) void api.chatgptStatus().then((s) => setConnected(s.connected), () => setConnected(false)); }, []);

  const remix = async (e: FormEvent) => {
    e.preventDefault();
    if (!REMIX_AVAILABLE || !draft.trim() || busy) return;
    setBusy(true); setErr(null); setDone(null);
    try {
      const r = await api.remix(draft.trim(), chapter, course);
      setDone(r.reply || "Done. It's in your mixtape."); setDraft(""); onDone?.();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const undo = async () => {
    setBusy(true); setErr(null);
    try { await api.undoSyllabus(course); setDone(null); onDone?.(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  if (!REMIX_AVAILABLE) return (
    <div className={cx(pages.rx, pages.rxOff, "rx rx-off")}>
      <p>Remix is coming soon. Choose the AI app you want to use in settings.</p>
      <button type="button" className={["btn-primary", shared["btn-primary"]].filter(Boolean).join(' ')} disabled>Remix · Coming soon</button>
      <button type="button" className={["btn-secondary ss-open", shared["btn-secondary"]].filter(Boolean).join(' ')} onClick={() => openSettings("ai")}>Configure your AI settings</button>
    </div>
  );
  if (connected === null) return null;
  if (!connected) return (
    <div className={cx(pages.rx, pages.rxOff, "rx rx-off")}>
      <p>Choose the AI app you want to use in settings.</p>
      <button type="button" className={["btn-secondary ss-open", shared["btn-secondary"]].filter(Boolean).join(' ')} onClick={() => openSettings("ai")}>Configure your AI settings</button>
    </div>
  );
  return (
    <form className={cx(pages.rx, "rx")} onSubmit={(e) => void remix(e)}>
      <label htmlFor={`rx-${chapter ?? "all"}`}>{chapterTitle ? `Remix ${chapterTitle}` : "What should change?"}</label>
      <textarea id={`rx-${chapter ?? "all"}`} rows={2} maxLength={1000} value={draft} disabled={busy} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
        placeholder={chapterTitle ? "e.g. make these shorter, or add two texts about ordering coffee" : "e.g. make the warm-ups shorter and gentler"} />
      <div className={cx(pages.rxFoot, "rx-foot")}>
        <span className={cx(pages.rxNote, "rx-note")}>{busy ? "Remixing with your AI… this can take up to a minute." : "Your AI rewrites it into your mixtape. The original stays as it is."}</span>
        <button className={["btn-primary", shared["btn-primary"]].filter(Boolean).join(' ')} disabled={busy || !draft.trim()}>{busy ? "Remixing…" : "Remix"}</button>
      </div>
      {done && <p className={cx(pages.rxDone, "rx-done")} role="status">{done} <button type="button" className="rx-undo" onClick={() => void undo()} disabled={busy}>Undo</button></p>}
      {err && <p className={cx(pages.rxErr, "rx-err")} role="alert">{err}</p>}
    </form>
  );
}
