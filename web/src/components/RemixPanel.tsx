import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { openSettings } from "../desk/SettingsSheet";

/** What a remix chat is about: one chapter, or the whole course. */
export interface RemixScope { course?: string; chapter?: string; title: string; starter?: string }

/** Open the Remix chat on the right, about a chapter or the whole course. */
export function openRemix(scope: RemixScope) {
  window.dispatchEvent(new CustomEvent<RemixScope>("lilt:remix", { detail: scope }));
}

/** Tell Practice its texts changed (a remix or an undo), so it reads them again. */
const changed = () => window.dispatchEvent(new Event("lilt:texts-changed"));

type Msg = { role: "user" | "assistant"; content: string; note?: string; failed?: boolean; retry?: string; undone?: boolean };

const CASSETTE = "M2.6 4h10.8a.8.8 0 01.8.8v6.4a.8.8 0 01-.8.8H2.6a.8.8 0 01-.8-.8V4.8a.8.8 0 01.8-.8zM4.4 7.6a1.1 1.1 0 102.2 0 1.1 1.1 0 10-2.2 0M9.4 7.6a1.1 1.1 0 102.2 0 1.1 1.1 0 10-2.2 0M6.6 7.6h2.8";

/**
 * The Remix chat: a panel floating on the right of Practice. Say what should change, your ChatGPT
 * rewrites it into your mixtape (your own copy; the original stays as it is), and you can keep
 * going ("even shorter") or undo the last change. One chat per chapter or for the whole course,
 * kept while Practice is open.
 */
