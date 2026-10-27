import "../styles/deck.css";
import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { api, Deck, DeckItem, Rating, Session, Take } from "../api";
import { go } from "../App";
import { setRoom } from "../room/Room";
import { loadPeaks } from "../components/AudioPlayer";
import { LivePitchMeter, Measured, TakeResult } from "../components/DeckPitch";
import { useMic } from "../components/Recording";
import { RecState, TakeMeta, TakeRecorder } from "../recorder";
import { noteName } from "../pitch";

const RATINGS: { r: Rating; label: string }[] = [
  { r: "again", label: "Again" },
  { r: "hard", label: "Hard" },
  { r: "good", label: "Good" },
  { r: "easy", label: "Easy" },
];

/** Hums and held sounds get a highlight so you can see what to feel for. */
export function SayText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) => (/^(h?mm+|mhm|ng+|m{2,})/i.test(p.replace(/^[^a-z]+/i, "")) ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

const deckName = (it: DeckItem) => (it.card.kind === "reference" ? "Reference" : it.card.deck_title);

function friendlyDate(d: string, today: string) {
  const days = Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** White record button with a red dot. "Saved" only after the server confirms the take. */
function CardRecorder({ meta, onSaved, onActive, above, aside }: { meta: TakeMeta; onSaved: (t: Take) => void; onActive: (rec: boolean) => void; above?: ReactNode; aside?: ReactNode }) {
  const mic = useMic();
  const [state, setState] = useState<RecState>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<TakeRecorder | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;

  useEffect(() => {
    if (state !== "recording" || !mic.stream) return;
    const tick = setInterval(() => {
      const s = (performance.now() - (rec.current?.startedAt ?? 0)) / 1000;
      setElapsed(s);
      if (s > 90) void stop();
    }, 200);
    onActive(true);
    return () => { clearInterval(tick); onActive(false); };
  }, [state, mic.stream]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setErr(null);
    const stream = mic.stream ?? (await mic.request());
    if (!stream) return;
    const r = new TakeRecorder(stream, (x) => { setState(x.state); if (x.error) setErr(x.error); });
    rec.current = r;
    try { await r.start(metaRef.current); setElapsed(0); } catch (e: any) { setState("error"); setErr(e.message); }
  };
  const stop = async () => {
    try { onSaved(await rec.current!.stop()); } catch (e: any) { setErr(e.message); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || e.repeat || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName)) return;
      e.preventDefault();
      if (state === "recording") void stop(); else if (state === "idle") void start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const recording = state === "recording";
  return (
    <div className={`prc-recwrap${recording ? " on" : ""}`}>
      {above}
      <div className="prc-recrow">
        <button className={`prc-rec${recording ? " on" : ""}`} onClick={() => void (recording ? stop() : start())} disabled={state === "saving"}
          aria-label={recording ? "Stop recording" : "Start recording"}><i aria-hidden="true" /></button>
        <div className="prc-rect" aria-live="polite">
          <b>{recording ? "Stop" : state === "saving" ? "Saving…" : "Record"}</b>
          <span>{recording ? `${clock(elapsed)} recording` : state === "saving" ? "Saving to your computer" : <>or press <kbd>Space</kbd></>}</span>
        </div>
        {aside}
      </div>
      {mic.error && <p className="prc-note warn" role="alert">{mic.error}</p>}
      {err && <p className="prc-note warn" role="alert">{err}</p>}
      {state === "error" && <button className="btn-secondary prc-retry" onClick={() => void rec.current!.retrySave().then(onSaved, (e) => setErr(e.message))}>Retry saving</button>}
    </div>
  );
}

const PlayIcon = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="1.5" width="2.4" height="9" rx=".8" fill="currentColor" /><rect x="7.1" y="1.5" width="2.4" height="9" rx=".8" fill="currentColor" /></svg>;
const BARS = 72;

/** Listen-back player: one play button and a bar waveform that fills as it plays. */
function ListenBack({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [bars, setBars] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    let live = true;
    void loadPeaks(src, BARS).then((p) => {
      if (!live || !p) return;
      const max = Math.max(0.01, ...Array.from(p));
      setBars(Array.from(p, (v) => 0.12 + 0.88 * (v / max)));
    });
    return () => { live = false; };
  }, [src]);
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); };
  return (
    <div className="prc-player">
      <button className="play-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play your recording"}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
      <div className="prc-wave" aria-hidden="true">
        {(bars.length ? bars : Array(BARS).fill(0.15)).map((h, i, arr) => <i key={i} className={i / arr.length < pos ? "on" : ""} style={{ transform: `scaleY(${h.toFixed(3)})` }} />)}
      </div>
      <audio ref={audio} src={src} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => { const a = e.currentTarget; if (isFinite(a.duration) && a.duration > 0) setPos(a.currentTime / a.duration); }} />
    </div>
  );
}

