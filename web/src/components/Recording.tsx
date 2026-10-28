import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Take } from "../api";
import { closeDelayLine, delayedStream, levelMeter, openMic, RecState, TakeMeta, TakeRecorder, wakeDelayLines } from "../recorder";
import { Callout, StatusBadge } from "./bits";
import { LiveReadout, useLivePitch } from "./LivePitch";

interface MicCtx {
  stream: MediaStream | null;
  error: string | null;
  request: (deviceId?: string) => Promise<MediaStream | null>;
  devices: MediaDeviceInfo[];
  deviceId: string | undefined;
  release: () => void;
}

const Ctx = createContext<MicCtx | null>(null);

export function MicProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(() => {
    try { return localStorage.getItem("lilt.mic") ?? undefined; } catch { return undefined; }
  });

  const request = useCallback(async (id?: string) => {
    try {
      if (stream) closeDelayLine(stream);
      stream?.getTracks().forEach((t) => t.stop());
      const s = await openMic(id ?? deviceId);
      delayedStream(s); // start the half-second pre-roll now, so the first take has it too
      setStream(s);
      setError(null);
      const chosen = s.getAudioTracks()[0]?.getSettings().deviceId;
      if (chosen) { setDeviceId(chosen); try { localStorage.setItem("lilt.mic", chosen); } catch { /* ignore */ } }
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput"));
      return s;
    } catch (e: any) {
      const name = e?.name;
      setError(
        name === "NotAllowedError" ? "Microphone access was blocked. Allow the microphone for this page in your browser's site settings, then try again."
        : name === "NotFoundError" || name === "OverconstrainedError" ? "No microphone was found. Connect one, or pick another input."
        : name === "NotReadableError" ? "The microphone is busy in another app. Close it there and try again."
        : e?.message ?? "Couldn't open the microphone."
      );
      return null;
    }
  }, [stream, deviceId]);

  // Any click or key wakes the pre-roll, so it's already filling when you press Record.
  useEffect(() => {
    const wake = () => wakeDelayLines();
    window.addEventListener("pointerdown", wake, true);
    window.addEventListener("keydown", wake, true);
    return () => { window.removeEventListener("pointerdown", wake, true); window.removeEventListener("keydown", wake, true); };
  }, []);

  const release = useCallback(() => {
    if (stream) closeDelayLine(stream);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  return <Ctx.Provider value={{ stream, error, request, devices, deviceId, release }}>{children}</Ctx.Provider>;
}

export function useMic() {
  return useContext(Ctx)!;
}

/** Step 1 of a session: confirm the microphone works and the level is usable. */
export function MicCheck({ onReady }: { onReady: () => void }) {
  const mic = useMic();
  const [rms, setRms] = useState(0);
  const [peakHold, setPeakHold] = useState(0);
  const [heard, setHeard] = useState(false);

  useEffect(() => {
    if (!mic.stream) return;
    return levelMeter(mic.stream, (r, p) => {
      setRms(r);
      setPeakHold((h) => Math.max(p, h * 0.97));
      if (r > 0.01) setHeard(true);
    });
  }, [mic.stream]);

  const pct = Math.min(100, Math.round(Math.sqrt(rms) * 220));
  const tooHot = peakHold > 0.98;

  // Twenty segments; the last ones are the "too loud" zone.
  const segs = Array.from({ length: 20 }, (_, k) => k < Math.round(pct / 5));
  return (
    <section className="vmic">
      <h2 className="vh">Microphone check</h2>
      {!mic.stream && !mic.error && <p className="vtip">Lilt records in this browser and saves to your own computer. Nothing is sent anywhere else.</p>}
      {mic.error && <Callout kind="warn"><p>{mic.error}</p></Callout>}
      {mic.stream && (
        <div className="vlive vmic-panel">
          <div className="vlive-top">
            <b>Input level</b>
            <span>Say a few words at your usual volume.</span>
          </div>
          <div className="levelbar" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            {segs.map((on, k) => <i key={k} className={on ? (k >= 17 ? "hot" : k >= 13 ? "warm" : "on") : ""} />)}
          </div>
          <p className={`vmic-state${tooHot ? " hot" : heard ? " ok" : ""}`} aria-live="polite">
            {tooHot ? "Too loud: move back a little" : heard ? "Level looks usable" : "Waiting to hear you…"}
          </p>
        </div>
      )}
      <div className="vactions">
        {!mic.stream && !mic.error && <button className="btn-primary btn-big" onClick={() => void mic.request()}>Turn on microphone</button>}
        {mic.error && <button className="btn-secondary" onClick={() => void mic.request()}>Try again</button>}
        {mic.stream && <button className="btn-primary btn-big" onClick={onReady} disabled={!heard}>Sounds good, continue</button>}
        {mic.stream && !heard && <button className="btn-ghost" onClick={onReady}>Continue anyway</button>}
      </div>
      {mic.stream && mic.devices.length > 1 && (
        <div className="vmic-select">
          <label htmlFor="mic-select">Microphone</label>
          <select id="mic-select" value={mic.deviceId} onChange={(e) => void mic.request(e.target.value)}>
            {mic.devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
          </select>
        </div>
      )}
      {mic.stream && <p className="vcap">Keep the same microphone and distance from day to day, so recordings stay comparable.</p>}
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
export function RecordPanel({ meta, onSaved, hint, maxSeconds = 120, live = true, band, steadiness, onStateChange, title, cue, screen, keys, knob }: {
  meta: TakeMeta; onSaved: (t: Take) => void; hint?: string; maxSeconds?: number;
  /** Show the live pitch line while recording (display only). */
  live?: boolean; band?: [number, number] | null; steadiness?: boolean;
  onStateChange?: (s: RecState) => void;
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
  const rec = useRef<TakeRecorder | null>(null);
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
      if (s > maxSeconds) void stop();
    }, 200);
    return () => clearInterval(id);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setErr(null);
    const stream = mic.stream ?? (await mic.request());
    if (!stream) return;
    const r = new TakeRecorder(stream, (x) => { setState(x.state); onStateChange?.(x.state); if (x.error) setErr(x.error); });
    rec.current = r;
    try {
      await r.start(lastMeta.current);
      setElapsed(0);
    } catch (e: any) {
      setState("error");
      setErr(e.message);
    }
  };

  const stop = async () => {
    try {
      const take = await rec.current!.stop();
      onSaved(take);
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
    <div ref={root} className={`vrec${recording ? " is-rec" : ""}`}>
      {title && <p className={screen ? "vrec-title" : "vphrase"}>{sentence(title)}</p>}
      {screen?.(recording)}
      {cue && <p className="vtip">{sentence(cue)}</p>}
      {live && (
        <div className="vlive">
          {recording && heard
            ? <LiveReadout points={points} band={band} showSteadiness={steadiness} />
            : <div className="vlive-top"><b>Live pitch</b><span>{recording ? "listening…" : "starts when you record"}</span></div>}
          <LiveLine points={points} active={recording} />
        </div>
      )}
      {!live && steadiness && recording && <div className="vlive"><LiveReadout points={points} showSteadiness /></div>}
      <div className="vrecrow">
        {recording ? (
          <button className="rec-btn stop" onClick={() => void stop()} aria-label="Stop recording"><span className="dot" aria-hidden="true" /></button>
        ) : (
          <button className="rec-btn" onClick={() => void start()} disabled={state === "saving"} aria-label="Start recording"><span className="dot" aria-hidden="true" /></button>
        )}
        <div className="vrec-t">
          <b aria-hidden="true">{recording ? "Stop" : state === "saving" ? "Saving" : "Record"}</b>
          {state === "idle"
            ? (hint ? <span>{hint}</span> : <span className="vkbd">or press <kbd>Space</kbd></span>)
            : <span className="vrec-st"><StatusBadge status={state === "error" ? "error" : state} />{recording && <span className="vclock">{clock(elapsed)}</span>}</span>}
        </div>
        {(knob || keys) && (
          <div className="vkeys">
            {knob && <button className="btn-secondary" onClick={knob.onTurn} disabled={recording}>{sentence(knob.label)}</button>}
            {keys}
          </div>
        )}
      </div>
      {err && <Callout kind="warn"><p>{err}</p></Callout>}
      {state === "error" && <button className="btn-secondary" onClick={() => void rec.current!.retrySave().then(onSaved, (e) => setErr(e.message))}>Retry saving</button>}
    </div>
  );
}
