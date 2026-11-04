/** Illustrations for Yarn, independent of microphone input and the game rules. */
type Pen = CanvasRenderingContext2D;
const oval = (c: Pen, x: number, y: number, rx: number, ry: number, color: string, angle = 0) => {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); c.fill();
};
function box(c: Pen, x: number, y: number, w: number, h: number, r: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
}

/** Static scenery is painted to a separate canvas only when its size or theme changes. */
export function paintYarnRoom(c: Pen, W: number, H: number, floor: number, dark: boolean) {
  const wall = dark ? '#303b3a' : '#ede4d2', wood = dark ? '#6c6352' : '#a18a69';
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
  const rugW = Math.min(W * .62, 950);
  oval(c, W * .31, floor + (H - floor) * .48, rugW * .5, (H - floor) * .34, dark ? '#8e7860' : '#e5c8a0');
  c.strokeStyle = dark ? '#ae9371' : '#c7a27c';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(W * .31, floor + (H - floor) * .48, rugW * (.44 + i * .02), (H - floor) * (.21 + i * .035), 0, 0, Math.PI * 2); c.stroke(); }
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
  c.restore();
}

export function paintYarnBall(c: Pen, x: number, y: number, r: number, spin: number) {
  c.save(); c.translate(x, y);
  const fill = c.createRadialGradient(-r * .4, -r * .45, 0, 0, 0, r * 1.1);
  fill.addColorStop(0, '#efb08b'); fill.addColorStop(.6, '#d78158'); fill.addColorStop(1, '#9c4e35');
  c.fillStyle = fill; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.clip();
  c.rotate(spin * .45);
  c.lineCap = 'round';
  for (let group = 0; group < 3; group++) {
    c.save(); c.rotate(group * 1.1);
    for (let j = -4; j <= 4; j++) {
      c.strokeStyle = '#a9583c'; c.lineWidth = Math.max(1, r * .08);
      c.beginPath(); c.moveTo(-r * 1.1, j * r * .2); c.bezierCurveTo(-r * .4, j * r * .2 - r * .5, r * .5, j * r * .2 - r * .35, r * 1.1, j * r * .2 + r * .3); c.stroke();
      c.strokeStyle = group === 2 ? '#f3bf92' : '#e9a67b'; c.lineWidth = Math.max(.7, r * .045); c.stroke();
    }
    c.restore();
  }
  c.restore();
  c.strokeStyle = '#9d593e'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
}

export function paintYarnCat(c: Pen, x: number, floor: number, s: number, phase: number, look: number, dark: boolean, moving: boolean, dozing: boolean) {
  const fur = dark ? '#505754' : '#4c504a', cream = '#f2e7ce', shade = dark ? '#3c4441' : '#3d423d';
  c.save(); c.translate(x, floor); c.scale(s, s);
  oval(c, 0, .01, .66, .07, 'rgba(51,43,29,.15)');
  const bob = moving ? Math.cos(phase * 2) * .012 : 0;
  c.translate(0, bob);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const sway = moving ? Math.sin(phase * .45) * .06 : 0;
  c.strokeStyle = fur; c.lineWidth = .12;
  c.beginPath(); c.moveTo(-.37,-.4); c.bezierCurveTo(-.8,-.37,-.75 + sway,-.92,-.56 + sway,-.84); c.stroke();
  // Far paws, full body, then near paws and the chest: every part has a visible attachment.
  for (const [leg, offset] of [[-.25,0],[.27,Math.PI]]) {
    const step = moving ? Math.sin(phase + offset) * .06 : 0;
    box(c, leg + step, -.34, .12, .33, .055, shade); oval(c, leg + step + .075,-.025,.085,.045,cream);
  }
  oval(c, -.03, -.42, .43, .25, fur, -.08);
  oval(c, .22, -.37, .18, .2, cream, -.2);
  for (const [leg, offset] of [[-.38,Math.PI],[.3,0]]) {
    const step = moving ? Math.sin(phase + offset) * .055 : 0;
    box(c, leg + step, -.32, .13, .29, .06, fur); oval(c, leg + step + .08,-.035,.095,.045,cream);
  }
  c.save(); c.translate(.34, -.71); c.rotate(look * .65);
  c.fillStyle = fur; c.beginPath(); c.moveTo(-.23,-.07); c.lineTo(-.23,-.36); c.quadraticCurveTo(-.08,-.31,-.04,-.21); c.lineTo(.1,-.21); c.lineTo(.26,-.36); c.lineTo(.29,-.03); c.closePath(); c.fill();
  c.fillStyle = '#c99686';
  for (const side of [-1,1]) { c.beginPath(); c.moveTo(side * .16,-.16); c.lineTo(side * .21,-.29); c.lineTo(side * .09,-.19); c.closePath(); c.fill(); }
  oval(c, .015,-.025,.27,.23,fur); oval(c, .05,.065,.19,.115,cream);
  c.fillStyle = cream; c.beginPath(); c.moveTo(-.03,-.21); c.lineTo(.04,-.02); c.lineTo(.12,.08); c.lineTo(-.08,.08); c.closePath(); c.fill();
  for (const eye of [-.1,.15]) {
    if (dozing) { c.strokeStyle = '#d7c895'; c.lineWidth = .018; c.beginPath(); c.arc(eye,-.055,.045,.12 * Math.PI,.88 * Math.PI); c.stroke(); }
    else { oval(c,eye,-.06,.044,.052,'#c8b97b'); oval(c,eye + .006,-.062,.015,.037,'#303832'); oval(c,eye + .018,-.08,.009,.011,'#fff6df'); }
  }
  oval(c,.055,.04,.027,.018,'#b77d6d');
  c.strokeStyle = '#8e8777'; c.lineWidth = .008;
  for (const side of [-1,1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(side * .12,.07); c.lineTo(side * .34,.025 + i * .045); c.stroke(); }
  c.restore(); c.restore();
}
