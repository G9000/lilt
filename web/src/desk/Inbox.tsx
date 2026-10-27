import { ReactNode, useEffect, useMemo, useState } from "react";
import { api, AREA_LABEL, Deck, Today } from "../api";
import { go } from "../App";

/**
 * The inbox: only things worth knowing, built from what Lilt already tracks. Never streaks,
 * never missed days. What you've read or cleared is remembered in this browser only.
 */

type Kind = "feedback" | "stage" | "reminder" | "rest" | "recovered";
export interface Note { id: string; kind: Kind; title: string; body: string; when: string; to: string }

const READ = "lilt.inbox.read", CLEARED = "lilt.inbox.cleared";
const load = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } };
const save = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v.slice(-200))); } catch { /* private mode: forget */ } };
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function build(today: Today | null, deck: Deck | null, recovered: number): Note[] {
  const out: Note[] = [];
  const date = deck?.local_date ?? today?.local_date ?? "";
  const r = today?.latest_review;
  if (r && Date.now() - Date.parse(r.created_utc) < 3 * 86400000) {
    const p = r.active_pointer;
    out.push({
      id: `review-${r.id}`, kind: "feedback", title: "Your feedback is ready", to: `/review/${r.id}`, when: time(r.created_utc),
      body: p ? `${AREA_LABEL[p.area] ?? p.area}: ${p.next_action?.summary ?? "one thing to try next time."}` : "From your guided session.",
    });
  }
  if (deck && deck.open_stage > 1) {
    out.push({ id: `stage-${deck.open_stage}`, kind: "stage", title: `Stage ${deck.open_stage} is open`, to: "/texts", when: "Today",
      body: "New cards arrive a couple at a time, no rush." });
  }
  if (deck?.paused) {
    out.push({ id: `rest-${date}`, kind: "rest", title: "Resting today", to: "/desk", when: "Today",
      body: "Cards that hurt stay paused until you feel ready. Nothing is lost." });
  } else if (today?.reminder.due && deck && !deck.all_done) {
    const left = deck.items.filter((i) => !i.done_today).length;
    out.push({ id: `reminder-${date}`, kind: "reminder", title: "Your practice time", to: "/desk", when: today.reminder.time ?? "Today",
      body: `${left} card${left === 1 ? "" : "s"}, about ${Math.max(1, left)} minute${left === 1 ? "" : "s"}, whenever suits you.` });
  }
  if (recovered > 0) {
    out.push({ id: `recovered-${date}-${recovered}`, kind: "recovered", title: `Recovered ${recovered} recording${recovered > 1 ? "s" : ""}`, to: "/history", when: "Just now",
      body: "From a page that closed mid-take. They're saved and marked as interrupted." });
  }
  return out;
}

export function useInbox(deck: Deck | null, recovered: number) {
  const [today, setToday] = useState<Today | null>(null);
  const [read, setRead] = useState(() => load(READ));
  const [cleared, setCleared] = useState(() => load(CLEARED));
  const [open, setOpen] = useState(false);
  useEffect(() => { void api.today().then(setToday, () => setToday(null)); }, [deck]);
  const notes = useMemo(() => build(today, deck, recovered).filter((n) => !cleared.includes(n.id)), [today, deck, recovered, cleared]);
  const unread = notes.filter((n) => !read.includes(n.id)).length;
  const markRead = (ids: string[]) => setRead((r) => { const v = [...new Set([...r, ...ids])]; save(READ, v); return v; });
  return {
    notes, unread, open, read,
    setOpen,
    toggle: () => setOpen((o) => { if (o) markRead(notes.map((n) => n.id)); return !o; }),
    openNote: (n: Note) => { markRead([n.id]); setOpen(false); go(n.to); },
    clearAll: () => { const v = [...new Set([...cleared, ...notes.map((n) => n.id)])]; save(CLEARED, v); setCleared(v); markRead(notes.map((n) => n.id)); },
  };
}
export type InboxState = ReturnType<typeof useInbox>;

const ENVELOPE = <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2.5" /><path d="M3 6l7 5 7-5" /></svg>;

export function InboxButton({ inbox }: { inbox: InboxState }) {
  return (
    <button className={`ib-btn${inbox.unread ? "" : " read"}`} onClick={(e) => { e.stopPropagation(); inbox.toggle(); }} aria-expanded={inbox.open}
      aria-label={inbox.unread ? `Notifications, ${inbox.unread} new` : "Notifications"}>
      {ENVELOPE}<span className="dot" aria-hidden="true" />
    </button>
  );
}

const ICON: Record<Kind, ReactNode> = {
  feedback: <path d="M4 5h12v8H9l-4 3v-3H4z" />,
  stage: <path d="M10 16V7M6 10.5c0-3 1.8-5 4-6 2.2 1 4 3 4 6M10 9c-1.6-1.2-3.4-1.4-5-1M10 9c1.6-1.2 3.4-1.4 5-1" />,
  reminder: <><circle cx="10" cy="10.5" r="6" /><path d="M10 7.5v3l2 1.5M7 3.5L4.5 5.5M13 3.5l2.5 2" /></>,
  rest: <path d="M14.5 12.5A6 6 0 017.5 5.5a6 6 0 107 7z" />,
  recovered: <><path d="M4 10a6 6 0 1 0 2-4.5" /><path d="M4 3.5V6h2.5" /></>,
};

function greeting(h = new Date().getHours()) {
  return h < 5 ? "Still up?" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Good night";
}

/** Notification Center: slides in from the right edge, over the room or the desk. */
export function NotificationCenter({ inbox }: { inbox: InboxState }) {
  const { open, notes, read } = inbox;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest(".nc, .ib-btn")) inbox.toggle(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); inbox.toggle(); } };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey, true); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className={`nc-scrim${open ? " on" : ""}`} aria-hidden="true" />
      <section className={`nc${open ? " open" : ""}`} aria-label="Notifications" aria-hidden={!open} {...({ inert: open ? undefined : "" } as object)}>
        <header className="nc-head">
          <b>{greeting()}</b>
          <span>{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</span>
        </header>
        {notes.length > 0 ? (
          <>
            <div className="nc-group"><span>Lilt</span><button onClick={inbox.clearAll}>Clear all</button></div>
            <ul className="nc-list">
              {notes.map((n) => (
                <li key={n.id} className={read.includes(n.id) ? undefined : "new"}>
                  <button onClick={() => inbox.openNote(n)}>
                    <span className={`nc-ic ${n.kind}`}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[n.kind]}</svg></span>
                    <b>{n.title}</b><time>{n.when}</time><small>{n.body}</small>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="nc-empty">No notifications. All quiet.</p>}
        <p className="nc-foot">Only things worth knowing land here. Never streaks, never missed days.</p>
      </section>
    </>
  );
}
