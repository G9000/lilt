export interface CatPose { ear: number; tail: number }
export const CAT_SPRITE_WIDTH = 660, CAT_SPRITE_HEIGHT = 330;

// The five cutouts share these landmarks; each field fades out before the face and paws.
const joints = [
  { part: 'ear', x: .585, y: .27, rx: .10, ry: .25, dx: -4, dy: 2.2 },
  { part: 'ear', x: .932, y: .245, rx: .09, ry: .24, dx: 3.2, dy: 1.6 },
  { part: 'tail', x: .59, y: .86, rx: .105, ry: .12, dx: 3, dy: -4.2 },
] as const;

export function catLocalPose(t: number, reduced = false, sleeping = true): CatPose {
  if (reduced || !sleeping) return { ear: 0, tail: 0 };
  const phase = t % 23;
  const pulse = (start: number, duration: number) => {
    const p = (phase - start) / duration;
    return p > 0 && p < 1 ? Math.sin(Math.PI * p) ** 2 : 0;
  };
  const tailProgress = (phase - 11.5) / 2.8;
  const tailWindow = pulse(11.5, 2.8);
  return { ear: pulse(3.2, .36) + .55 * pulse(3.72, .3),
    tail: tailWindow ? Math.sin(Math.PI * 2 * tailProgress) * tailWindow : 0 };
}

function influence(x: number, y: number, joint: typeof joints[number]) {
  return Math.max(0, 1 - ((x - joint.x) / joint.rx) ** 2 - ((y - joint.y) / joint.ry) ** 2) ** 2;
}

/** Normalized cutout coordinates; displacement is in painting pixels. */
export function catOffset(x: number, y: number, pose: CatPose) {
  let dx = 0, dy = 0;
  for (const joint of joints) {
    const amount = pose[joint.part], weight = influence(x, y, joint);
    dx += joint.dx * amount * weight;
    dy += joint.dy * (joint.part === 'tail' ? Math.abs(amount) : amount) * weight;
  }
  return { x: dx, y: dy };
}

interface Sprite { canvas: HTMLCanvasElement; revision: number }
function makePuppet(image: HTMLImageElement) {
  const width = CAT_SPRITE_WIDTH, height = CAT_SPRITE_HEIGHT;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.dataset.catSource = image.src;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  const original = context.getImageData(0, 0, width, height).data;
  const patches = joints.map(joint => {
    const x = Math.max(0, Math.floor((joint.x - joint.rx) * width));
    const y = Math.max(0, Math.floor((joint.y - joint.ry) * height));
    const w = Math.min(width, Math.ceil((joint.x + joint.rx) * width)) - x;
    const h = Math.min(height, Math.ceil((joint.y + joint.ry) * height)) - y;
    const weights = new Float32Array(w * h);
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      weights[row * w + col] = influence((x + col) / width, (y + row) / height, joint);
    }
    return { joint, x, y, w, h, weights, pixels: context.createImageData(w, h) };
  });
  const sprite: Sprite = { canvas, revision: 0 };
  let previous = '';
  return (pose: CatPose) => {
    const ear = Math.round(pose.ear * 32) / 32, tail = Math.round(pose.tail * 32) / 32;
    const key = `${ear}/${tail}`;
    if (key === previous) return sprite;
    previous = key; sprite.revision++;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    for (const patch of patches) {
      const amount = patch.joint.part === 'ear' ? ear : tail;
      if (!amount) continue;
      const dx = patch.joint.dx * amount * 2;
      const dy = patch.joint.dy * (patch.joint.part === 'tail' ? Math.abs(amount) : amount) * 2;
      const pixels = patch.pixels.data;
      for (let row = 0; row < patch.h; row++) for (let col = 0; col < patch.w; col++) {
        const p = row * patch.w + col, out = p * 4, weight = patch.weights[p];
        const x = Math.max(0, Math.min(width - 1.001, patch.x + col - dx * weight));
        const y = Math.max(0, Math.min(height - 1.001, patch.y + row - dy * weight));
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const a = (iy * width + ix) * 4, b = a + 4, c = a + width * 4, d = c + 4;
        // Interpolate premultiplied colour to preserve soft fur edges against transparency.
        const wa = (1 - fx) * (1 - fy) * original[a + 3], wb = fx * (1 - fy) * original[b + 3];
        const wc = (1 - fx) * fy * original[c + 3], wd = fx * fy * original[d + 3];
        const alpha = wa + wb + wc + wd;
        pixels[out + 3] = alpha;
        for (let channel = 0; channel < 3; channel++) pixels[out + channel] = alpha
          ? (original[a + channel] * wa + original[b + channel] * wb + original[c + channel] * wc + original[d + channel] * wd) / alpha : 0;
      }
      context.putImageData(patch.pixels, patch.x, patch.y);
    }
    return sprite;
  };
}

const puppets = new WeakMap<HTMLImageElement, ReturnType<typeof makePuppet>>();
export function renderCatPuppet(image: HTMLImageElement, pose: CatPose): Sprite | null {
  if (!puppets.has(image)) {
    try { puppets.set(image, makePuppet(image)); }
    catch { puppets.set(image, null); } // Pixel-read restrictions still leave the original cat visible.
  }
  return puppets.get(image)?.(pose) ?? null;
}

const outlines = new WeakMap<HTMLCanvasElement, { source: CanvasImageSource; revision: number }>();
export function syncCatOutline(target: HTMLCanvasElement, source: CanvasImageSource, revision: number) {
  const last = outlines.get(target);
  if (last?.source === source && last.revision === revision) return;
  const context = target.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(source, 0, 0, target.width, target.height);
  outlines.set(target, { source, revision });
}
