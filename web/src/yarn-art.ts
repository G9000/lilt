/** Illustrations for Yarn, independent of microphone input and the game rules. */
import { artReady, type YarnArt } from './yarn-assets';
type Pen = CanvasRenderingContext2D;
const oval = (c: Pen, x: number, y: number, rx: number, ry: number, color: string, angle = 0) => {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); c.fill();
};
function box(c: Pen, x: number, y: number, w: number, h: number, r: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
}

/** Static scenery is painted to a separate canvas only when its size or theme changes. */
export function paintYarnRoom(c: Pen, W: number, H: number, floor: number, dark: boolean, image?: HTMLImageElement) {
  if (image && artReady(image)) {
    const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    // Keep the window in portrait crops and the floor beneath the kitten in every aspect ratio.
    c.drawImage(image, (W - width) * .3, H - height, width, height);
    return;
  }
  const wall = dark ? '#303b3a' : '#f4e8d6', wood = dark ? '#827259' : '#b98c62';
  c.fillStyle = wall; c.fillRect(0, 0, W, H);
  // Soft plaster marks stay quiet behind the playing field.
  c.fillStyle = dark ? 'rgba(236,220,184,.035)' : 'rgba(113,88,58,.04)';
  for (let i = 0; i < W * H / 1600; i++) {
    const x = (i * 157.7) % W, y = (i * 89.3) % H;
    c.fillRect(x, y, 1 + i % 3, 1);
  }
  const ww = W * .58, wh = floor * .68;
  const wx = W * .07, wy = Math.max(52, floor * .13);
  box(c, wx - 14, wy - 14, ww + 28, wh + 28, 12, dark ? '#48514a' : '#ddd0b7');
  box(c, wx - 6, wy - 6, ww + 12, wh + 12, 5, wood);
  c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
  const sky = c.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, dark ? '#263f4b' : '#a7c7c0'); sky.addColorStop(1, dark ? '#657778' : '#e1dec0');
  c.fillStyle = sky; c.fillRect(wx, wy, ww, wh);
  oval(c, wx + ww * .75, wy + wh * .23, Math.min(wh * .08, 42), Math.min(wh * .08, 42), dark ? '#f1e2b6' : '#fbefcc');
  if (dark) {
    c.fillStyle = '#d1cba9';
    for (let i = 0; i < 22; i++) c.fillRect(wx + (i * 71 + 23) % ww, wy + (i * 37 + 13) % (wh * .6), 1.5, 1.5);
  } else {
    for (const [x, y, s] of [[.16,.23,1],[.6,.47,.7],[.9,.13,.5]]) {
      const unit = Math.min(ww * .08, 52) * s;
      oval(c, wx + ww * x, wy + wh * y, unit * 1.8, unit * .3, '#eef0dc');
      oval(c, wx + ww * x - unit * .3, wy + wh * y - unit * .25, unit * .8, unit * .6, '#eef0dc');
    }
  }
  for (let i = 0; i < 3; i++) {
    c.fillStyle = dark ? ['#3b5554','#344d48','#2b433e'][i] : ['#b3bfa0','#97ae8f','#809c7e'][i];
    c.beginPath(); c.moveTo(wx, wy + wh);
    for (let x = 0; x <= ww + 12; x += 12) c.lineTo(wx + x, wy + wh * (.76 + i * .09) + Math.sin(x * .008 + i * 2) * wh * .06);
    c.lineTo(wx + ww, wy + wh); c.closePath(); c.fill();
  }
  // Window rails, reflected light, and loose linen curtains.
  c.fillStyle = wood; c.fillRect(wx + ww * .5 - 4, wy, 8, wh); c.fillRect(wx, wy + wh * .57, ww, 7);
  c.fillStyle = 'rgba(255,248,211,.1)'; c.beginPath(); c.moveTo(wx + ww * .2, wy); c.lineTo(wx + ww * .48, wy); c.lineTo(wx + ww * .12, wy + wh); c.lineTo(wx, wy + wh); c.closePath(); c.fill();
  c.restore();
  box(c, wx - 22, wy + wh, ww + 44, 13, 3, dark ? '#86785f' : '#c1a27b');
  for (const right of [false, true]) {
    const x = right ? wx + ww : wx;
    c.fillStyle = dark ? '#828878' : '#f7efd9';
    c.beginPath(); c.moveTo(x + (right ? 16 : -16), wy - 17);
    c.lineTo(x + (right ? -ww * .13 : ww * .13), wy - 17);
    c.bezierCurveTo(x + (right ? -ww * .1 : ww * .1), wy + wh * .3, x, wy + wh * .6, x + (right ? -12 : 12), wy + wh + 25);
    c.lineTo(x + (right ? 20 : -20), wy + wh + 18); c.closePath(); c.fill();
    c.strokeStyle = dark ? '#6d7568' : '#d9ceb6'; c.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      c.beginPath(); c.moveTo(x + (right ? -1 : 1) * j * 8, wy - 12);
      c.quadraticCurveTo(x + (right ? -1 : 1) * 16, wy + wh * .5, x + (right ? 1 : -1) * (j * 4), wy + wh + 12); c.stroke();
    }
  }
  c.fillStyle = dark ? '#514d40' : '#cbb08b'; c.fillRect(0, floor, W, H - floor);
  c.fillStyle = dark ? '#85785e' : '#ac8c63'; c.fillRect(0, floor - 6, W, 6);
  c.strokeStyle = dark ? 'rgba(229,208,166,.1)' : 'rgba(103,77,41,.18)'; c.lineWidth = 1;
  for (let x = -100; x <= W + 100; x += 110) { c.beginPath(); c.moveTo(x, floor); c.lineTo(W / 2 + (x - W / 2) * 1.12, H); c.stroke(); }
  for (let i = 0; i < 25; i++) {
    const x = (i * 137) % W, y = floor + 14 + (i * 47) % Math.max(1, H - floor - 20);
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 3, x + 40, y); c.stroke();
  }
  if (!dark) {
    c.fillStyle = 'rgba(255,239,178,.24)';
    c.beginPath(); c.moveTo(wx + 12, floor); c.lineTo(wx + ww * .8, floor); c.lineTo(wx + ww + 100, H); c.lineTo(wx + 50, H); c.closePath(); c.fill();
  }
  const rugW = Math.min(W * .62, 950);
  oval(c, W * .31, floor + (H - floor) * .48, rugW * .5, (H - floor) * .34, dark ? '#8e7860' : '#e5c8a0');
  c.strokeStyle = dark ? '#ae9371' : '#c7a27c';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(W * .31, floor + (H - floor) * .48, rugW * (.44 + i * .02), (H - floor) * (.21 + i * .035), 0, 0, Math.PI * 2); c.stroke(); }
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2;
    const x = W * .31 + Math.cos(a) * rugW * .49, y = floor + (H - floor) * (.48 + Math.sin(a) * .32);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 4); c.stroke();
  }
  // A tiny framed flower leaves the middle of the playing space open.
  if (W > 700) {
    const fx = W * .79, fy = floor * .23, fs = Math.min(90, floor * .17);
    box(c, fx - fs * .55 + 4, fy - fs * .62 + 6, fs * 1.1, fs * 1.24, 9, dark ? '#273332' : '#ddc8ad');
    box(c, fx - fs * .55, fy - fs * .62, fs * 1.1, fs * 1.24, 8, wood);
    box(c, fx - fs * .45, fy - fs * .52, fs * .9, fs * 1.04, 3, dark ? '#d1c4a5' : '#fff5df');
    c.strokeStyle = '#738b67'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(fx, fy + fs * .36); c.quadraticCurveTo(fx - fs * .09, fy, fx + fs * .04, fy - fs * .13); c.stroke();
    oval(c, fx - fs * .1, fy + fs * .16, fs * .14, fs * .06, '#96aa7c', .5);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; oval(c, fx + Math.cos(a) * fs * .14, fy - fs * .16 + Math.sin(a) * fs * .14, fs * .13, fs * .085, '#dc967d', a); }
    oval(c, fx, fy - fs * .16, fs * .09, fs * .09, '#deb269');
  }
  // One plant and a few books at the edges leave a clear path for the voice.
  const s = Math.min(1.5, Math.max(.65, H / 660)), px = W - 75 * s, py = floor;
  c.save(); c.translate(px, py); c.scale(s, s);
  c.strokeStyle = dark ? '#8ca085' : '#667c53'; c.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const lx = Math.cos(i * 2.4) * (25 + i * 3), ly = -75 - i * 12;
    c.beginPath(); c.moveTo(0, -37); c.quadraticCurveTo(lx * .3, ly, lx, ly); c.stroke();
    oval(c, lx, ly, 19, 8, dark ? ['#71856b','#829478'][i % 2] : ['#78946a','#92aa79'][i % 2], lx > 0 ? -.5 : .5);
  }
  c.fillStyle = dark ? '#b17c60' : '#c88b67'; c.beginPath(); c.moveTo(-28,-43); c.lineTo(28,-43); c.lineTo(20,-2); c.lineTo(-20,-2); c.closePath(); c.fill();
  box(c, -31, -48, 62, 10, 3, dark ? '#cc9a77' : '#dfa881');
  for (let i = 0; i < 3; i++) { box(c, -115 + i * 4, -12 - i * 14, 67 - i * 3, 12, 2, ['#8f9d88','#ca9976','#e8d8b7'][i]); box(c, -109 + i * 4, -9 - i * 14, 55 - i * 3, 6, 1, '#e9debf'); }
  // Little blossoms make the plant read as an illustration at small sizes.
  for (const [x, y] of [[-24,-141],[25,-112]]) {
    for (let i = 0; i < 5; i++) oval(c, x + Math.cos(i * 1.256) * 6, y + Math.sin(i * 1.256) * 6, 5, 5, dark ? '#d1a593' : '#f0b79a');
    oval(c, x, y, 3, 3, '#e6c477');
  }
  c.restore();
}

