import * as T from 'three';

function random(seed: number) {
  let n = seed;
  return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Small, repeatable brush marks stay on surfaces as the camera moves. */
export function paintedTexture(wood = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d')!;
  const r = random(wood ? 19 : 42);
  g.fillStyle = '#e5e8e0'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4800; i++) {
    const v = Math.floor(140 + r() * 110);
    g.fillStyle = `rgba(${v},${v},${v - 5},${0.06 + r() * 0.12})`;
    const x = r() * 512, y = r() * 512, w = wood ? 20 + r() * 170 : 3 + r() * 20;
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x + w, y - 1 - r() * 4);
    g.lineTo(x + w - 3, y + 2 + r() * 8); g.lineTo(x - 2, y + 4); g.fill();
  }
  if (wood) {
    g.lineWidth = 0.7;
    for (let i = 0; i < 150; i++) {
      const y = r() * 512;
      g.strokeStyle = `rgba(67,67,59,${r() * 0.23})`;
      g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(140, y + r() * 12, 300, y - r() * 9, 512, y + r() * 4); g.stroke();
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function palette() {
  const paint = paintedTexture(), grain = paintedTexture(true);
  const ramp = new T.DataTexture(new Uint8Array([110, 160, 202, 239]), 4, 1, T.RedFormat);
  ramp.minFilter = ramp.magFilter = T.NearestFilter;
  ramp.needsUpdate = true;
  const materials: T.Material[] = [];
  function make(color: string, wood = false) {
    const mat = new T.MeshToonMaterial({ color, map: wood ? grain : paint, gradientMap: ramp });
    materials.push(mat); return mat;
  }
  const maps: T.Texture[] = [];
  const result = {
    wall: make('#b3d7d0'), wood: make('#b4ac88', true), edge: make('#748f83', true),
    floor: make('#7e9f98', true), teal: make('#6da8a4'), dark: make('#325f65'),
    wire: make('#9ebfba'), paper: make('#f6edcf'), cloth: make('#e0eee0'),
    terracotta: make('#c19483'), leaf: make('#65977c'), leafLight: make('#b5c98a'),
    pink: make('#cbb0a7'), book: make('#668e98'),
    applyAtlas(atlas: T.Texture) {
      const tile = (x: number, y: number) => {
        const t = atlas.clone(); t.colorSpace = T.SRGBColorSpace;
        // Inset each tile slightly so mipmap sampling doesn't pick up its neighbour.
        t.repeat.set(0.492, 0.492); t.offset.set(x + 0.004, y + 0.004); t.needsUpdate = true;
        maps.push(t); return t;
      };
      const wood = tile(0, 0.5), wall = tile(0.5, 0.5), cloth = tile(0, 0), enamel = tile(0.5, 0);
      for (const [mat, map, color] of [
        [result.wall, wall, '#ffffff'], [result.wood, wood, '#f4efdf'], [result.edge, wood, '#9aafa2'],
        [result.floor, wood, '#b1c4b9'], [result.cloth, cloth, '#ffffff'], [result.teal, enamel, '#d4ece3'],
      ] as const) { mat.map = map; mat.color.set(color); mat.needsUpdate = true; }
    },
    dispose() { materials.forEach(m => m.dispose()); maps.forEach(t => t.dispose()); paint.dispose(); grain.dispose(); ramp.dispose(); },
  };
  return result;
}
export type Palette = ReturnType<typeof palette>;

/** A painted sun patch, with irregular gaps between clusters of leaves. */
export function sunPatch() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!; const r = random(7);
  g.fillStyle = 'rgba(255,245,184,0.5)'; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 155; i++) {
    const x = r() * 512, y = r() * 512;
    g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`;
    g.beginPath(); g.ellipse(x, y, 10 + r() * 25, 5 + r() * 10, r() * 6, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#000'; g.fillRect(247, 0, 15, 512); g.fillRect(0, 230, 512, 13);
  const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
