/**
 * The illustrated room: one painting in four lights (morning, day, sunset, night) that fade with
 * the clock, a sleeping cat cut into pieces so it can breathe, and small details drawn on top
 * (birds in the windows, dust, city lights, glows). Coordinates are in the painting's pixels.
 */

export const W = 1672, H = 941;
export type Light = "morning" | "day" | "sunset" | "night";
export const LIGHTS: Light[] = ["day", "morning", "sunset", "night"];
export type Quad = [[number, number], [number, number], [number, number], [number, number]];

/** Screen corners (top-left, top-right, bottom-right, bottom-left) of the two front monitors. */
export const MAIN_SCREEN: Quad = [[748, 351], [1008, 357], [1006, 463], [749, 444]];
export const SIDE_SCREEN: Quad = [[1023, 373], [1176, 386], [1171, 499], [1019, 473]];
/** Where the camera looks on the home screen, and the cat (for its speech bubble). */
export const DESK_FOCUS = { x: 820, y: 420 };
export const CAT_SPOT = { x: 300, y: 765 };

export const roomUrl = (l: Light) => `room/room-${l}.webp`;
const catUrl = (part: string, l: Light) => `room/cat-${part}-${l}.webp`;

const WINDOWS: Quad[] = [[[190, 74], [448, 83], [443, 285], [189, 295]], [[818, 52], [998, 46], [998, 276], [818, 280]], [[1036, 38], [1636, 4], [1635, 266], [1041, 280]]];

const STOPS: { m: number; l: Light }[] = [
  { m: 0, l: "night" }, { m: 315, l: "night" }, { m: 435, l: "morning" }, { m: 640, l: "day" },
  { m: 1000, l: "day" }, { m: 1155, l: "sunset" }, { m: 1280, l: "night" }, { m: 1440, l: "night" },
];
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => { n = clamp(n); return n * n * (3 - 2 * n); };

export type Weights = Record<Light, number>;
/** How much of each light shows at a minute of the day (they sum to 1). */
export function weights(minute: number): Weights {
  const m = clamp(minute, 0, 1439.99), w: Weights = { day: 0, morning: 0, sunset: 0, night: 0 };
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i], b = STOPS[i + 1];
    if (m >= a.m && m <= b.m) { const f = smooth((m - a.m) / (b.m - a.m)); w[a.l] += 1 - f; w[b.l] += f; return w; }
  }
  w.night = 1;
  return w;
}
/** Opacity for each stacked layer (day at the bottom, night on top) so the mix matches the weights. */
export function layerOpacity(w: Weights): Weights {
  const dm = w.day + w.morning, beforeSunset = dm + w.sunset;
  return { day: 1, morning: dm > 0 ? w.morning / dm : 0, sunset: beforeSunset > 0 ? w.sunset / beforeSunset : 0, night: w.night };
}
export const minuteNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };

