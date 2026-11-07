import { roomStyles } from "../desk/roomStyles";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api, Profile } from "../api";
import { go } from "../App";
import { useMic } from "../components/Recording";
import { Art, Illustration, wash } from "../components/Illustrations";
import { claimMic } from "../micuse";
import { LOOP_WOOL, paintLights, paintLoop, paintRangeMark, paintThread, paintYarnBall, paintYarnCat, paintYarnRoom } from "../yarn-art";
import { artReady, loadYarnArt, type YarnArt } from "../yarn-assets";
import { ContourPoint, noteName, trackLiveFine } from "../pitch";
import {
  breakDue, catReaction, cueDue, describePlay, follower, HUM_READINGS, lineUp, Loop, loopMaker, Mode, nextLoop, noisyRoom, passLoops, playRange,
  rangeFromHums, rangeWords, REST_Y, saidIt, sentencesFrom, SENTENCES, uToHz, uToY, wind,
} from "../yarn";

/**
 * Ball of yarn: a calm voice game. Your pitch lifts a ball of yarn across an evening room, the cat
 * padding after it; loops of yarn drift by to thread it through, if you like. Hum, lip trill, or
 * say everyday sentences. It plays in your own comfortable range (or a quick two-hum calibration),
 * pauses for a breath every couple of minutes, and stops the moment anything hurts. Nothing is
 * recorded, saved or scored. The rules live in yarn.ts; this file draws them.
 */

const HURT = "It hurts or feels strained";
const TRILL = "Lip trill: lips loosely together, blow gently so they flutter, and let your voice ride on the “brrr”.";
type Phase = "setup" | "calibrate" | "play" | "hurt" | "summary";

const readPref = <T extends string>(key: string, ok: T[], fallback: T): T => {
  try { const v = localStorage.getItem(key) as T | null; return v && ok.includes(v) ? v : fallback; } catch { return fallback; }
};
const writePref = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* private mode */ } };

// Keep the canvas in sync even when the system preference changes during play.
function useYarnReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    change();
    return () => query.removeEventListener('change', change);
  }, []);
  return reduced;
}

