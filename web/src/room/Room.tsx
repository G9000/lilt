import { ReactNode, useEffect, useRef, useState } from "react";
import {
  CAT_SPOT, catHit, DESK_FOCUS, Frame, H, innerBox, layerOpacity, LIGHTS, MAIN_SCREEN, minuteNow, paint,
  quadMatrix, roomUrl, W, weights,
} from "./scene";

/**
 * The illustrated room. Outside, it is the whole screen; the middle monitor is a way in. Inside,
 * the camera has pushed into that monitor and the desktop covers it. The room runs its own
 * animation loop and camera, so nothing here re-renders React many times a second.
 */

export type Mode = "sleep" | "watch" | "awake" | "happy";
interface RoomState { mode: Mode; say: string }
const state: RoomState = { mode: "sleep", say: "" };
const listeners = new Set<() => void>();

/** Pages can still nudge the cat (and its speech bubble) while you work. */
export function setRoom(p: Partial<RoomState> & Record<string, unknown>) {
  const next = { mode: p.mode ?? state.mode, say: p.say ?? state.say };
  const changed = next.mode !== state.mode || next.say !== state.say;
  Object.assign(state, next);
  if (changed) listeners.forEach((f) => f());
}

interface View { s: number; left: number; top: number }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Outside: the painting fills the screen, framed on the desk. */
function homeView(vw: number, vh: number): View {
  const s = Math.max(vw / W, vh / H) * 1.03;
  return { s, left: clamp(vw / 2 - DESK_FOCUS.x * s, vw - W * s, 0), top: clamp(vh / 2 - DESK_FOCUS.y * s, vh - H * s, 0) };
}
/** Inside: the monitor's screen covers the whole view. */
function screenView(vw: number, vh: number): View {
  const b = innerBox(MAIN_SCREEN);
  const s = Math.max(vw / b.w, vh / b.h) * 1.06;
  return { s, left: vw / 2 - b.x * s, top: vh / 2 - b.y * s };
}
const viewFor = (inside: boolean) => (inside ? screenView : homeView)(window.innerWidth, window.innerHeight);

/** A push-in: zoom about the one point that stays put between the two views, so nothing swings. */
function between(a: View, b: View, k: number): View {
  const s = a.s * Math.pow(b.s / a.s, k);
  if (Math.abs(a.s - b.s) < 1e-6) return { s, left: a.left + (b.left - a.left) * k, top: a.top + (b.top - a.top) * k };
  const px = (b.left - a.left) / (a.s - b.s), py = (b.top - a.top) / (a.s - b.s);
  return { s, left: a.left + px * a.s - px * s, top: a.top + py * a.s - py * s };
}
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const FLY_MS = 1100;

const PET_SAYS = ["purr… :3", "prrrr <3", "mrrp!", "*happy cat noises*"];