/** Progress through today's run: a thin bar per card. */
function Steps({ total, idx }: { total: number; idx: number }) {
  return (
    <span className="prc-steps">
      <span><span className="sr-only">Card </span>{idx + 1} of {total}</span>
      <span className="prc-bars" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => <i key={i} className={i < idx ? "done" : i === idx ? "now" : ""} />)}
      </span>
    </span>
  );
}

interface Result { item: DeckItem; rating: Rating; median: number | null }
type Phase = { k: "say"; retryOf: string | null } | { k: "rate"; take: Take } | { k: "end" } | { k: "hurt" };

/** The card runner: say it → listen back, see what was measured, rate → next. */
/** `first`: a card id picked from the room's stack. It moves to the front; the rest keep their order. */
export function DeckRun({ first }: { first?: string | null }) {
  const mic = useMic();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [band, setBand] = useState<[number, number] | null>(null);
  const [queue, setQueue] = useState<DeckItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>({ k: "say", retryOf: null });
  const [recOn, setRecOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [measured, setMeasured] = useState<Record<string, number | null>>({});
  const [comfort, setComfort] = useState<string | null>(null);
  const sayRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    Promise.all([api.deck(), api.deckSession(), api.profile()]).then(([d, s, p]) => {
      setDeck(d);
      setSession(s);
      setBand(p.comfort_range_hz);
      const left = d.items.filter((i) => !i.done_today);
      const pick = first ? left.findIndex((i) => i.card.id === first) : -1;
      setQueue(pick > 0 ? [left[pick], ...left.slice(0, pick), ...left.slice(pick + 1)] : left);
      if (d.paused) setPhase({ k: "hurt" });
      else if (!left.length) setPhase({ k: "end" });
    }, (e) => setErr(e.message));
  }, []);

  const item = queue[idx];
  useEffect(() => { sayRef.current?.focus({ preventScroll: true }); }, [idx, phase.k]);

  const rate = async (r: Rating | "ouch") => {
    if (phase.k !== "rate" || busy) return;
    setBusy(true);
    try {
      const res = await api.rateCard(item.card.id, phase.take.id, r);
      setDeck(res.deck);
      if (r === "ouch") { setPhase({ k: "hurt" }); return; }
      setResults((x) => [...x, { item, rating: r, median: measured[phase.take.id] ?? null }]);
      let q = queue;
      if (r === "again") {
        // Comes back at the end of today's run, with fresh interval previews.
        const fresh = res.deck.items.find((i) => i.card.id === item.card.id) ?? item;
        q = [...queue, { ...fresh, kind: "again", done_today: false }];
        setQueue(q);
      }
      if (idx + 1 < q.length) { setIdx(idx + 1); setPhase({ k: "say", retryOf: null }); }
      else setPhase({ k: "end" });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Keys 1–4 rate, like Anki.
  useEffect(() => {
    if (phase.k !== "rate") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) { e.preventDefault(); void rate(RATINGS[n - 1].r); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // The cat in the room follows along.
  useEffect(() => {
    const k = phase.k;
    setRoom({
      mode: recOn ? "watch" : k === "rate" ? "awake" : k === "end" ? "happy" : "sleep",
      say: k === "hurt" ? "take a break, sip some water" : k === "end" ? "all done! drink water :3" : recOn ? "i'm listening :3" : k === "rate" ? "let's listen :3" : "zzz… press record",
    });
  }, [phase.k, recOn]);

  if (err) return <div className="prc"><p role="alert" className="prc-note warn">{err}</p><button className="btn-secondary prc-done" onClick={() => go("/desk")}>Back to today</button></div>;
  if (!deck || !session) return <div className="prc" aria-busy="true"><p className="prc-sub">Getting your cards…</p></div>;

  const backToday = <button className="btn-primary prc-done" onClick={() => go("/desk")}>Back to today</button>;

  if (phase.k === "hurt") {
    return (
      <div className="prc prc-in" key="hurt">
        <h1 className="prc-title" tabIndex={-1} ref={sayRef}>Let's stop here</h1>
        <p className="prc-sub">That card is paused and so is your plan. Rest your voice: sip water, breathe, talk normally.</p>
        <p className="prc-tip">If discomfort lasts more than a couple of days, or speaking hurts, please check in with a GP or a speech and language therapist.</p>
        {backToday}
      </div>
    );
  }

  if (phase.k === "end") {
    const done = deck.items.filter((i) => i.done_today).length;
    const setFeel = async (c: string) => {
      setComfort(c);
      try { await api.patchSession(session.id, { comfort: { comfort: c }, complete: true }); } catch (e: any) { setErr(e.message); }
    };
    return (
      <div className="prc prc-in" key="end">
        <h1 className="prc-title" tabIndex={-1} ref={sayRef}>That's today's deck</h1>
        <p className="prc-sub">{done} card{done === 1 ? "" : "s"} practised{deck.next_due ? ` · next ones come back ${friendlyDate(deck.next_due, deck.local_date)}` : ""}.</p>
        {results.length > 0 && (
          <ol className="prc-summary" aria-label="How today went">
            {results.map((r, i) => (
              <li key={i}>
                <span className="front">{r.item.card.front}</span>
                <span className="pitch">{r.median ? `${Math.round(r.median)} Hz · ${noteName(r.median)}` : "–"}</span>
                <span className={`prc-pill ${r.rating}`}>{RATINGS.find((x) => x.r === r.rating)?.label ?? r.rating}</span>
              </li>
            ))}
          </ol>
        )}
        {comfort ? (
          <p className="prc-note ok" role="status">{comfort === "strain" || comfort === "pain" ? "Noted. Your plan is paused so you can rest." : "Noted. See you tomorrow."}</p>
        ) : (
          <>
            <p className="prc-q" id="voice-q">How does your voice feel now?</p>
            <div className="prc-feel" role="group" aria-labelledby="voice-q">
              <button onClick={() => void setFeel("comfortable")}>Comfortable</button>
              <button onClick={() => void setFeel("some_effort")}>A bit tired</button>
              <button className="hurt" onClick={() => void setFeel("strain")}>Strained</button>
              <button className="hurt" onClick={() => void setFeel("pain")}>It hurts</button>
            </div>
          </>
        )}
        <div className="prc-foot">
          {backToday}
          <span className="prc-more">
            <a className="prc-link" href="#/history">See it in your log</a>
            <a className="prc-link" href="#/progress">Progress</a>
          </span>
        </div>
      </div>
    );
  }

  const meta: TakeMeta = {
    session_id: session.id,
    role: phase.k === "say" && phase.retryOf ? "retry" : item.card.kind === "reference" ? "reference" : item.card.kind === "exercise" ? "exercise" : "free",
    prompt_id: item.card.prompt_id,
    prompt_text: item.card.front,
    exercise_id: item.card.exercise_id,
    exercise_version: item.card.exercise_version,
    retry_of: phase.k === "say" ? phase.retryOf : null,
  };

  const rating = phase.k === "rate";
  const head = (
    <>
      <div className="prc-top">
        <p className="prc-kind">
          {deckName(item)}
          {(item.kind === "new" || item.kind === "again") && <span className={`prc-pill ${item.kind}`}>{item.kind === "new" ? "New card" : "Again"}</span>}
        </p>
        <Steps total={queue.length} idx={idx} />
      </div>
      <h1 className="prc-phrase" tabIndex={-1} ref={sayRef}><SayText text={item.card.front} /></h1>
      {item.card.hint && <p className="prc-tip">{item.card.hint}</p>}
    </>
  );

  if (phase.k === "say") {
    return (
      <div className={`prc${recOn ? " recording" : ""}`}>
        {head}
        <CardRecorder key={`${item.card.id}-${idx}-${phase.retryOf ?? ""}`} meta={meta} onSaved={(t) => setPhase({ k: "rate", take: t })} onActive={setRecOn}
          above={recOn && <LivePitchMeter stream={mic.stream} active={recOn} band={band} />}
          aside={!recOn && <button className="prc-link ouch" onClick={() => void api.rateCard(item.card.id, null, "ouch").then(() => setPhase({ k: "hurt" }), (e) => setErr(e.message))}>Stop, my voice hurts</button>} />
      </div>
    );
  }

  const take = phase.take;
  return (
    <div className={`prc${rating ? " rating" : ""}`}>
      {head}
      <div className="prc-in" key={take.id}>
        <ListenBack src={take.audio_url} />
        <TakeResult key={take.id} take={take} band={band} onMeasured={(m: Measured) => setMeasured((x) => ({ ...x, [take.id]: m.median }))} />
        <p className="prc-q" id="feel-q">How did that feel?</p>
        <div className="vc-rate prc-rate" role="group" aria-labelledby="feel-q">
          {RATINGS.map((r, i) => (
            <button key={r.r} onClick={() => void rate(r.r)} disabled={busy} aria-keyshortcuts={String(i + 1)}
              aria-label={`${r.label}, next ${item.preview[r.r]}`}>
              <span className="l">{r.label}<kbd aria-hidden="true">{i + 1}</kbd></span>
              <small>{item.preview[r.r] === "later today" ? "in a few minutes" : item.preview[r.r]}</small>
            </button>
          ))}
        </div>
        <div className="prc-links">
          <button className="prc-link" onClick={() => setPhase({ k: "say", retryOf: take.id })} disabled={busy}>Record it again</button>
          <button className="prc-link ouch" onClick={() => void rate("ouch")} disabled={busy}>It hurt or felt strained</button>
        </div>
        <p className="prc-cap">Your own judgement, not a score. Pitch numbers never decide this.</p>
      </div>
    </div>
  );
}