/** CSS matrix3d that maps a w×h element onto a quad (a projective warp). */
export function quadMatrix(w: number, h: number, q: Quad): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  // Unit square → quad (Heckbert), then scale the element down to the unit square.
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, hh = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(",")})`;
}

/** The largest upright box inside a quad, so a camera filled with it shows only screen. */
export function innerBox(q: Quad) {
  const x0 = Math.max(q[0][0], q[3][0]), x1 = Math.min(q[1][0], q[2][0]);
  const y0 = Math.max(q[0][1], q[1][1]), y1 = Math.min(q[2][1], q[3][1]);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

/* ---------- the cat ---------- */

type CatPart = "body" | "tail" | "ear";
const catImages: Record<CatPart, Record<Light, HTMLImageElement>> | null = typeof Image === "undefined" ? null : (() => {
  const o = {} as Record<CatPart, Record<Light, HTMLImageElement>>;
  for (const p of ["body", "tail", "ear"] as CatPart[]) {
    o[p] = {} as Record<Light, HTMLImageElement>;
    for (const l of LIGHTS) { const im = new Image(); im.src = catUrl(p, l); o[p][l] = im; }
  }
  return o;
})();

export type CatMood = "sleep" | "listen" | "happy";

/** Hit box around the sleeping cat, in painting pixels. */
export const catHit = (x: number, y: number) => x > 20 && x < 340 && y > 715 && y < 880;

/* ---------- ambience ---------- */

function rng(seed: number) { let s = seed; return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); }
const R = rng(132857);
const DUST = Array.from({ length: 83 }, () => ({ x: R() * W, y: R() * H, r: 0.3 + R() * 1.5, k: 0.9 + R() * 2.1, p: R() * 6.283 }));
const STARS = Array.from({ length: 58 }, () => ({ x: 1035 + R() * 600, y: 40 + R() * 180, r: 0.35 + R() * 0.8, p: R() * 6.283 }));
const CITY = Array.from({ length: 185 }, () => ({ x: 1070 + R() * 570, y: 292 + R() * 100, r: 0.5 + R() * 1.4, p: R() * 6.283 }));
const BIRDS = [
  { lane: 2, y: 118, phase: 0.03, speed: 28, size: 1.1, flap: 4.3 }, { lane: 2, y: 146, phase: 0.32, speed: 24, size: 0.82, flap: 4.9 },
  { lane: 2, y: 177, phase: 0.77, speed: 17, size: 0.56, flap: 3.6 }, { lane: 2, y: 209, phase: 0.53, speed: 15, size: 0.46, flap: 4.5 },
  { lane: 0, y: 169, phase: 0.32, speed: 12, size: 0.67, flap: 3.1 }, { lane: 0, y: 141, phase: 0.78, speed: 13, size: 0.55, flap: 3.5 },
  { lane: 1, y: 169, phase: 0.35, speed: 6.5, size: 0.5, flap: 2.6 },
];

export interface Frame {
  t: number;
  w: Weights;
  cat: CatMood;
  /** Seconds (on the t clock) when the cat was last poked; it flicks its ear and tail. */
  poked: number;
  hearts: { x: number; y: number; born: number; drift: number }[];
  /** 0–1: the string lights and the warm lamp, on once today's cards are done. */
  lights: number;
}

function quadPath(g: CanvasRenderingContext2D, q: Quad) {
  g.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]);
  g.closePath();
}

function clouds(g: CanvasRenderingContext2D, t: number, lum: number) {
  if (lum < 0.05) return;
  g.save(); g.beginPath(); WINDOWS.forEach((q) => quadPath(g, q)); g.clip();
  g.globalCompositeOperation = "screen";
  for (let i = 0; i < 11; i++) {
    const lane = i % 3, [x0, x1] = lane === 0 ? [150, 470] : lane === 1 ? [785, 1035] : [1000, 1670];
    const dx = x1 - x0, x = x0 + ((i * 0.272 * dx + t * (2.7 + (i % 4))) % (dx + 230)) - 110, y = 70 + ((i * 39) % 165);
    g.globalAlpha = lum * (0.031 + (i % 3) * 0.009); g.fillStyle = "#fff1db";
    g.beginPath(); g.ellipse(x, y, 50 + (i % 3) * 16, 8 + (i % 2) * 4, -0.11, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function birds(g: CanvasRenderingContext2D, t: number, w: Weights) {
  const amount = clamp(w.morning + w.day + w.sunset);
  if (amount < 0.12) return;
  g.save(); g.globalAlpha = clamp(amount * 1.35);
  WINDOWS.forEach((q, lane) => {
    const xs = q.map((p) => p[0]), xMin = Math.min(...xs), width = Math.max(...xs) - xMin;
    g.save(); g.beginPath(); quadPath(g, q); g.clip();
    for (const b of BIRDS.filter((z) => z.lane === lane)) {
      const x = xMin - 30 + ((t * b.speed + b.phase * (width + 60)) % (width + 90)), y = b.y + Math.sin(t * 0.28 + b.phase * 7) * 7;
      const flap = Math.sin(t * b.flap + b.phase * 11);
      g.save(); g.translate(x, y); g.scale(b.size, b.size); g.rotate(Math.sin(t * 0.32 + x * 0.002) * 0.06);
      g.beginPath(); g.moveTo(-16, -3 - 4 * flap); g.quadraticCurveTo(-8, -10 - 7 * flap, 0, 0); g.quadraticCurveTo(9, -11 - 7 * flap, 17, -2 - 4 * flap);
      g.strokeStyle = "rgba(37,55,73,.68)"; g.lineWidth = 2.1; g.lineCap = "round"; g.stroke(); g.restore();
    }
    g.restore();
  });
  g.restore();
}

function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  if (a <= 0.003) return;
  const gr = g.createRadialGradient(x, y, 4, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

function atmosphere(g: CanvasRenderingContext2D, t: number, w: Weights) {
  const daylight = clamp(w.day + w.morning * 0.8 + w.sunset * 0.75), night = w.night;
  clouds(g, t, daylight);
  g.save(); g.globalCompositeOperation = "screen";
  if (daylight > 0.02) {
    const x = 1340 + Math.sin(t * 0.18) * 32, y = 90 + Math.cos(t * 0.16) * 14;
    const gr = g.createRadialGradient(x, y, 12, x, y, 510);
    gr.addColorStop(0, `rgba(255,228,157,${(0.065 + 0.014 * Math.sin(t * 0.37)) * daylight})`);
    gr.addColorStop(0.6, `rgba(255,210,143,${0.016 * daylight})`); gr.addColorStop(1, "rgba(255,219,164,0)");
    g.fillStyle = gr; g.fillRect(610, 0, 1062, 740);
  }
  for (const p of DUST) {
    const x = p.x + Math.sin(t * 0.25 + p.p) * 10, y = (p.y - t * p.k + H * 5) % H;
    g.globalAlpha = daylight * (0.1 + 0.15 * (0.5 + 0.5 * Math.sin(t * 0.7 + p.p))) + night * 0.07;
    g.fillStyle = "#f8dbaa"; g.beginPath(); g.arc(x, y, p.r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  if (night > 0.02) {
    g.save(); g.beginPath(); quadPath(g, WINDOWS[2]); g.clip();
    for (const s of STARS) { g.globalAlpha = night * (0.16 + 0.19 * (0.5 + 0.5 * Math.sin(t * 0.85 + s.p))); g.fillStyle = "#dbe9ff"; g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill(); }
    for (const p of CITY) { g.globalAlpha = night * (0.13 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.24 + p.p))); g.fillStyle = p.p > 3 ? "#f5d5ac" : "#b6d9f7"; g.fillRect(p.x, p.y, p.r, p.r * 1.5); }
    g.restore(); g.globalAlpha = 1;
  }
  // Screens and the desk lamp glow, much stronger after dark so night feels lived in.
  const lit = 0.25 + night * 0.75;
  glow(g, 878, 408, 230, "150,175,255", lit * 0.22 * (1 + 0.06 * Math.sin(t * 1.2)));
  glow(g, 1097, 436, 160, "150,175,255", lit * 0.18 * (1 + 0.06 * Math.sin(t * 1.1 + 2)));
  glow(g, 878, 520, 260, "255,160,210", night * 0.1);
  glow(g, 573, 295, 230, "252,168,71", night * 0.32 * (1 + 0.04 * Math.sin(t * 3.1)));
  g.restore();
}

/* The string lights along the top beam: unlit until today's cards are done. */
const STRAND: [number, number][] = [[110, 46], [290, 112], [470, 54], [650, 120], [830, 46], [940, 96], [1040, 36], [1235, 112], [1420, 24], [1540, 76], [1660, 14]];
const BULBS = (() => {
  const pts: { x: number; y: number }[] = [], per = [6, 5, 3, 6, 6];
  for (let seg = 0; seg < 5; seg++) {
    const [x0, y0] = STRAND[seg * 2], [cx, cy] = STRAND[seg * 2 + 1], [x1, y1] = STRAND[seg * 2 + 2];
    for (let i = 0; i < per[seg]; i++) {
      const t = (i + 0.5) / per[seg], u = 1 - t;
      pts.push({ x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 + 9 });
    }
  }
  return pts;
})();

function lightsOn(g: CanvasRenderingContext2D, t: number, on: number) {
  // the wire
  g.save(); g.globalAlpha = 0.7; g.strokeStyle = "#3a2f2a"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(STRAND[0][0], STRAND[0][1]);
  for (let i = 1; i < STRAND.length; i += 2) g.quadraticCurveTo(STRAND[i][0], STRAND[i][1], STRAND[i + 1][0], STRAND[i + 1][1]);
  g.stroke(); g.restore();
  // the lamp warms the desk
  if (on > 0.01) {
    g.save(); g.globalCompositeOperation = "screen";
    glow(g, 573, 300, 300, "255,190,110", 0.5 * on);
    g.save(); g.translate(600, 480); g.scale(1, 0.34); glow(g, 0, 0, 330, "255,200,130", 0.32 * on); g.restore();
    g.restore();
  }
  // bulbs light one by one, then twinkle
  BULBS.forEach((b, i) => {
    const k = clamp(on * 1.6 - (i / BULBS.length) * 0.6);
    if (k > 0.01) {
      g.save(); g.globalCompositeOperation = "screen";
      glow(g, b.x, b.y, 34, "255,197,107", k * (0.75 + 0.25 * Math.sin(t * 1.9 + i * 2.3)));
      g.restore();
    }
    g.fillStyle = k > 0.5 ? "#fff1c2" : "#8a7d70";
    g.beginPath(); g.ellipse(b.x, b.y, 4.2, 6, 0, 0, Math.PI * 2); g.fill();
  });
}

function plants(g: CanvasRenderingContext2D, t: number, w: Weights) {
  const light = clamp(w.day + w.morning * 0.75 + w.sunset * 0.8 + w.night * 0.4);
  g.save(); g.globalAlpha = 0.16 * light; g.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const x = 1312 + i * 27, y = 8 + (i % 4) * 9, sway = Math.sin(t * 0.37 + i * 1.19) * 5;
    g.strokeStyle = i % 2 ? "#2c5130" : "#6f8842"; g.fillStyle = i % 2 ? "#587444" : "#859e52"; g.lineWidth = 1.35;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + sway * 0.3, y + 17, x + sway, y + 36 + (i % 4) * 8); g.stroke();
    g.save(); g.translate(x + sway, y + 32 + (i % 4) * 7); g.rotate(Math.sin(t * 0.41 + i) * 0.07);
    g.beginPath(); g.ellipse(-6, 0, 9, 3, -0.55, 0, 6.283); g.ellipse(6, 4, 8, 3, 0.55, 0, 6.283); g.fill(); g.restore();
  }
  g.restore();
}

function catPart(g: CanvasRenderingContext2D, part: CatPart, w: Weights, move: () => void) {
  if (!catImages) return;
  g.save(); move();
  for (const l of LIGHTS) {
    const im = catImages[part][l];
    if (!im.complete || !im.naturalWidth || w[l] < 0.005) continue;
    g.globalAlpha = w[l]; g.drawImage(im, 0, 710, 375, 171);
  }
  g.restore();
}

function cat(g: CanvasRenderingContext2D, f: Frame) {
  const { t, w } = f;
  const breathe = Math.sin(t * (f.cat === "sleep" ? 1.66 : 2.1));
  // Listening: the ear keeps turning and the tail is livelier. Happy: a slow, wide swish.
  const since = t - f.poked, poke = Math.max(0, 1 - Math.abs(since) / 1.5);
  const lively = f.cat === "listen" ? 1 : f.cat === "happy" ? 1.8 : 0;
  const tail = 0.014 * Math.sin(t * 0.46) + 0.062 * Math.max(0, Math.sin(t * 0.31 + 2)) ** 9 + Math.sin(since * 13) * 0.13 * poke + lively * 0.05 * Math.sin(t * 1.4);
  const ear = (Math.max(0, Math.sin(t * (f.cat === "listen" ? 1.9 : 0.62) + 2)) ** 20) * 0.12 + Math.max(0, 1 - Math.abs(since) / 0.77) * 0.15 * Math.sin(since * 20);
  // The belly rises gently; scaling is anchored at the lower edge so the feet stay on the blanket.
  catPart(g, "body", w, () => { g.translate(190, 850); g.scale(1 + 0.002 * breathe, 1 + 0.012 * breathe); g.translate(-190, -850); });
  catPart(g, "tail", w, () => { g.translate(221, 838); g.rotate(tail); g.translate(-221, -838); });
  catPart(g, "ear", w, () => { g.translate(312, 788); g.rotate(ear); g.translate(-312, -788); });
}

function hearts(g: CanvasRenderingContext2D, f: Frame) {
  for (let i = f.hearts.length - 1; i >= 0; i--) {
    const h = f.hearts[i], age = f.t - h.born;
    if (age > 2.4) { f.hearts.splice(i, 1); continue; }
    if (age < 0) continue;
    const x = h.x + Math.sin(age * 3 + h.drift * 9) * 6 + h.drift * age * 20, y = h.y - age * 38, s = 1 + age * 0.15;
    g.save(); g.globalAlpha = Math.min(1, age * 5) * (1 - age / 2.4); g.translate(x, y); g.scale(s, s);
    g.fillStyle = "#ff7eb6"; g.strokeStyle = "#fff"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 5); g.bezierCurveTo(-10, -3, -6, -11, 0, -6); g.bezierCurveTo(6, -11, 10, -3, 0, 5); g.fill(); g.stroke();
    g.restore();
  }
}

/** Everything drawn over the painting for one frame. */
export function paint(g: CanvasRenderingContext2D, f: Frame) {
  g.clearRect(0, 0, W, H);
  atmosphere(g, f.t, f.w);
  birds(g, f.t, f.w);
  plants(g, f.t, f.w);
  lightsOn(g, f.t, f.lights);
  cat(g, f);
  hearts(g, f);
}

/** The light that dominates right now, for things that take one picture (wallpaper, widgets). */
export function currentLight(minute = minuteNow()): Light {
  const w = weights(minute);
  return LIGHTS.reduce((a, b) => (w[b] > w[a] ? b : a), LIGHTS[0]);
}