/** Wool colours, light then shadow: the ball's terracotta, then the loops' honey, sage, rose and blue. */
export type Wool = readonly [string, string];
export const BALL_WOOL: Wool[] = [['#e59672', '#a65a43'], ['#d98161', '#9c5240'], ['#eda07d', '#ad6249'], ['#df8a68', '#a1563f']];
export const LOOP_WOOL: Wool[] = [['#d8a456', '#9c7232'], ['#86ad91', '#58806a'], ['#d9928d', '#a26260'], ['#87a6bd', '#5a7990']];

/** A strand of plied wool along the current path: a shadowed edge, the colour, then the twist of its plies (or, at 0, a smooth sheen). */
function stroke(c: Pen, [hi, lo]: Wool, w: number, twist = .4) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = lo; c.lineWidth = w * 1.35; c.stroke();
  c.strokeStyle = hi; c.lineWidth = w; c.stroke();
  if (twist) { c.lineCap = 'butt'; c.setLineDash([w * 1.1, w * .7]); }
  c.strokeStyle = `rgba(255,240,220,${twist || .26})`; c.lineWidth = w * .3; c.stroke();
  c.setLineDash([]); c.lineCap = 'round';
}

type V3 = [number, number, number];
const unit = (v: V3): V3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// The axes the wool is wound around, crossing like a hand-wound ball; later ones lie on top.
const WRAPS = ([[.2, 1, .3], [1, .15, .25], [.55, -.5, .65], [-.6, -.45, .6], [.1, .4, -1], [-.9, .5, .2]] as V3[]).map((a) => {
  const axis = unit(a), u = unit(cross(axis, [0, 0, 1]));
  return { axis, u, w: cross(axis, u) };
});
const STRANDS = [-3, -2, -1, 0, 1, 2, 3].map((j) => j * .11);
const STEPS = 44;