export function YarnPage() {
  const mic = useMic();
  const reduced = useYarnReducedMotion();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  // the range the game plays in: yours from the profile, or one found here
  const [band, setBand] = useState<[number, number] | null>(null);
  const [sentences, setSentences] = useState<string[]>(SENTENCES);
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setModeState] = useState<Mode>(() => readPref<Mode>("lilt.yarn.mode", ["hum", "speak"], "hum"));
  const [cue, setCueState] = useState(() => readPref("lilt.yarn.cue", ["on", "off"], "on") === "on");
  const [free, setFree] = useState(() => readPref("lilt.yarn.free", ["on", "off"], "off") === "on");
  const [summary, setSummary] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const setMode = (m: Mode) => { setModeState(m); writePref("lilt.yarn.mode", m); };
  const setCue = (on: boolean) => { setCueState(on); writePref("lilt.yarn.cue", on ? "on" : "off"); };
  const tones = useTones();

  useEffect(() => {
    void api.profile().then((p) => { setProfile(p); if (p.comfort_range_hz) setBand(p.comfort_range_hz); }, () => {}).finally(() => setLoaded(true));
    void api.texts().then((t) => setSentences(sentencesFrom(t.levels)), () => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.metaKey || e.ctrlKey || e.altKey) return;
      go("/desk");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openMic = async () => mic.stream ?? (await mic.request());
  const start = async (next: "play" | "calibrate") => {
    tones.wake(); // a click is here: let Lilt make a sound later
    setStarting(true);
    const s = await openMic();
    setStarting(false);
    if (s) setPhase(next);
  };
  const range = useMemo(() => (band ? playRange(band) : null), [band]);

  return (
    <div className={["yn", roomStyles["yn"]].join(" ")}>
      <header className={["yn-top", roomStyles["yn-top"]].join(" ")}>
        <button className={["yn-close", roomStyles["yn-close"]].join(" ")} onClick={() => go("/desk")} aria-label="Close Yarn" title="Close (Esc)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div className={["yn-name", roomStyles["yn-name"]].join(" ")}>
          <b>Ball of yarn</b>
          <small>{phase === "play" ? `${mode === "hum" ? "Humming" : "Speaking"}${range ? ` · ${noteName(range[0])} to ${noteName(range[1])}` : ""}` : "A gentle voice game"}</small>
        </div>
      </header>

      {phase === "play" && range ? (
        <Play range={range} mode={mode} free={free} cue={cue && !free} sentences={sentences} stream={mic.stream} reduced={reduced} tone={tones.play}
          onHurt={() => setPhase("hurt")} onStop={(lines) => { setSummary(lines); setPhase("summary"); }} />
      ) : (
        <main className={[`yn-stage${phase === "setup" ? " yn-setup" : ""}`, roomStyles["yn-stage"], phase === "setup" ? roomStyles["yn-setup"] : ""].join(" ")}>
          <Scene range={phase === "setup" ? range : null} reduced={reduced} preview={phase === "setup"} />
          {phase === "setup" && <div className={["yn-intro", roomStyles["yn-intro"]].join(" ")}>
            <h1>A little room to play</h1>
            <p>Lift the yarn with your voice.<br />The cat will keep you company.</p>
          </div>}
          <div className={["yn-over", roomStyles["yn-over"]].join(" ")}>
            <AnimatePresence mode="wait" initial={false}>
              {phase === "setup" ? (
                <Card key="setup" art="yarn" chip="Play" setup>
                  <h2 className={["yn-title", roomStyles["yn-title"]].join(" ")}>Play at your own pace</h2>
                  <p className={["yn-p", roomStyles["yn-p"]].join(" ")}>Higher lifts the yarn; lower lets it drift down. Your curious little companion follows along. Nothing is counted.</p>
                  <div className={["yn-modes", roomStyles["yn-modes"]].join(" ")} role="radiogroup" aria-label="How to play">
                    <ModeButton on={mode === "hum"} onClick={() => setMode("hum")} title="Hum or lip trill" body="Easy on the throat; good for breath" />
                    <ModeButton on={mode === "speak"} onClick={() => setMode("speak")} title="Speak sentences" body="Everyday lines, real speech" />
                  </div>
                  <details className={["yn-help", roomStyles["yn-help"]].join(" ")}><summary>How to play</summary>
                    <p className={["yn-how", roomStyles["yn-how"]].join(" ")}>{mode === "hum" ? TRILL : "A short line shows at the top. Say it in your everyday voice; the yarn follows the tune of it and waits between words."}</p>
                    <p className={["yn-foot", roomStyles["yn-foot"]].join(" ")}>Stay comfortable. Stop if anything hurts or feels strained.</p>
                  </details>
                  {!loaded ? <p className={["yn-quiet", roomStyles["yn-quiet"]].join(" ")}>Getting your range…</p> : range ? (
                    <div className={["yn-range", roomStyles["yn-range"]].join(" ")}>
                      <span>Your range: <b>{rangeWords(range)}</b></span>
                      <button className={["yn-link", roomStyles["yn-link"]].join(" ")} onClick={() => { tones.wake(); tones.play(range[0], 0); tones.play(range[1], 1); }}>Hear low and high</button>
                      <button className={["yn-link", roomStyles["yn-link"]].join(" ")} onClick={() => void start("calibrate")}>Find it again</button>
                    </div>
                  ) : (
                    <p className={["yn-range", roomStyles["yn-range"]].join(" ")}>First, two easy hums to find your range: a comfortable low one and a comfortable high one.</p>
                  )}
                  <label className={["yn-check", roomStyles["yn-check"]].join(" ")}>
                    <input type="checkbox" checked={free} onChange={(e) => { setFree(e.target.checked); writePref("lilt.yarn.free", e.target.checked ? "on" : "off"); }} />
                    Free play · just you, the yarn and the cat
                  </label>
                  {!free && <label className={["yn-check", roomStyles["yn-check"]].join(" ")}>
                    <input type="checkbox" checked={cue} onChange={(e) => setCue(e.target.checked)} />
                    Play each loop&rsquo;s note when you pause
                  </label>}
                  {mic.error && <p className={["yn-err", roomStyles["yn-err"]].join(" ")} role="alert">{mic.error}</p>}
                  <div className={["yn-row", roomStyles["yn-row"]].join(" ")}>
                    <button className={["yn-primary", roomStyles["yn-primary"]].join(" ")} disabled={!loaded || starting} onClick={() => void start(range ? "play" : "calibrate")}>
                      {range ? "Start playing" : "Find my range"}
                    </button>
                  </div>
                  <p className={["yn-foot", roomStyles["yn-foot"]].join(" ")}>Somewhere quiet works best. Nothing is recorded or saved. A breathing break comes every couple of minutes.</p>
                </Card>
              ) : phase === "calibrate" ? (
                <Calibrate key="cal" stream={mic.stream} canSave={!!profile} reduced={reduced}
                  onUse={async (r, save) => {
                    if (save && profile) {
                      try { const p = await api.saveProfile({ ...profile, comfort_range_hz: r }); setProfile(p); } catch { /* still plays with it */ }
                    }
                    setBand(r);
                    setPhase("setup");
                  }}
                  onCancel={() => setPhase("setup")} />
              ) : phase === "hurt" ? (
                <Card key="hurt" art="tea" chip="Resting">
                  <h2 className={["yn-title", roomStyles["yn-title"]].join(" ")}>Let&rsquo;s stop here</h2>
                  <p className={["yn-p", roomStyles["yn-p"]].join(" ")}>Sip water, breathe, talk normally. If discomfort lasts more than a couple of days, or speaking hurts, please check in with a GP or a speech and language therapist.</p>
                  <div className={["yn-row", roomStyles["yn-row"]].join(" ")}>
                    <button className={["yn-primary", roomStyles["yn-primary"]].join(" ")} onClick={() => go("/")}>Back to the room</button>
                    <button className={["yn-ghost", roomStyles["yn-ghost"]].join(" ")} onClick={() => setPhase("setup")}>I feel fine, carry on</button>
                  </div>
                </Card>
              ) : (
                <Card key="summary" art="yarn" chip="All wound up">
                  <h2 className={["yn-title", roomStyles["yn-title"]].join(" ")}>The cat&rsquo;s curled up with the yarn</h2>
                  <div className={["yn-p", roomStyles["yn-p"]].join(" ")}>{summary.map((l) => <p key={l}>{l}</p>)}</div>
                  <div className={["yn-row", roomStyles["yn-row"]].join(" ")}>
                    <button className={["yn-primary", roomStyles["yn-primary"]].join(" ")} onClick={() => void start("play")}>Play again</button>
                    <button className={["yn-ghost", roomStyles["yn-ghost"]].join(" ")} onClick={() => go("/desk")}>Back to the desk</button>
                  </div>
                </Card>
              )}
            </AnimatePresence>
          </div>
        </main>
      )}
    </div>
  );
}

function ModeButton({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button role="radio" aria-checked={on} tabIndex={on ? 0 : -1} className={[`yn-mode${on ? " on" : ""}`, roomStyles["yn-mode"]].join(" ")} onClick={onClick}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const choices = [...e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
        const next = e.key === "Home" ? choices[0] : e.key === "End" ? choices[choices.length - 1] : choices.find((el) => el !== e.currentTarget);
        next?.focus(); next?.click();
      }}>
      <b>{title}</b><span>{body}</span>
    </button>
  );
}

