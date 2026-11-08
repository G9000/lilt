import { cx } from "../ui/cx";
import { shared } from "../ui/shared";
import { practice } from "../ui/practice";
import { useEffect, useRef, useState } from "react";
import { Take } from "../api";
import { judgeRoom, Room } from "../noise";
import { levelMeter, RecState, TakeMeta, TakeRecorder } from "../recorder";
import { Callout, StatusBadge } from "./bits";
import { LiveReadout, useLivePitch } from "./LivePitch";

export { MicProvider, useMic } from "./Microphone";
import { useMic } from "./Microphone";
import { cappedNote, limitNote, TAKE_MAX_S } from "../takeLimit";

/** How long the room is listened to, quietly, before you're asked to speak. */
const QUIET_MS = 2000;
/** Your voice is judged on the last few seconds of levels (about 60 a second), so it follows a closed window. */
const KEEP_HEARD = 300;

/**
 * Step 1 of a session: confirm the microphone works and the level is usable. It opens with a quiet
 * moment to hear the room, and says so (calmly, without holding you up) if background sound is close
 * enough to your voice to throw off pitch readings.
 */
export function MicCheck({ onReady }: { onReady: () => void }) {
  const mic = useMic();
  const [rms, setRms] = useState(0);
  const [peakHold, setPeakHold] = useState(0);
  const [heard, setHeard] = useState(false);
  const [quietMoment, setQuietMoment] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [round, setRound] = useState(0); // "Listen to the room again" starts a new quiet moment

  useEffect(() => {
    if (!mic.stream) return;
    const until = performance.now() + QUIET_MS, quiet: number[] = [], voice: number[] = [];
    let n = 0;
    setQuietMoment(true);
    setRoom(null);
    return levelMeter(mic.stream, (r, p) => {
      setRms(r);
      setPeakHold((h) => Math.max(p, h * 0.97));
      if (r > 0.01) setHeard(true);
      if (performance.now() < until) { quiet.push(r); return; }
      setQuietMoment(false);
      voice.push(r);
      if (voice.length > KEEP_HEARD) voice.shift();
      // A few times a second is plenty, and only a change of answer re-renders.
      if (++n % 15 === 0) {
        const now = judgeRoom(quiet, voice);
        if (now) setRoom((was) => (was?.noisy === now.noisy ? was : now));
      }
    });
  }, [mic.stream, round]);

  const pct = Math.min(100, Math.round(Math.sqrt(rms) * 220));
  const tooHot = peakHold > 0.98;

  // Twenty segments; the last ones are the "too loud" zone.
  const segs = Array.from({ length: 20 }, (_, k) => k < Math.round(pct / 5));
  return (
    <section className={cx("vmic", practice["vmic"])}>
      <h2 className={cx("vh", practice["vh"])}>Microphone check</h2>
      {!mic.stream && !mic.error && <p className={cx("vtip", practice["vtip"])}>Lilt records in this browser and saves to your own computer. Nothing is sent anywhere else.</p>}
      {mic.error && <Callout kind="warn"><p>{mic.error}</p></Callout>}
      {mic.stream && (
        <div className={cx("vlive vmic-panel", practice["vlive"])}>
          <div className={cx("vlive-top", practice["vlive-top"])}>
            <b>Input level</b>
            <span>{quietMoment ? "Stay quiet for a moment while Lilt listens to the room…" : "Say a few words at your usual volume."}</span>
          </div>
          <div className="levelbar" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            {segs.map((on, k) => <i key={k} className={on ? (k >= 17 ? "hot" : k >= 13 ? "warm" : "on") : ""} />)}
          </div>
          <p className={cx(`vmic-state${tooHot ? " hot" : heard ? " ok" : ""}`, practice["vmic-state"])} aria-live="polite">
            {tooHot ? "Too loud: move back a little" : heard ? "Level looks usable" : "Waiting to hear you…"}
          </p>
          {room?.noisy && (
            <div className={cx("vmic-noise", practice["vmic-noise"])} role="status">
              <p><b>There's some background sound.</b> In a noisy room, pitch readings can wander. If you can, close a window, turn off a fan, or move a little closer to the mic.</p>
              <button className={cx("textlink", shared["textlink"])} onClick={() => setRound((k) => k + 1)}>Listen to the room again</button>
            </div>
          )}
        </div>
      )}
      <div className={cx("vactions", practice["vactions"])}>
        {!mic.stream && !mic.error && <button className={cx("btn-primary btn-big", shared["btn-primary"], shared["btn-big"])} onClick={() => void mic.request()}>Turn on microphone</button>}
        {mic.error && <button className={cx("btn-secondary", shared["btn-secondary"])} onClick={() => void mic.request()}>Try again</button>}
        {mic.stream && <button className={cx("btn-primary btn-big", shared["btn-primary"], shared["btn-big"])} onClick={onReady} disabled={!heard}>Sounds good, continue</button>}
        {mic.stream && !heard && <button className={cx("btn-ghost", shared["btn-ghost"])} onClick={onReady}>Continue anyway</button>}
      </div>
      {mic.stream && mic.devices.length > 1 && (
        <div className={cx("vmic-select", practice["vmic-select"])}>
          <label htmlFor="mic-select">Microphone</label>
          <select id="mic-select" value={mic.deviceId} onChange={(e) => void mic.request(e.target.value)}>
            {mic.devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
          </select>
        </div>
      )}
      {mic.stream && <p className={cx("vcap", practice["vcap"])}>Keep the same microphone and distance from day to day, so recordings stay comparable.</p>}
    </section>
  );
}

/** Live pitch as one thin accent line (last few seconds), centred on the voice's own middle. */
function LiveLine({ points, active }: { points: { t: number; hz: number | null }[]; active: boolean }) {
  const W = 600, H = 64, span = 4;
  const guide = <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />;
  if (!active || points.length < 2) {
    return <svg className="vline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">{guide}</svg>;
  }
  const tEnd = points[points.length - 1].t;
  const win = points.filter((p) => p.t >= tEnd - span);
  const voiced = win.filter((p) => p.hz) as { t: number; hz: number }[];
  const st = (hz: number) => 12 * Math.log2(hz);
  const mid = voiced.length ? voiced.map((p) => st(p.hz)).sort((a, b) => a - b)[Math.floor(voiced.length / 2)] : 0;
  let d = "", prev: number | null = null;
  for (const p of win) {
    if (!p.hz) { prev = null; continue; }
    const x = ((p.t - (tEnd - span)) / span) * W;
    const y = H / 2 - Math.max(-H / 2 + 4, Math.min(H / 2 - 4, (st(p.hz) - mid) * 4));
    d += `${prev === null ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    prev = x;
  }
  return (
    <svg className="vline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {guide}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const sentence = (s: string) => s.replace(/^\s*(cue:\s*)?/i, (_m, c) => (c ? "Cue: " : "")).replace(/^./, (c) => c.toUpperCase());

/** The record surface: what to say, a live pitch line, and one record button.
 *  "Saved" appears only after the server confirms. */
export function RecordPanel({ meta, onSaved, hint, maxSeconds = TAKE_MAX_S, live = true, band, steadiness, onStateChange, onBusyChange, title, cue, screen, keys, knob }: {
  meta: TakeMeta; onSaved: (t: Take) => void; hint?: string; maxSeconds?: number;
  /** Show the live pitch line while recording (display only). */
  live?: boolean; band?: [number, number] | null; steadiness?: boolean;
  onStateChange?: (s: RecState) => void;
  /** Includes microphone permission and failed uploads awaiting a retry. */
  onBusyChange?: (busy: boolean) => void;
  /** Kept for callers; the window toolbar and page heading already say where you are. */
  label?: string;
  /** The line to say, when there is no `screen`. */
  title?: string; cue?: string;
  /** Extra content above the controls (e.g. the read-along text); receives whether we're recording. */
  screen?: (recording: boolean) => React.ReactNode;
  keys?: React.ReactNode;
  knob?: { label: string; onTurn: () => void };
}) {
  const mic = useMic();
  const [state, setState] = useState<RecState>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [capped, setCapped] = useState(false);
  const rec = useRef<TakeRecorder | null>(null);
  const starting = useRef(false);
  const [requesting, setRequesting] = useState(false);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (rec.current?.state === "recording") void rec.current.stop().catch(() => {});
    };
  }, []);
  const root = useRef<HTMLDivElement>(null);
  const lastMeta = useRef(meta);
  lastMeta.current = meta;

  useEffect(() => {
    if (state !== "recording") return;
    // Keep the line, the pitch and Stop in view while recording (phones, long pages).
    // Only the window's own scroller moves (scrollIntoView would also shift the desktop behind it).
    const el = root.current, box = el?.closest(".ds-body");
    if (el && box) {
      const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      const by = r.bottom > b.bottom ? Math.min(r.bottom - b.bottom + 16, r.top - b.top - 8) : r.top < b.top ? r.top - b.top - 8 : 0;
      const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (by) box.scrollBy({ top: by, behavior: calm ? "auto" : "smooth" });
    }
    const id = setInterval(() => {
      const s = (performance.now() - (rec.current?.startedAt ?? 0)) / 1000;
      setElapsed(s);
      if (s > maxSeconds) { setCapped(true); void stop(); }
    }, 200);
    return () => clearInterval(id);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    if (root.current?.closest("fieldset:disabled") || starting.current || rec.current?.state === "saving" || (rec.current?.state === "error" && rec.current.onServer)) return;
    starting.current = true;
    setRequesting(true);
    busyCallback.current?.(true);
    try {
      setErr(null); setCapped(false);
      const stream = mic.stream ?? (await mic.request());
      if (!stream || !mounted.current) return;
      const r = new TakeRecorder(stream, (x) => { setState(x.state); onStateChange?.(x.state); if (x.error) setErr(x.error); });
      rec.current = r;
      await r.start(lastMeta.current);
      if (!mounted.current) { if (r.state === "recording") await r.stop(); return; }
      setElapsed(0);
    } catch (e: any) {
      // Capture never began; keep Record available after a refused or failed start.
      rec.current = null;
      setState("idle");
      setErr(e.message);
    } finally {
      starting.current = false;
      if (mounted.current) {
        setRequesting(false);
        const current = rec.current;
        busyCallback.current?.(!!current && (current.state === "recording" || current.state === "saving" || (current.state === "error" && current.onServer)));
      }
    }
  };

  const stop = async () => {
    try {
      const take = await rec.current!.stop();
      onSaved(take);
      busyCallback.current?.(false);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const recording = state === "recording";
  const points = useLivePitch(mic.stream, live && recording);

  // Space starts/stops recording unless typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || e.repeat || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName) || el.isContentEditable) return;
      e.preventDefault();
      if (state === "recording") void stop();
      else if (state === "idle" || state === "saved") void start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const heard = points.some((p) => p.hz);
  return (
    <div ref={root} className={cx(`vrec${recording ? " is-rec" : ""}`, practice["vrec"])}>
      {title && <p className={cx(screen ? "vrec-title" : "vphrase", practice["vphrase"], practice["vrec-title"])}>{sentence(title)}</p>}
      {screen?.(recording)}
      {cue && <p className={cx("vtip", practice["vtip"])}>{sentence(cue)}</p>}
      {live && (
        <div className={cx("vlive", practice["vlive"])}>
          {recording && heard
            ? <LiveReadout points={points} band={band} showSteadiness={steadiness} />
            : <div className={cx("vlive-top", practice["vlive-top"])}><b>Live pitch</b><span>{recording ? "listening…" : "starts when you record"}</span></div>}
          <LiveLine points={points} active={recording} />
        </div>
      )}
      {!live && steadiness && recording && <div className={cx("vlive", practice["vlive"])}><LiveReadout points={points} showSteadiness /></div>}
      <div className={cx("vrecrow", practice["vrecrow"])}>
        {recording ? (
          <button className={cx("rec-btn stop", shared["rec-btn"])} onClick={() => void stop()} aria-label="Stop recording"><span className={cx("dot", shared["dot"])} aria-hidden="true" /></button>
        ) : (
          <button className={cx("rec-btn", shared["rec-btn"])} onClick={() => void start()} disabled={requesting || state === "saving" || (state === "error" && rec.current?.onServer)} aria-label="Start recording"><span className={cx("dot", shared["dot"])} aria-hidden="true" /></button>
        )}
        <div className={cx("vrec-t", practice["vrec-t"])}>
          <b aria-hidden="true">{recording ? "Stop" : state === "saving" ? "Saving" : "Record"}</b>
          {state === "idle"
            ? (hint ? <span>{hint}</span> : <span className={cx("vkbd", practice["vkbd"])}>or press <kbd>Space</kbd></span>)
            : <span className={cx("vrec-st", practice["vrec-st"])}><StatusBadge status={state === "error" ? "error" : state} />{recording && <span className={cx("vclock", practice["vclock"])}>{clock(elapsed)}</span>}{recording && limitNote(elapsed, maxSeconds) && <span className={cx("vclock", practice["vclock"])}>{limitNote(elapsed, maxSeconds)}</span>}{capped && !recording && <span className={cx("vclock", practice["vclock"])} role="status">{cappedNote(maxSeconds)}</span>}</span>}
        </div>
        {(knob || keys) && (
          <div className={cx("vkeys", practice["vkeys"])}>
            {knob && <button className={cx("btn-secondary", shared["btn-secondary"])} onClick={knob.onTurn} disabled={recording}>{sentence(knob.label)}</button>}
            {keys}
          </div>
        )}
      </div>
      {err && <Callout kind="warn"><p>{err}</p></Callout>}
      {state === "error" && rec.current?.onServer && <button className={cx("btn-secondary", shared["btn-secondary"])} onClick={() => void rec.current!.retrySave().then(take => { onSaved(take); busyCallback.current?.(false); }, (e) => setErr(e.message))}>Retry saving</button>}
    </div>
  );
}