/**
 * The ball of yarn: bundles of strands wound round a sphere, each drawn where it faces you, so the
 * wraps cross and turn like real wool as it rolls (`spin`) and tumbles (`tumble`). `bands` are the
 * colours of threaded loops, wound on top; `squash` flattens it a touch as it lands.
 */
export function paintYarnBall(c: Pen, x: number, y: number, r: number, spin: number, tumble = 0, bands: Wool[] = [], squash = 0) {
  c.save(); c.translate(x, y + r); c.scale(1 + squash, 1 - squash); c.translate(0, -r);
  const fill = c.createRadialGradient(-r * .35, -r * .4, 0, 0, 0, r);
  fill.addColorStop(0, '#f2a985'); fill.addColorStop(.7, '#cf7656'); fill.addColorStop(1, '#9d5440');
  c.fillStyle = fill; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.save(); c.clip();
  const ct = Math.cos(tumble), st = Math.sin(tumble), cs = Math.cos(spin), ss = Math.sin(spin);
  const first = WRAPS.length - bands.length;
  WRAPS.forEach(({ axis, u, w }, k) => {
    const wool = k >= first ? bands[k - first] : BALL_WOOL[k % BALL_WOOL.length];
    for (const lat of STRANDS) {
      // each strand on its own, so the grooves between them show
      c.beginPath();
      const cl = Math.cos(lat), sl = Math.sin(lat);
      let drawing = false;
      for (let i = 0; i <= STEPS; i++) {
        const a = i / STEPS * Math.PI * 2, ca = Math.cos(a) * cl, sa = Math.sin(a) * cl;
        const px = ca * u[0] + sa * w[0] + sl * axis[0], py = ca * u[1] + sa * w[1] + sl * axis[1], pz = ca * u[2] + sa * w[2] + sl * axis[2];
        // tumble about the vertical, then roll about the line of sight
        const tx = px * ct + pz * st, tz = pz * ct - px * st;
        if (tz < -.05) { drawing = false; continue; }
        const sx = (tx * cs - py * ss) * r, sy = (tx * ss + py * cs) * r;
        if (drawing) c.lineTo(sx, sy); else { c.moveTo(sx, sy); drawing = true; }
      }
      stroke(c, wool, r * .085, 0);
    }
  });
  // light from the upper left, the far side in shadow
  const shade = c.createRadialGradient(-r * .4, -r * .45, r * .05, 0, 0, r * 1.02);
  shade.addColorStop(0, 'rgba(255,236,214,.34)'); shade.addColorStop(.45, 'rgba(255,236,214,0)');
  shade.addColorStop(.78, 'rgba(98,44,30,.12)'); shade.addColorStop(1, 'rgba(78,34,24,.5)');
  c.fillStyle = shade; c.fillRect(-r, -r, r * 2, r * 2);
  c.restore();
  // a soft halo of loose fibres
  c.strokeStyle = 'rgba(232,160,124,.38)'; c.lineWidth = Math.max(.5, r * .016);
  for (let i = 0; i < 40; i++) {
    const a = i * 2.39996 + spin, reach = r * (1.015 + (i % 3) * .012);
    c.beginPath(); c.moveTo(Math.cos(a) * r * .97, Math.sin(a) * r * .97);
    c.quadraticCurveTo(Math.cos(a + .03) * reach, Math.sin(a + .03) * reach, Math.cos(a + .07) * reach, Math.sin(a + .07) * reach); c.stroke();
  }
  c.restore();
}