export function RemixPanel() {
  const [scope, setScope] = useState<RemixScope | null>(null);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [connected, setConnected] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const key = scope ? `${scope.course ?? ""}/${scope.chapter ?? "*"}` : "";
  const msgs = chats[key] ?? [];

  useEffect(() => {
    const on = (e: Event) => { setScope((e as CustomEvent<RemixScope>).detail); setDraft(""); };
    window.addEventListener("lilt:remix", on);
    return () => window.removeEventListener("lilt:remix", on);
  }, []);
  useEffect(() => {
    if (!scope) return;
    void api.chatgptStatus().then((s) => setConnected(s.connected), () => setConnected(false));
    window.setTimeout(() => box.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) setScope(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scope, busy]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs.length, busy]);
  // Leaving the chapter closes its chat (unless a remix is still on its way).
  useEffect(() => {
    if (!scope?.chapter) return;
    const onHash = () => { if (!busy && !window.location.hash.startsWith(`#/studio/${scope.chapter}`)) setScope(null); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [scope, busy]);
  // The recorder half recedes behind the chat, so nothing is left half-cut at its edge.
  useEffect(() => {
    const ve = document.querySelector(".ve");
    ve?.classList.toggle("remixing", !!scope);
    return () => ve?.classList.remove("remixing");
  }, [scope]);

  if (!scope) return null;
  const add = (m: Msg) => setChats((c) => ({ ...c, [key]: [...(c[key] ?? []), m] }));

  const send = async (e?: FormEvent, again?: string) => {
    e?.preventDefault();
    const text = (again ?? draft).trim();
    if (!text || busy) return;
    const history = msgs.filter((m) => !m.failed).map(({ role, content }) => ({ role, content }));
    if (!again) add({ role: "user", content: text });
    setDraft(""); setBusy(true);
    try {
      const r = await api.remix(text, scope.chapter, scope.course, history);
      add({ role: "assistant", content: r.reply || "Done. It's in your mixtape.", note: r.note });
      changed();
      // A chapter may have a new name now (a blank one, filled in): show it in the header.
      if (scope.chapter) {
        const t = await api.texts(scope.course).catch(() => null);
        const title = t?.levels.find((l) => l.id === scope.chapter)?.title;
        if (title && title !== scope.title) setScope({ ...scope, title });
      }
    } catch (err) {
      add({ role: "assistant", content: err instanceof Error ? err.message : String(err), failed: true, retry: text });
    } finally { setBusy(false); }
  };
  const undo = async () => {
    setBusy(true);
    try {
      await api.undoSyllabus(scope.course);
      setChats((c) => ({ ...c, [key]: (c[key] ?? []).map((m) => (m === lastChange ? { ...m, undone: true } : m)) }));
      changed();
    }
    catch (err) { add({ role: "assistant", content: err instanceof Error ? err.message : String(err), failed: true }); }
    finally { setBusy(false); }
  };
  const lastChange = [...msgs].reverse().find((m) => m.role === "assistant" && !m.failed && m.note && !m.undone);
  const lastFailed = msgs.length > 0 && msgs[msgs.length - 1].failed ? msgs[msgs.length - 1] : null;

  return (
    <aside className="rp" aria-label={`Remix ${scope.title}`}>
      <header className="rp-head">
        <span className="rp-ic" aria-hidden="true">
          <svg viewBox="0 0 16 16"><path d={CASSETTE} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div><b>{scope.title}</b><small>Remixing into your mixtape</small></div>
        <button className="rp-close" onClick={() => setScope(null)} aria-label="Close remix" disabled={busy}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </header>

      <div className="rp-msgs" ref={list} aria-live="polite">
        {msgs.length === 0 && (
          <div className="rp-hello">
            <p className="rp-ask">{scope.starter ?? (scope.chapter ? `What would you like to change in ${scope.title}?` : "How would you like your own version of this course to be?")}</p>
            <p className="rp-sub">Your ChatGPT rewrites it into your mixtape, your own copy. The original stays as it is, and every change can be undone.</p>
            <ul className="rp-try" aria-label="Ideas">
              {(scope.chapter
                ? ["Make these shorter", "Add two texts about ordering coffee", "Make the hints simpler"]
                : ["Make everything gentler for a beginner", "Add a chapter about phone calls", "Make it about my work days"]
              ).map((t) => (
                <li key={t}><button type="button" onClick={() => { setDraft(t); box.current?.focus(); }}>
                  <span>{t}</span>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button></li>
              ))}
            </ul>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`rp-msg ${m.role}${m.failed ? " failed" : ""}`}>
            <p>{m.content}</p>
            {m.note && (
              <div className={`rp-saved${m.undone ? " undone" : ""}`}>
                <svg viewBox="0 0 16 16" aria-hidden="true">{m.undone
                  ? <path d="M4 6.5h6a3 3 0 010 6H7M6 4L3.5 6.5 6 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}</svg>
                <span>{m.undone ? "Undone" : m.note}</span>
                {m === lastChange && !busy && <button type="button" className="rp-undo" onClick={() => void undo()}>Undo</button>}
              </div>
            )}
            {m === lastFailed && m.retry && !busy && <button type="button" className="rp-retry" onClick={() => void send(undefined, m.retry)}>Try again</button>}
          </div>
        ))}
        {busy && (
          <div className="rp-msg assistant rp-typing" role="status" aria-label="Remixing with your ChatGPT">
            <span className="rp-dots" aria-hidden="true"><i /><i /><i /></span>
            <small>Remixing with your ChatGPT…</small>
          </div>
        )}
      </div>

      {connected === false ? (
        <div className="rp-off">
          <p>Connect your ChatGPT to remix here.</p>
          <button className="rp-btn" onClick={() => openSettings("ai")}>Connect ChatGPT</button>
        </div>
      ) : (
        <form className="rp-form" onSubmit={(e) => void send(e)}>
          <div className="rp-input">
            <textarea ref={box} rows={1} maxLength={1000} value={draft} disabled={busy || connected === null} placeholder="Say what to change…" aria-label="What to change"
              onChange={(e) => { setDraft(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
            <button className="rp-send" disabled={busy || !draft.trim()} aria-label="Remix">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <p className="rp-hint">Enter to remix · Shift+Enter for a new line</p>
        </form>
      )}
    </aside>
  );
}