function Card({ art, chip, children, setup = false }: { art: Art; chip: string; children: ReactNode; setup?: boolean }) {
  const reduced = useYarnReducedMotion();
  return (
    <motion.section className={[`yn-card${setup ? " yn-setup-card" : ""}`, roomStyles["yn-card"]].join(" ")} initial={{ y: reduced ? 0 : 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduced ? 0 : -8, opacity: 0 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }}>
      {!setup && <div className={["yn-head", roomStyles["yn-head"]].join(" ")}>
        <div className={["yn-wash", roomStyles["yn-wash"]].join(" ")} style={{ background: wash(art) }} />
        <Illustration art={art} className={["yn-illo", roomStyles["yn-illo"]].join(" ")} />
        <span className={["yn-chip", roomStyles["yn-chip"]].join(" ")}>{chip}</span>
      </div>}
      <div className={["yn-body", roomStyles["yn-body"]].join(" ")}>{children}</div>
    </motion.section>
  );
}

/** Soft notes through the speakers: a loop's pitch, or the two ends of your range. */
function useTones() {
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => () => { void ctx.current?.close(); }, []);
  const wake = () => {
    if (!ctx.current) { const C = window.AudioContext || (window as any).webkitAudioContext; if (!C) return null; ctx.current = new C(); }
    if (ctx.current.state === "suspended") void ctx.current.resume();
    return ctx.current;
  };
  /** A hum-like note (a sine with a soft octave above), fading in and out. */
  const play = (hz: number, at = 0, dur = 0.8) => {
    const c = wake();
    if (!c) return;
    const t0 = c.currentTime + at;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.13, t0 + 0.09);
    g.gain.setTargetAtTime(0, t0 + dur - 0.25, 0.09);
    g.connect(c.destination);
    const over = c.createGain();
    over.gain.value = 0.22;
    over.connect(g);
    for (const [f, to] of [[hz, g], [hz * 2, over]] as const) {
      const o = c.createOscillator();
      o.type = "sine"; o.frequency.value = f;
      o.connect(to); o.start(t0); o.stop(t0 + dur + 0.4);
    }
  };
  return { wake: () => void wake(), play };
}

/** Pitch readings while `active`: Lilt's live tracker, with the mic claimed so the radio steps aside. Nothing is kept. */
function useReadings(stream: MediaStream | null, active: boolean, onFrame: (t: number, hz: number | null, c: number, v: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!stream || !active) return;
    const release = claimMic();
    const tracker = trackLiveFine(stream, (_t, f) => cb.current(performance.now() / 1000, f.hz, f.clarity, f.rms));
    return () => { tracker.stop(); release(); };
  }, [stream, active]);
}

/* ------------------------------------------------------------------ calibration */