/** The loose end of the yarn: a strand of the same wool along any path. */
export function paintThread(c: Pen, trace: () => void, w: number) {
  c.beginPath(); trace(); stroke(c, BALL_WOOL[0], w, .5);
}

/**
 * A loop of wool hanging on a thread from the lights, tied with a little bow. Drawn in parts: the
 * hanger and back half before the yarn, the front half after, so the yarn passes through it. `glow`
 * (0..1) is how lined up the yarn is; `faded` once it has drifted by.
 */
export function paintLoop(c: Pen, o: { x: number; y: number; ry: number; hang: number; sway: number; open: number; wool: Wool; w: number; glow: number; faded: boolean; dark: boolean }, part: 'hanger' | 'back' | 'front') {
  const { x, y, ry, hang, sway, open, wool, w, glow, faded, dark } = o;
  const rx = ry * (.42 + open), top = y - ry * (1 + open);
  c.save();
  // swing gently from where it hangs
  c.translate(x, hang); c.rotate(sway); c.translate(-x, -hang);
  c.globalAlpha = faded ? .5 : 1;
  const half = (back: boolean) => { c.beginPath(); c.ellipse(x, y, rx, ry * (1 + open), 0, back ? Math.PI / 2 : -Math.PI / 2, back ? Math.PI * 1.5 : Math.PI / 2); };
  if (part === 'hanger') {
    c.strokeStyle = dark ? 'rgba(255,232,210,.32)' : 'rgba(92,66,44,.34)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, hang); c.lineTo(x, top); c.stroke();
    // its soft shadow on the wall behind
    c.save(); c.translate(w * .7, w); c.beginPath(); c.ellipse(x, y, rx, ry * (1 + open), 0, 0, Math.PI * 2);
    c.strokeStyle = dark ? 'rgba(0,0,0,.22)' : 'rgba(80,52,30,.13)'; c.lineWidth = w * 1.2; c.stroke(); c.restore();
  } else if (part === 'back') {
    half(true); stroke(c, [wool[1], wool[1]], w, .16);
  } else {
    if (glow > .01) {
      c.save(); c.beginPath(); c.ellipse(x, y, rx, ry * (1 + open), 0, 0, Math.PI * 2);
      c.shadowColor = dark ? 'rgba(255,210,140,.95)' : 'rgba(255,214,150,1)'; c.shadowBlur = 22 * glow;
      c.strokeStyle = `rgba(255,236,196,${.6 * glow})`; c.lineWidth = w * (1.4 + glow); c.stroke(); c.restore();
    }
    half(false); stroke(c, wool, w * (1 + glow * .15), .42);
    // the knot and its bow at the top
    for (const side of [-1, 1]) { c.beginPath(); c.ellipse(x + side * w * .95, top - w * .5, w * 1.05, w * .5, side * .55, 0, Math.PI * 2); stroke(c, wool, w * .4, .2); }
    c.fillStyle = wool[1]; c.beginPath(); c.arc(x, top, w * .7, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** A string of warm lights along the top of the wall: a fabric cord that sags between hooks, small glass bulbs. */
export function paintLights(c: Pen, W: number, wireY: (x: number) => number, gap: number, glowAt: (x: number) => number, dark: boolean) {
  c.lineCap = 'round';
  const cord = (dy: number) => { c.beginPath(); for (let x = 0; x <= W; x += 6) (x ? c.lineTo(x, wireY(x) + dy) : c.moveTo(x, wireY(x) + dy)); c.stroke(); };
  c.strokeStyle = dark ? 'rgba(0,0,0,.25)' : 'rgba(84,58,36,.12)'; c.lineWidth = 2; cord(4);
  c.strokeStyle = dark ? '#5e5243' : '#6f5b46'; c.lineWidth = 1.5; cord(0);
  for (let x = gap / 2; x < W + gap; x += gap) {
    const y = wireY(x), k = glowAt(x), by = y + 8, reach = dark ? 26 : 16;
    const halo = c.createRadialGradient(x, by, 0, x, by, reach);
    halo.addColorStop(0, `rgba(255,198,112,${(dark ? .5 : .3) * k})`); halo.addColorStop(1, 'rgba(255,198,112,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(x, by, reach, 0, Math.PI * 2); c.fill();
    box(c, x - 2, y, 4, 4, 1, dark ? '#4f463a' : '#5f4c39');
    const glass = c.createRadialGradient(x - 1, by - 1.5, .3, x, by, 5);
    glass.addColorStop(0, '#fffbe8'); glass.addColorStop(.5, '#ffe0a0'); glass.addColorStop(1, `rgba(236,166,84,${.7 + .3 * k})`);
    c.fillStyle = glass; c.beginPath(); c.ellipse(x, by, 3.4, 4.8, 0, 0, Math.PI * 2); c.fill();
  }
}

/** One end of your range: a running stitch across the wall with its note on a small paper tag. */
export function paintRangeMark(c: Pen, W: number, y: number, label: string, above: boolean, dark: boolean, narrow: boolean) {
  c.save();
  c.setLineDash([8, 7]); c.lineCap = 'round';
  c.strokeStyle = dark ? 'rgba(255,232,206,.3)' : 'rgba(118,78,48,.3)'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  c.setLineDash([]);
  c.font = `550 ${narrow ? 11 : 12}px "Geist Variable", system-ui, sans-serif`;
  const h = narrow ? 20 : 22, pw = c.measureText(label).width + 20;
  const px = narrow ? W - pw - 10 : 12, py = above ? y - h - 5 : y + 5;
  c.shadowColor = dark ? 'rgba(0,0,0,.35)' : 'rgba(84,58,36,.16)'; c.shadowBlur = 6; c.shadowOffsetY = 1;
  box(c, px, py, pw, h, h / 2, dark ? 'rgba(34,40,40,.86)' : 'rgba(255,249,238,.9)');
  c.shadowColor = 'transparent';
  c.fillStyle = dark ? '#e3d6c0' : '#6a5b48'; c.textBaseline = 'middle';
  c.fillText(label, px + 10, py + h / 2 + .5);
  c.restore();
}

export function paintYarnCat(c: Pen, x: number, floor: number, s: number, phase: number, look: number, dark: boolean, moving: boolean, dozing: boolean, pose = { hop: 0, reach: 0, blink: false }, art?: YarnArt) {
  const sprite = art && (dozing ? art.rest : pose.reach > .25 || pose.hop > .3 ? art.reach : art.kitten);
  if (sprite && artReady(sprite)) {
    c.save(); c.translate(x, floor);
    oval(c, 0, s * .015, s * (.68 - pose.hop * .1), s * .075, dark ? 'rgba(12,18,20,.32)' : 'rgba(65,43,26,.24)');
    const bob = moving ? Math.sin(phase * 2) * s * .018 : 0;
    c.translate(0, bob - pose.hop * s * .12);
    c.scale(1 + pose.hop * .018, 1 - pose.hop * .025);
    c.drawImage(sprite, -s * .95, -s * 1.3, s * 2, s * 4 / 3);
    c.restore(); return;
  }
  const fur = dark ? '#707d7c' : '#536361', cream = '#fff0d9', shade = dark ? '#536160' : '#405350';
  c.save(); c.translate(x, floor); c.scale(s, s);
  c.lineCap = 'round'; c.lineJoin = 'round';
  oval(c, 0, .02, .66 - pose.hop * .1, .075, 'rgba(40,49,38,.18)');
  if (dozing) {
    oval(c, -.03, -.25, .52, .29, fur);
    oval(c, .27, -.23, .27, .21, cream);
    c.fillStyle = fur; c.beginPath(); c.moveTo(.04,-.33); c.lineTo(.05,-.59); c.lineTo(.25,-.42); c.lineTo(.43,-.56); c.lineTo(.53,-.29); c.fill();
    oval(c, .3, -.3, .24, .18, fur); oval(c, .34, -.23, .17, .1, cream);
    c.strokeStyle = shade; c.lineWidth = .018;
    for (const ex of [.21,.4]) { c.beginPath(); c.arc(ex,-.29,.045,0,Math.PI); c.stroke(); }
    oval(c, .32, -.22, .025, .018, '#ce8c7b');
    c.strokeStyle = shade; c.lineWidth = .15; c.beginPath(); c.moveTo(-.4,-.31); c.bezierCurveTo(-.7,.02,.16,.05,.17,-.12); c.stroke();
    c.restore(); return;
  }
  c.translate(0, -pose.hop * .15 + (moving ? Math.cos(phase * 2) * .016 : 0));
  const sway = moving ? Math.sin(phase * .45) * .09 : pose.hop * .13;
  c.strokeStyle = shade; c.lineWidth = .145;
  c.beginPath(); c.moveTo(-.36,-.33); c.bezierCurveTo(-.88,-.33,-.81 + sway,-.92,-.57 + sway,-.83); c.stroke();
  c.strokeStyle = fur; c.lineWidth = .09; c.stroke();
  for (const [leg, offset] of [[-.25,0],[.25,Math.PI]]) {
    const step = moving ? Math.sin(phase + offset) * .07 : 0;
    box(c, leg + step, -.31, .14, .29, .07, shade); oval(c, leg + step + .08,-.035,.095,.055,cream);
  }
  oval(c, -.04, -.39, .46, .3, fur, -.12);
  oval(c, .23, -.38, .2, .24, cream, -.2);
  const step = moving ? Math.sin(phase + Math.PI) * .065 : 0;
  box(c, -.36 + step, -.28, .16, .26, .07, fur); oval(c, -.27 + step,-.04,.12,.06,cream);
  const reach = moving ? 0 : Math.max(pose.reach * .75, pose.hop);
  c.save(); c.translate(.28,-.36); c.rotate(-reach * 1.25);
  box(c, -.055, 0, .15, .32, .07, fur); oval(c,.025,.31,.115,.065,cream); c.restore();
  c.save(); c.translate(.28, -.76); c.rotate(look * .45);
  c.fillStyle = fur; c.beginPath(); c.moveTo(-.3,-.04); c.quadraticCurveTo(-.37,-.49,-.27,-.46); c.lineTo(-.06,-.28); c.lineTo(.12,-.27); c.quadraticCurveTo(.35,-.55,.36,-.4); c.lineTo(.38,-.01); c.closePath(); c.fill();
  c.fillStyle = '#e1a598';
  for (const side of [-1,1]) { c.beginPath(); c.moveTo(side * .23,-.19); c.lineTo(side * .29,-.36); c.lineTo(side * .11,-.22); c.closePath(); c.fill(); }
  oval(c, .025,-.015,.35,.285,fur);
  c.fillStyle = cream; c.beginPath(); c.moveTo(.01,-.25); c.bezierCurveTo(-.04,-.12,-.02,-.06,-.15,.04); c.quadraticCurveTo(-.22,.21,.04,.23); c.quadraticCurveTo(.34,.21,.23,.04); c.quadraticCurveTo(.08,-.05,.01,-.25); c.fill();
  for (const eye of [-.13,.195]) {
    if (pose.blink || pose.hop > .4) {
      c.strokeStyle = cream; c.lineWidth = .024; c.beginPath(); c.arc(eye,-.04,.06,Math.PI * 1.1,Math.PI * 1.9); c.stroke();
    } else {
      oval(c,eye,-.05,.075,.092,'#f6e5b5'); oval(c,eye + .014,-.045 + look * .025,.04,.063,'#283f3b');
      oval(c,eye + .03,-.077,.019,.023,'#fffaf0');
    }
  }
  for (const cheek of [-.2,.25]) oval(c,cheek,.085,.052,.027,'#d49a88');
  c.fillStyle = '#c57d72'; c.beginPath(); c.moveTo(.015,.065); c.quadraticCurveTo(.06,.045,.1,.065); c.quadraticCurveTo(.07,.12,.055,.112); c.closePath(); c.fill();
  c.strokeStyle = shade; c.lineWidth = .012;
  c.beginPath(); c.moveTo(.055,.11); c.quadraticCurveTo(.025,.17,-.012,.135); c.moveTo(.055,.11); c.quadraticCurveTo(.09,.17,.125,.13); c.stroke();
  c.strokeStyle = dark ? '#d4d1bc' : '#7a8476'; c.lineWidth = .009;
  for (const side of [-1,1]) for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(side * .2,.1); c.lineTo(side * .43,.055 + i * .075); c.stroke(); }
  c.restore(); c.restore();
}