/** `children` float in the painting: position them in painting pixels; `--inv` undoes the camera's scale. */
export function Room({ inside, onEnter, cards, done, children }: { inside: boolean; onEnter: () => void; cards: number | null; done: boolean; children?: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const arts = useRef<Record<string, HTMLImageElement | null>>({});
  const [, bump] = useState(0);
  const [hover, setHover] = useState(false);
  const [aside, setAside] = useState<string | null>(null);
  const cam = useRef<{ now: View; from: View; to: View; start: number; flying: boolean; inside: boolean }>(null!);
  if (!cam.current) { const v = viewFor(inside); cam.current = { now: v, from: v, to: v, start: 0, flying: false, inside }; }
  const frame = useRef<Frame>({ t: 0, w: weights(minuteNow()), cat: "sleep", poked: -100, hearts: [], lights: 0 });
  const doneRef = useRef(done);
  doneRef.current = done;
  const mouse = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Fly the camera whenever we go in or out.
  useEffect(() => {
    const c = cam.current;
    if (c.inside === inside) return;
    c.inside = inside;
    c.from = c.now; c.to = viewFor(inside); c.start = performance.now(); c.flying = !reduced;
    if (reduced) c.now = c.to;
    if (inside) setHover(false);
  }, [inside, reduced]);

  useEffect(() => {
    const on = () => bump((x) => x + 1);
    const onResize = () => { const c = cam.current; c.to = viewFor(c.inside); if (!c.flying) c.now = c.to; };
    const onMove = (e: PointerEvent) => { mouse.current.x = e.clientX / window.innerWidth - 0.5; mouse.current.y = e.clientY / window.innerHeight - 0.5; };
    listeners.add(on);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    return () => { listeners.delete(on); window.removeEventListener("resize", onResize); window.removeEventListener("pointermove", onMove); };
  }, []);

  // The loop: camera, light by the clock, and the painted details.
  useEffect(() => {
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    let raf = 0, last = 0, lastLight = -1e9, lastHeart = 0;
    const f = frame.current;
    const place = (now: number) => {
      const c = cam.current, m = mouse.current;
      if (c.flying) {
        const k = Math.min(1, (now - c.start) / FLY_MS);
        c.now = between(c.from, c.to, ease(k));
        if (k >= 1) { c.flying = false; c.now = c.to; }
      }
      m.sx += (m.x - m.sx) * 0.06; m.sy += (m.y - m.sy) * 0.06;
      const v = c.now, vw = window.innerWidth, vh = window.innerHeight;
      const drift = c.inside || c.flying || reduced ? 0 : 1;
      const left = drift ? clamp(v.left - m.sx * 22, vw - W * v.s, 0) : v.left;
      const top = drift ? clamp(v.top - m.sy * 12, Math.min(0, vh - H * v.s), 0) : v.top;
      const st = stage.current;
      if (st) { st.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${v.s})`; st.style.setProperty("--inv", String(1 / v.s)); }
      const b = bubble.current;
      if (b) {
        const x = left + CAT_SPOT.x * v.s, y = top + (CAT_SPOT.y - 30) * v.s;
        b.style.left = `${x}px`; b.style.top = `${y}px`;
        b.style.opacity = c.inside || c.flying || x < 60 || x > vw - 60 || y > vh - 40 ? "0" : "1";
      }
    };
    const step = (now: number) => {
      f.t = now / 1000;
      if (now - lastLight > 30000) {
        lastLight = now;
        f.w = weights(minuteNow());
        const o = layerOpacity(f.w);
        for (const l of LIGHTS) { const im = arts.current[l]; if (im) im.style.opacity = String(o[l]); }
      }
      // the lights ease on (or off) over a couple of seconds
      f.lights += ((doneRef.current ? 1 : 0) - f.lights) * (reduced ? 1 : 0.035);
      f.cat = state.mode === "watch" || state.mode === "awake" ? "listen" : state.mode === "happy" ? "happy" : "sleep";
      if (f.cat === "happy" && now - lastHeart > 1400) { lastHeart = now; f.hearts.push({ x: 250, y: 740, born: f.t, drift: Math.random() - 0.5 }); }
      place(now);
      // Once we're inside, the desktop covers the room, so the painting can rest.
      if (!cam.current.inside || cam.current.flying) paint(g, f);
      last = now;
    };
    if (reduced) {
      step(performance.now());
      const on = () => step(performance.now());
      listeners.add(on);
      window.addEventListener("resize", on);
      return () => { listeners.delete(on); window.removeEventListener("resize", on); };
    }
    const loop = (now: number) => {
      if (cam.current.flying || now - last > (cam.current.inside ? 500 : 33)) step(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // The cat says hello when you arrive: an ear flick, a tail swish, a little bubble.
  useEffect(() => {
    if (inside) return;
    const id = window.setTimeout(() => {
      const f = frame.current;
      f.poked = f.t;
      setAside("mrrp… welcome back");
      window.setTimeout(() => setAside((a) => (a === "mrrp… welcome back" ? null : a)), 3200);
    }, 900);
    return () => window.clearTimeout(id);
  }, [inside]);

  // Pet the cat.
  const toArt = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect(), s = r.width / W;
    return [(e.clientX - r.left) / s, (e.clientY - r.top) / s] as const;
  };
  const onPoint = (e: React.PointerEvent<HTMLDivElement>) => {
    const c = cam.current;
    if (c.inside || c.flying) return;
    const [x, y] = toArt(e);
    if (!catHit(x, y)) return;
    const f = frame.current;
    f.poked = f.t;
    for (let i = 0; i < 3; i++) f.hearts.push({ x: 230 + i * 18, y: 735, born: f.t + i * 0.18, drift: Math.random() - 0.5 });
    setAside(PET_SAYS[Math.floor(Math.random() * PET_SAYS.length)]);
    window.setTimeout(() => setAside(null), 2400);
  };
  const onHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cam.current.inside) return;
    const [x, y] = toArt(e);
    e.currentTarget.style.cursor = catHit(x, y) ? "pointer" : "";
  };

  const say = aside ?? state.say;
  const peekTop = Math.min(MAIN_SCREEN[0][1], MAIN_SCREEN[1][1]) - 8;
  const peekX = (MAIN_SCREEN[0][0] + MAIN_SCREEN[1][0]) / 2;
  return (
    <div className={`room${inside ? " inside" : ""}${hover ? " hovering" : ""}`} aria-hidden={inside} onPointerDown={onPoint} onPointerMove={onHover}>
      <div className="room-stage" ref={stage} style={{ width: W, height: H }}>
        {LIGHTS.map((l) => (
          <img key={l} ref={(el) => { arts.current[l] = el; }} className="room-art" src={roomUrl(l)} alt="" draggable={false}
            style={{ opacity: String(layerOpacity(frame.current.w)[l]) }} />
        ))}
        <canvas ref={canvas} className="room-fx" width={W} height={H} />
        <button className="room-hit" style={{ transform: quadMatrix(100, 100, MAIN_SCREEN) }} onClick={onEnter} tabIndex={inside ? -1 : 0}
          aria-label={`Sit down at the computer${cards !== null ? `: ${cards} card${cards === 1 ? "" : "s"} today` : ""}`}
          onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)} />
        <div className="room-peek" style={{ left: peekX, top: peekTop }} aria-hidden="true">
          <b>{cards === null ? "Your desk" : cards === 0 ? "All done today" : `${cards} card${cards === 1 ? "" : "s"} today`}</b>
          <span>Click the screen to sit down</span>
        </div>
        {children}
      </div>
      <div className="room-shade" />
      {say && <div className="room-bubble" ref={bubble}>{say}</div>}
    </div>
  );
}
