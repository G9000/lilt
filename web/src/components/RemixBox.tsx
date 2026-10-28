import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { openSettings } from "../desk/SettingsSheet";

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
  useEffect(() => { void api.chatgptStatus().then((s) => setConnected(s.connected), () => setConnected(false)); }, []);

  const remix = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
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

  if (connected === null) return null;
  if (!connected) return (
    <div className="rx rx-off">
      <p>Connect your ChatGPT to remix {chapterTitle ? "this chapter" : "your course"} right here.</p>
      <button type="button" className="btn-secondary ss-open" onClick={() => openSettings("ai")}>Connect ChatGPT</button>
    </div>
  );
  return (
    <form className="rx" onSubmit={(e) => void remix(e)}>
      <label htmlFor={`rx-${chapter ?? "all"}`}>{chapterTitle ? `Remix ${chapterTitle}` : "What should change?"}</label>
      <textarea id={`rx-${chapter ?? "all"}`} rows={2} maxLength={1000} value={draft} disabled={busy} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
        placeholder={chapterTitle ? "e.g. make these shorter, or add two texts about ordering coffee" : "e.g. make the warm-ups shorter and gentler"} />
      <div className="rx-foot">
        <span className="rx-note">{busy ? "Remixing with your ChatGPT… this can take up to a minute." : "Your ChatGPT rewrites it into your mixtape. The original stays as it is."}</span>
        <button className="btn-primary" disabled={busy || !draft.trim()}>{busy ? "Remixing…" : "Remix"}</button>
      </div>
      {done && <p className="rx-done" role="status">{done} <button type="button" className="rx-undo" onClick={() => void undo()} disabled={busy}>Undo</button></p>}
      {err && <p className="rx-err" role="alert">{err}</p>}
    </form>
  );
}