function Calibrate({ stream, canSave, reduced, onUse, onCancel }: {
  stream: MediaStream | null; canSave: boolean; reduced: boolean;
  onUse: (r: [number, number], save: boolean) => void; onCancel: () => void;
}) {
  const [step, setStep] = useState<"low" | "high" | "done">("low");
  const [heard, setHeard] = useState<{ n: number; hz: number | null }>({ n: 0, hz: null });
  const [slow, setSlow] = useState(false);
  const hums = useRef<{ low: (number | null)[]; high: (number | null)[] }>({ low: [], high: [] });
  const shown = useRef(0);
  const result = step === "done" ? rangeFromHums(hums.current.low, hums.current.high) : null;
  useReadings(stream, step !== "done", (t, hz) => {
    if (step === "done") return;
    const list = hums.current[step];
    if (hz !== null) list.push(hz);
    const voiced = list.length;
    // the readout updates a few times a second, not at the tracker's rate
    if (t - shown.current > 0.1 || voiced >= HUM_READINGS) { shown.current = t; setHeard({ n: voiced, hz }); }
    if (voiced >= HUM_READINGS) { setHeard({ n: 0, hz: null }); setSlow(false); setStep(step === "low" ? "high" : "done"); }
  });
  // no voice for a while: a gentle tip, never a failure
  useEffect(() => { setSlow(false); if (step === "done") return; const id = window.setTimeout(() => setSlow(true), 9000); return () => window.clearTimeout(id); }, [step]);
  const again = () => { hums.current = { low: [], high: [] }; setHeard({ n: 0, hz: null }); setStep("low"); };
  const pct = Math.min(1, heard.n / HUM_READINGS);

  return (
    <Card art="yarn" chip={step === "done" ? "Your range" : step === "low" ? "Hum 1 of 2" : "Hum 2 of 2"}>
      {step !== "done" ? (
        <>
          <h2 className={["yn-title", roomStyles["yn-title"]].join(" ")}>{step === "low" ? "Hum a comfortable low note" : "Now a comfortable high note"}</h2>
          <p className={["yn-p", roomStyles["yn-p"]].join(" ")}>{step === "low" ? "Low, but easy: no pushing down. Hold it for a couple of seconds, on “mmm” or a lip trill." : "Up where it still feels easy, not a squeak. Hold it for a couple of seconds."}</p>
          <div className={["yn-listen", roomStyles["yn-listen"]].join(" ")} aria-live="polite">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--fill-2)" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${pct * 125.7} 125.7`} transform="rotate(-90 24 24)" />
            </svg>
            <span>{heard.hz ? <><b>{noteName(heard.hz)}</b> {Math.round(heard.hz)} Hz</> : heard.n ? "Keep going…" : "Listening…"}</span>
          </div>
          {slow && <p className={["yn-quiet", roomStyles["yn-quiet"]].join(" ")}>Can&rsquo;t hear much yet. Hum a little louder, or come a bit closer to the microphone.</p>}
          <div className={["yn-row", roomStyles["yn-row"]].join(" ")}><button className={["yn-ghost", roomStyles["yn-ghost"]].join(" ")} onClick={onCancel}>Back</button></div>
        </>
      ) : result ? (
        <>
          <h2 className={["yn-title", roomStyles["yn-title"]].join(" ")}>{rangeWords(result)}</h2>
          <p className={["yn-p", roomStyles["yn-p"]].join(" ")}>The game plays from your low hum to your high one, with a little room either side so both ends are easy to reach.</p>
          <div className={["yn-row", roomStyles["yn-row"]].join(" ")}>
            {canSave && <button className={["yn-primary", roomStyles["yn-primary"]].join(" ")} onClick={() => onUse(result, true)}>Save as my comfortable range</button>}
            <button className={canSave ? ["yn-ghost", roomStyles["yn-ghost"]].join(" ") : ["yn-primary", roomStyles["yn-primary"]].join(" ")} onClick={() => onUse(result, false)}>Just for this game</button>
            <button className={["yn-ghost", roomStyles["yn-ghost"]].join(" ")} onClick={again}>Hum again</button>
          </div>
        </>
      ) : (
        <>
          <h2 className={["yn-title", roomStyles["yn-title"]].join(" ")}>Let&rsquo;s try that once more</h2>
          <p className={["yn-p", roomStyles["yn-p"]].join(" ")}>Lilt couldn&rsquo;t quite hear both hums. A steady &ldquo;mmm&rdquo; for a couple of seconds is plenty.</p>
          <div className={["yn-row", roomStyles["yn-row"]].join(" ")}><button className={["yn-primary", roomStyles["yn-primary"]].join(" ")} onClick={again}>Hum again</button><button className={["yn-ghost", roomStyles["yn-ghost"]].join(" ")} onClick={onCancel}>Back</button></div>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ the game */

interface Spark { x: number; y: number; vx: number; vy: number; t0: number; hue: number }
interface Game {
  range: [number, number] | null; mode: Mode; free: boolean; threadedAt: number;
  f: ReturnType<typeof follower> | null; maker: ReturnType<typeof loopMaker>;
  loops: Loop[]; now: number; played: number; lastBreak: number; afloatS: number;
  trail: { t: number; y: number }[]; sparks: Spark[]; frames: ContourPoint[]; cued: Set<number>;
  voicedSince: number; spin: number; spinV: number; tumble: number; walk: number; catX: number | null; y: number; afloat: boolean;
  /** colours of threaded loops wound onto the ball */
  wound: number[];
  /** the yarn's last landing on the floor (game time) and how firmly, 0..1, for its little bounce */
  landAt: number; landV: number; lastBy: number | null; fallV: number;
}
const newGame = (range: [number, number] | null, mode: Mode, free = false): Game => ({
  range, mode, free, threadedAt: -Infinity, f: range ? follower(range, mode) : null, maker: loopMaker(mode, Math.floor(Math.random() * 1e9)),
  loops: [], now: 0, played: 0, lastBreak: 0, afloatS: 0, trail: [], sparks: [], frames: [], cued: new Set(),
  voicedSince: 0, spin: 0, spinV: 0, tumble: 0, walk: 0, catX: null, y: REST_Y, afloat: false,
  wound: [], landAt: -Infinity, landV: 0, lastBy: null, fallV: 0,
});
const MAX_FRAMES = 20 * 60 * 100; // twenty minutes of readings for the words at the end, then the oldest go

function Play({ range, mode, free, cue, sentences, stream, reduced, tone, onHurt, onStop }: {
  range: [number, number]; mode: Mode; free: boolean; cue: boolean; sentences: string[]; stream: MediaStream | null; reduced: boolean;
  tone: (hz: number) => void; onHurt: () => void; onStop: (lines: string[]) => void;
}) {
  const [first] = useState(() => newGame(range, mode, free));
  const game = useRef<Game>(first);
  const [breathing, setBreathing] = useState(false);
  const [afloat, setAfloat] = useState(false);
  const [voiced, setVoiced] = useState(false);
  const [noisy, setNoisy] = useState(false);
  const [line, setLine] = useState(() => Math.floor(Math.random() * sentences.length));
  const said = useRef(0);
  const running = !breathing;

  useReadings(stream, running, (t, hz, c, v) => {
    const G = game.current;
    G.f?.push(t, hz);
    G.frames.push({ t, hz, c, v });
    if (G.frames.length > MAX_FRAMES * 1.1) G.frames.splice(0, G.frames.length - MAX_FRAMES);
  });
  // a quiet-room hint, checked once a second
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNoisy(noisyRoom(game.current.frames.slice(-400).map((f) => ({ hz: f.hz, v: f.v ?? 0 })))), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const events = useRef({
    cue: (hz: number) => tone(hz),
    afloat: (on: boolean) => { setAfloat(on); if (on) setVoiced(true); },
    breath: () => setBreathing(true),
    said: () => { said.current++; setLine((i) => (i + 1) % sentences.length); },
  });
  events.current.cue = (hz) => tone(hz);

  const stop = () => {
    const G = game.current;
    onStop(describePlay(G.frames, range, G.afloatS, mode, said.current));
  };

  return (
    <main className={[`yn-stage playing ${mode}`, roomStyles["yn-stage"]].join(" ")}>
      <Scene game={game} running={running} cue={cue} reduced={reduced} events={events} />
      {mode === "speak" && (
        <div className={["yn-say", roomStyles["yn-say"]].join(" ")} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={line} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: 0.25 }}>
              {sentences[line]}
            </motion.p>
          </AnimatePresence>
          <button className={["yn-link", roomStyles["yn-link"]].join(" ")} onClick={() => { game.current.voicedSince = 0; setLine((i) => (i + 1) % sentences.length); }}>Another line</button>
        </div>
      )}
      <p className={[`yn-hint${afloat || breathing ? " gone" : ""}`, roomStyles["yn-hint"]].join(" ")} aria-hidden={afloat}>
        {!voiced ? (mode === "hum" ? "Hum or lip trill to lift the yarn" : "Say the line to lift the yarn") : "Whenever you’re ready"}
      </p>
      {noisy && !breathing && <p className={["yn-noise", roomStyles["yn-noise"]].join(" ")} role="status">It sounds a bit busy here. A quieter room helps the yarn follow you.</p>}
      <footer className={["yn-bar", roomStyles["yn-bar"]].join(" ")}>
        <span className={["yn-tip", roomStyles["yn-tip"]].join(" ")}>{mode === "hum" ? "A gentle hum is enough. Let the yarn rest whenever you need." : "Use your everyday voice. The yarn waits between words."}</span>
        <span className={["yn-acts", roomStyles["yn-acts"]].join(" ")}>
          <button className={["yn-pill", roomStyles["yn-pill"]].join(" ")} onClick={() => setBreathing(true)}>Take a breath</button>
          <button className={["yn-pill", roomStyles["yn-pill"]].join(" ")} onClick={stop}>Stop</button>
          <button className={["yn-pill hurt", roomStyles["yn-pill"]].join(" ")} onClick={onHurt}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 018 4.7a2.8 2.8 0 015.5 1.6C13.5 10.2 8 13.5 8 13.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            {HURT}
          </button>
        </span>
      </footer>
      <AnimatePresence>
        {breathing && (
          <motion.div className={["yn-over dim", roomStyles["yn-over"]].join(" ")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
            <section className={["yn-card yn-breath", roomStyles["yn-card"], roomStyles["yn-breath"]].join(" ")} aria-label="Breathing break">
              <div className={[`yn-breathe${reduced ? " still" : ""}`, roomStyles["yn-breathe"]].join(" ")} aria-hidden="true"><i /></div>
              <h2 className={["yn-title", roomStyles["yn-title"]].join(" ")}>Time for a breath</h2>
              <p className={["yn-p", roomStyles["yn-p"]].join(" ")}>Let your shoulders drop. Breathe in through your nose, and out slowly, like a long sigh. A sip of water is good too.</p>
              <div className={["yn-row", roomStyles["yn-row"]].join(" ")}>
                <button className={["yn-primary", roomStyles["yn-primary"]].join(" ")} autoFocus onClick={() => setBreathing(false)}>Carry on</button>
                <button className={["yn-ghost", roomStyles["yn-ghost"]].join(" ")} onClick={stop}>That&rsquo;s enough for now</button>
              </div>
              <button className={["yn-hurt", roomStyles["yn-hurt"]].join(" ")} onClick={onHurt}>{HURT}</button>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ------------------------------------------------------------------ drawing */

/**
 * The canvas: string lights along the top, the floor, the loops, the thread the yarn has drawn (your
 * pitch line, really), the yarn, and the cat. Without a game it's the room at rest: the yarn on the
 * floor and the cat beside it. Runs at the display's frame rate; React isn't involved per frame.
 */
function Scene({ game, range, running = false, cue = false, reduced, preview = false, events }: {
  game?: { current: Game }; range?: [number, number] | null; running?: boolean; cue?: boolean; reduced: boolean; preview?: boolean;
  events?: { current: { cue: (hz: number) => void; afloat: (on: boolean) => void; breath: () => void; said: () => void } };
}) {
  const box = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const [rest] = useState(() => newGame(range ?? null, "hum"));
  const idle = useRef<Game>(rest);
  if (!game && idle.current.range !== (range ?? null)) idle.current = newGame(range ?? null, "hum");
  const live = useRef({ running, cue, reduced, preview });
  live.current = { running, cue, reduced, preview };

  useEffect(() => {
    const canvas = cvs.current!, el = box.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const backdrop = document.createElement("canvas");
    const back = backdrop.getContext("2d")!;
    const threadCanvas = document.createElement("canvas");
    const thread = { canvas: threadCanvas, ctx: threadCanvas.getContext("2d")! };
    let backdropKey = "";
    const art = loadYarnArt(() => { backdropKey = ""; });
    let W = 0, H = 0, dpr = 1;
    const size = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = threadCanvas.width = Math.round(W * dpr); canvas.height = threadCanvas.height = Math.round(H * dpr);
      (game?.current ?? idle.current).catX = null;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    let raf = 0, last = performance.now(), shownAfloat = false, told = 0;
    const frame = (ms: number) => {
      const dt = Math.min(0.05, Math.max(0, (ms - last) / 1000));
      last = ms;
      const G = game?.current ?? idle.current;
      const { running, cue, reduced, preview } = live.current;
      const floorY = H - Math.max(30, Math.min(130, H * 0.14));
      const F = floorY;
      const bx = W * (W < 640 ? 0.34 : 0.3);
      const R = Math.max(15, Math.min(38, F * 0.055));
      const speed = Math.max(45, Math.min(110, W * 0.085)) * (reduced ? 0.8 : 1);
      const wall = ms / 1000;
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const key = `${W}:${H}:${dpr}:${dark}`;
      if (backdropKey !== key) {
        backdrop.width = canvas.width; backdrop.height = canvas.height;
        back.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintYarnRoom(back, W, H, floorY, dark, dark ? art.images.night : art.images.day);
        backdropKey = key;
      }
      if (!game) G.y = preview ? .65 + (reduced ? 0 : Math.sin(wall * .7) * .025) : REST_Y;
      if (running && G.f) {
        G.now += dt; G.played += dt;
        const s = G.f.step(wall, dt);
        G.y = s.y;
        if (s.afloat) G.afloatS += dt;
        if (s.afloat !== shownAfloat) { shownAfloat = s.afloat; events?.current.afloat(s.afloat); }
        const ahead = (W - bx + 80) / speed;
        if (!G.free) while (!G.loops.length || G.loops[G.loops.length - 1].at < G.now + ahead) G.loops.push(...G.maker.next());
        const passed = passLoops(G.loops, G.now, G.y, R / F, (bx + 80) / speed);
        G.loops = passed.loops;
        for (const l of passed.threaded) {
          G.threadedAt = G.now;
          G.wound = wind(G.wound, l.hue);
          const n = reduced ? 0 : 8;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + Math.random() * 0.5, v = 34 + Math.random() * 22;
            G.sparks.push({ x: bx, y: uToY(l.u) * F, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 14, t0: G.now, hue: l.hue });
          }
        }
        // a firm landing on the floor gives a small bounce
        const by = Math.min(G.y * F, floorY - R);
        if (G.lastBy !== null && dt > 0) {
          if (!reduced && by >= floorY - R - 0.5 && G.lastBy < floorY - R - 0.5 && G.fallV > 50) { G.landAt = G.now; G.landV = Math.min(1, G.fallV / 360); }
          G.fallV = (by - G.lastBy) / dt;
        }
        G.lastBy = by;
        G.sparks = G.sparks.filter((p) => G.now - p.t0 < 0.9);
        if (cue && G.range) {
          const lead = Math.min(3.4, (W - bx) / speed - 0.2);
          for (const l of G.loops) {
            if (G.cued.has(l.id) || !cueDue(l, G.now, lead, G.f.quietFor(wall))) continue;
            G.cued.add(l.id);
            events?.current.cue(uToHz(l.u, G.range));
            G.f.mute(wall + 0.95); // don't follow Lilt's own note
          }
        }
        G.trail.push({ t: G.now, y: G.y });
        const keep = bx / speed + 0.5;
        while (G.trail.length && G.trail[0].t < G.now - keep) G.trail.shift();
        if (breakDue(G.played, G.lastBreak)) { G.lastBreak = G.played; events?.current.breath(); }
        if (G.mode === "speak") {
          const quiet = G.f.quietFor(wall);
          if (quiet < 0.12) G.voicedSince += dt;
          if (saidIt(G.voicedSince, quiet)) { G.voicedSince = 0; events?.current.said(); }
        }
        if (!reduced) {
          // it rolls along the floor; up in the air it turns slowly and tumbles as it rises and falls
          const grounded = G.y >= REST_Y - 0.005;
          G.spinV += ((grounded ? speed / R : speed / R * 0.2) - G.spinV) * (1 - Math.exp(-dt * 3));
          G.spin += G.spinV * dt;
          G.tumble += dt * (grounded ? 0.08 : 0.35 + Math.min(1.5, Math.abs(G.f.v) * 2));
          G.walk += dt * 7;
        }
      } else if (!game && !reduced) G.tumble = wall * 0.25;
      draw(ctx, G, { W, H, dpr, F, floorY, bx, R, speed }, reduced, running, wall, dt, backdrop, thread, dark, preview, art.images);
      el.dataset.art = Object.values(art.images).every(artReady) ? 'ready' : 'fallback';
      // where the yarn is (0 top, 1 floor), a few times a second, for the browser tests
      if (wall - told > 0.2) {
        told = wall; el.dataset.y = G.y.toFixed(3);
        el.dataset.loops = String(G.loops.length); el.dataset.cues = String(G.cued.size);
        el.dataset.threadedAt = String(G.threadedAt); el.dataset.time = G.now.toFixed(3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); art.dispose(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={["yn-scene", roomStyles["yn-scene"]].join(" ")} ref={box}>
      <canvas ref={cvs} role="img" aria-label="A ball of yarn that follows your voice: higher lifts it, lower lets it down. The cat follows it along the floor." />
    </div>
  );
}

type Dims = { W: number; H: number; dpr: number; F: number; floorY: number; bx: number; R: number; speed: number };
type Layer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

function draw(c: CanvasRenderingContext2D, G: Game, d: Dims, reduced: boolean, running: boolean, wall: number, dt: number, backdrop: HTMLCanvasElement, thread: Layer, dark: boolean, preview: boolean, art: YarnArt) {
  const { W, H, dpr, F, floorY, bx, R, speed } = d;
  const narrow = W < 640, clock = preview ? wall : G.now;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.drawImage(backdrop, 0, 0, W, H);

  // The room stays still; the lights glow softly, and the yarn, cat and loops move.
  const span = 240, sag = Math.min(26, H * 0.04), y0 = 6;
  const wireY = (x: number) => { const s = ((x % span) + span) % span / span; return y0 + sag * 4 * s * (1 - s); };
  paintLights(c, W, wireY, 44, (x) => (reduced ? 1 : 0.8 + 0.2 * Math.sin(clock * 1.3 + x * 0.05)), dark);

  // the two ends of your range, stitched faintly across the wall, with their notes
  if (G.range && !preview) {
    for (const [u, word] of [[1, "High"], [0, "Low"]] as const) {
      paintRangeMark(c, W, uToY(u) * F, `${word} · ${noteName(u ? G.range[1] : G.range[0])}`, u === 1, dark, narrow);
    }
  }

  // loops: the hanger and back of each, then the yarn and its thread, then their fronts over it
  const next = nextLoop(G.loops, G.now);
  const loops = G.loops.map((l) => ({ l, x: bx + (l.at - G.now) * speed })).filter((o) => o.x > -40 && o.x < W + 40).map(({ l, x }) => {
    const age = G.now - l.at, y = uToY(l.u) * F;
    const just = l.state === "through" && age < 0.8 ? 1 - age / 0.8 : 0;
    // the loop you're heading for glows softly as your voice lines up with it
    const near = l === next ? Math.min(1, Math.max(0, 1 - (l.at - G.now) / 2.6)) : 0;
    return {
      l, age, x, y, ry: l.r * F, hang: wireY(x) + 2, sway: reduced ? 0 : Math.sin(clock * 1.1 + l.id * 1.7) * 0.014,
      open: reduced ? 0 : Math.sin((1 - just) * Math.PI) * 0.13 * (just > 0 ? 1 : 0), wool: LOOP_WOOL[l.hue % LOOP_WOOL.length],
      w: narrow ? 4 : 5.5, glow: Math.max(just, near * lineUp(G.y, l, R / F)), faded: l.state === "by", dark,
    };
  });
  for (const o of loops) { paintLoop(c, o, "hanger"); paintLoop(c, o, "back"); }

  // the thread the yarn has drawn: your pitch line, trailing behind as a strand of wool
  if (G.trail.length > 1) {
    const t = thread.ctx;
    t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, thread.canvas.width, thread.canvas.height);
    t.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintThread(t, () => G.trail.forEach((p, i) => { const x = bx - (G.now - p.t) * speed, y = Math.min(p.y * F, floorY - 2); i ? t.lineTo(x, y) : t.moveTo(x, y); }), narrow ? 2.4 : 3);
    // it fades away towards the left
    t.globalCompositeOperation = "destination-in";
    const fade = t.createLinearGradient(0, 0, bx, 0);
    fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(0.6, "rgba(0,0,0,1)");
    t.fillStyle = fade; t.fillRect(0, 0, W, H);
    t.globalCompositeOperation = "source-over";
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(thread.canvas, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // the yarn, with a little bounce when it lands
  const landed = G.now - G.landAt;
  const bounce = landed < 1.2 ? G.landV * R * 0.9 * Math.abs(Math.sin(landed * 8)) * Math.exp(-landed * 5) : 0;
  const squash = landed < 0.4 ? G.landV * 0.13 * Math.exp(-landed * 16) : 0;
  const by = Math.min(G.y * F, floorY - R) - bounce;
  const lift = Math.min(1, Math.max(0, (floorY - by - R) / (F * .65)));
  c.fillStyle = dark ? `rgba(10,20,20,${.25 - lift * .14})` : `rgba(111,75,51,${.2 - lift * .11})`;
  c.beginPath(); c.ellipse(bx, floorY + 3, R * (1.05 - lift * .35), R * .18, 0, 0, Math.PI * 2); c.fill();
  if (preview) {
    paintThread(c, () => { c.moveTo(bx - R * .6, by + R * .75); c.bezierCurveTo(bx - 70, by + 40, bx - 20, floorY - 14, bx - 110, floorY - 5); }, 2.6);
  }
  paintYarnBall(c, bx, by, R, G.spin, G.tumble, G.wound.map((h) => LOOP_WOOL[h % LOOP_WOOL.length]), squash);

  for (const o of loops) paintLoop(c, o, "front");

  // a soft ring and a few wisps of wool when it goes through
  for (const o of loops) {
    if (reduced || o.l.state !== "through" || o.age > 0.7) continue;
    const k = o.age / 0.7;
    c.globalAlpha = (1 - k) * 0.7; c.strokeStyle = o.wool[0]; c.lineWidth = 2;
    c.beginPath(); c.ellipse(o.x, o.y, o.ry * (0.5 + k * 0.7), o.ry * (1 + k * 0.45), 0, 0, Math.PI * 2); c.stroke();
  }
  for (const p of G.sparks) {
    const age = G.now - p.t0, k = 1 - age / 0.9;
    const x = p.x + p.vx * age - age * speed, y = p.y + p.vy * age + 26 * age * age;
    const [hi, lo] = LOOP_WOOL[p.hue % LOOP_WOOL.length];
    c.globalAlpha = Math.max(0, k);
    c.lineCap = "round"; c.lineWidth = 2.2;
    c.strokeStyle = lo; c.beginPath(); c.arc(x, y, 2.6 + k * 1.6, age * 4, age * 4 + 3.6); c.stroke();
    c.strokeStyle = hi; c.lineWidth = 1.4; c.stroke();
  }
  c.globalAlpha = 1;

  // the cat pads along behind the yarn, closer when it rests on the floor, and looks up at it
  const s = Math.max(40, Math.min(150, F * 0.22, W * 0.18));
  const resting = G.y > REST_Y - 0.03;
  const goal = Math.max(s * .8, resting ? bx - R - s * .72 : bx - R - s * 1.35);
  const moving = running && !reduced && G.catX !== null && Math.abs(goal - G.catX) > 2;
  if (G.catX === null || reduced) G.catX = goal;
  else if (running || preview) G.catX += (goal - G.catX) * (1 - Math.exp(-dt * 4));
  const hx = G.catX + s * 0.44, hy = floorY - s * 0.56;
  const look = Math.max(-0.6, Math.min(0.28, Math.atan2(by - hy, bx - hx) * 0.6));
  const pose = catReaction(clock, G.threadedAt, G.y, reduced);
  paintYarnCat(c, G.catX, floorY, s, G.walk, look, dark, moving, !G.range && !preview, pose, art);
}
