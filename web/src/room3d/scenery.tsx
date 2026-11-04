import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MAIN_SCREEN, roomUrl, SIDE_SCREEN, type Light } from "../room/scene";
import { ROOM, WINDOW } from "./layout";
import { Ball, Box, Cyl, Kenney, type Pos, Ring, Rod, Toon, useCrop } from "./parts";

/**
 * The painted room's fixed scenery, in 3D: the walls and the tall window onto the city, the long
 * desk with its three screens, mic, speakers and things, the shelves of figures at the back left,
 * string lights along the beam and vines hanging down. Laid out to match the painting.
 */

export type Mood = {
  sky: [string, string]; city: string; haze: string; bg: string;
  ambient: [string, number]; sun: [string, number]; sunAt: Pos; disc: [string, number, Pos];
  lamp: number; screen: number; bulbs: number; windows: number;
};
export const MOODS: Record<Light, Mood> = {
  morning: { sky: ["#9cb7e8", "#f6d6c8"], city: "#b7a9cf", haze: "#e9d2d2", bg: "#2c2533", ambient: ["#ffe6dc", 1.05], sun: ["#ffd3a6", 2.3], sunAt: [-4, 3.5, -9], disc: ["#fff1d6", 9, [-90, 26, -260]], lamp: 0.5, screen: 0.8, bulbs: 0.25, windows: 0.05 },
  day: { sky: ["#6f9fe0", "#d4e6f7"], city: "#9fb0d8", haze: "#d8e5f3", bg: "#25293a", ambient: ["#f3f0ff", 1.25], sun: ["#fff3dc", 2.6], sunAt: [3, 7, -7], disc: ["#fffbe8", 10, [60, 110, -260]], lamp: 0.35, screen: 0.7, bulbs: 0.15, windows: 0 },
  sunset: { sky: ["#6f78c8", "#f4b6a6"], city: "#7e6eab", haze: "#d9a8bb", bg: "#2d2230", ambient: ["#d7b6dc", 0.95], sun: ["#ffad74", 2.7], sunAt: [6, 3.2, -7], disc: ["#fff2df", 12, [110, 14, -260]], lamp: 1, screen: 1, bulbs: 0.55, windows: 0.55 },
  night: { sky: ["#141a3c", "#3d3f78"], city: "#2a2c58", haze: "#2c2d5a", bg: "#0f1122", ambient: ["#6d74b8", 0.7], sun: ["#9fb4ff", 0.55], sunAt: [3, 6, -8], disc: ["#e6eeff", 5, [90, 34, -260]], lamp: 3, screen: 1.3, bulbs: 1, windows: 1 },
};

// How far forward the window runs along the right wall.
const SIDE_GLASS = 0.4;
const WALL = "#ead7cb", WALL_LEFT = "#e2cdc3", FLOOR = "#b8998a", FRAME = "#4b434e", WOOD = "#c49a6c", METAL = "#55505c", DARK = "#2b2832";

/* ---------- the shell ---------- */

export function Shell() {
  const t = 0.1, back = ROOM.z0 - t / 2, w = ROOM.x1 - ROOM.x0;
  const wx = (WINDOW.x0 + WINDOW.x1) / 2, ww = WINDOW.x1 - WINDOW.x0;
  return (
    <group>
      <Box at={[(ROOM.x0 + ROOM.x1) / 2, -0.05, (ROOM.z0 + ROOM.z1) / 2]} size={[w, 0.1, ROOM.z1 - ROOM.z0]} color={FLOOR} outline={false} />
      {/* the back wall: solid to the window's left, below the window behind the desk, a strip above */}
      <Box at={[(ROOM.x0 + WINDOW.x0) / 2, ROOM.h / 2, back]} size={[WINDOW.x0 - ROOM.x0, ROOM.h, t]} color={WALL} outline={false} />
      <Box at={[wx, WINDOW.y0 / 2, back]} size={[ww, WINDOW.y0, t]} color={WALL} outline={false} />
      <Box at={[wx, (WINDOW.y1 + ROOM.h) / 2, back]} size={[ww, ROOM.h - WINDOW.y1, t]} color={WALL} outline={false} />
      {/* the window's frame: posts and bars as in the painting */}
      {[WINDOW.x0, 0.75, 2.45, WINDOW.x1 - 0.04].map((x, i) => <Box key={`p${i}`} at={[x, (WINDOW.y0 + WINDOW.y1) / 2, back + 0.05]} size={[i === 0 || i === 3 ? 0.12 : 0.09, WINDOW.y1 - WINDOW.y0, 0.14]} color={FRAME} />)}
      {[WINDOW.y0, 2.5, WINDOW.y1].map((y, i) => <Box key={`b${i}`} at={[wx, y, back + 0.05]} size={[ww, i === 1 ? 0.06 : 0.1, 0.14]} color={FRAME} />)}
      <Box at={[ROOM.x0 - t / 2, ROOM.h / 2, (ROOM.z0 + ROOM.z1) / 2]} size={[t, ROOM.h, ROOM.z1 - ROOM.z0]} color={WALL_LEFT} outline={false} />
      {/* the right wall: the window carries on round the corner, then plain wall to the front */}
      <Box at={[ROOM.x1 + t / 2, ROOM.h / 2, (SIDE_GLASS + ROOM.z1) / 2]} size={[t, ROOM.h, ROOM.z1 - SIDE_GLASS]} color={WALL_LEFT} outline={false} />
      <Box at={[ROOM.x1 + t / 2, WINDOW.y0 / 2, (ROOM.z0 + SIDE_GLASS) / 2]} size={[t, WINDOW.y0, SIDE_GLASS - ROOM.z0]} color={WALL_LEFT} outline={false} />
      <Box at={[ROOM.x1 + t / 2, (WINDOW.y1 + ROOM.h) / 2, (ROOM.z0 + SIDE_GLASS) / 2]} size={[t, ROOM.h - WINDOW.y1, SIDE_GLASS - ROOM.z0]} color={WALL_LEFT} outline={false} />
      {[-0.8, SIDE_GLASS].map((z, i) => <Box key={`r${i}`} at={[ROOM.x1, (WINDOW.y0 + WINDOW.y1) / 2, z]} size={[0.14, WINDOW.y1 - WINDOW.y0, 0.1]} color={FRAME} />)}
      {[WINDOW.y0, 2.5, WINDOW.y1].map((y, i) => <Box key={`rb${i}`} at={[ROOM.x1, y, (ROOM.z0 + SIDE_GLASS) / 2]} size={[0.14, i === 1 ? 0.06 : 0.1, SIDE_GLASS - ROOM.z0]} color={FRAME} />)}
      {/* the beam the string lights hang from, and skirting */}
      <Box at={[(ROOM.x0 + ROOM.x1) / 2, ROOM.h - 0.06, ROOM.z0 + 0.08]} size={[w, 0.12, 0.16]} color={FRAME} />
      <Box at={[(ROOM.x0 + WINDOW.x0) / 2, 0.05, ROOM.z0 + 0.01]} size={[WINDOW.x0 - ROOM.x0, 0.1, 0.02]} color="#d4bdb0" outline={false} />
      <Box at={[ROOM.x0 + 0.01, 0.05, (ROOM.z0 + ROOM.z1) / 2]} size={[0.02, 0.1, ROOM.z1 - ROOM.z0]} color="#d4bdb0" outline={false} />
    </group>
  );
}

/* ---------- outside: sky, sun and the city ---------- */

function rng(seed: number) { let s = seed; return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); }

/** A grid of windows; lit ones glow at night. */
function windowTexture(lit: boolean) {
  const c = document.createElement("canvas"), g = c.getContext("2d")!, R = rng(lit ? 7 : 3);
  c.width = 64; c.height = 128;
  g.fillStyle = lit ? "#1d1f40" : "#ffffff"; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 124; y += 10) for (let x = 5; x < 60; x += 9) {
    g.fillStyle = lit ? (R() < 0.42 ? (R() < 0.7 ? "#ffd89a" : "#bfe0ff") : "#2a2c52") : R() < 0.5 ? "#dfe6f5" : "#c9d3ea";
    g.fillRect(x, y, 5, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function Outside({ mood }: { mood: Mood }) {
  const city = useRef<THREE.InstancedMesh>(null);
  const day = useMemo(() => windowTexture(false), []), night = useMemo(() => windowTexture(true), []);
  const towers = useMemo(() => {
    const R = rng(132857), out: { x: number; z: number; w: number; d: number; h: number; k: number }[] = [];
    // Seen from high up: the city lies below the window, its tops near the horizon and the far ones hazier.
    for (let i = 0; i < 520; i++) {
      const z = -75 - R() * 150, far = (-z - 75) / 150;
      const top = -12 + R() * 9 + far * 14 + (R() < 0.05 ? 8 + R() * 10 : 0);
      out.push({ x: -200 + R() * 420, z, w: 3 + R() * 7, d: 3 + R() * 7, h: top + 45, k: 0.82 + R() * 0.3 });
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = city.current;
    if (!m) return;
    const o = new THREE.Object3D(), c = new THREE.Color();
    towers.forEach((b, i) => {
      o.position.set(b.x, b.h / 2 - 45, b.z); o.scale.set(b.w, b.h, b.d); o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(mood.windows > 0.5 ? "#ffffff" : mood.city).multiplyScalar(b.k));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [towers, mood]);
  const sky = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
    vertexShader: "varying float h; void main() { h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 bottom; varying float h; void main() { gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.02, 0.5, h)), 1.0); }",
  }), []);
  sky.uniforms.top.value.set(mood.sky[0]); sky.uniforms.bottom.value.set(mood.sky[1]);
  return (
    <group>
      <mesh material={sky}><sphereGeometry args={[400, 24, 16]} /></mesh>
      <mesh position={mood.disc[2]}><circleGeometry args={[mood.disc[1], 32]} /><meshBasicMaterial color={mood.disc[0]} toneMapped={false} fog={false} /></mesh>
      <instancedMesh ref={city} args={[undefined, undefined, towers.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial map={mood.windows > 0.5 ? night : day} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* ---------- the desk under the window ---------- */

/** A screen showing what the painting's screen shows. */
function Screen({ at, rot, size, crop, glow }: { at: Pos; rot?: Pos; size: [number, number]; crop: [number, number, number, number]; glow: number }) {
  const map = useCrop(roomUrl("day"), ...crop);
  return (
    <mesh position={at} rotation={rot}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} toneMapped={false} color={new THREE.Color(glow, glow, glow)} />
    </mesh>
  );
}

const quadBox = (q: [number, number][]): [number, number, number, number] => {
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  return [Math.min(...xs) + 4, Math.min(...ys) + 4, Math.max(...xs) - Math.min(...xs) - 8, Math.max(...ys) - Math.min(...ys) - 8];
};

export const DESK = { x0: -1, x1: 3.3, z0: -2, z1: -1.25, y: 0.75 };

export function DeskSet({ mood }: { mood: Mood }) {
  const y = DESK.y, zc = (DESK.z0 + DESK.z1) / 2, glow = mood.screen;
  return (
    <group>
      {/* the long desk and what stands under it */}
      <Box at={[(DESK.x0 + DESK.x1) / 2, y - 0.025, zc]} size={[DESK.x1 - DESK.x0, 0.05, DESK.z1 - DESK.z0]} color={WOOD} />
      {[[DESK.x0 + 0.05, DESK.z1 - 0.06], [DESK.x1 - 0.05, DESK.z1 - 0.06], [1.15, DESK.z1 - 0.06]].map(([x, z], i) => <Box key={i} at={[x, (y - 0.05) / 2, z]} size={[0.06, y - 0.05, 0.06]} color={METAL} />)}
      <Kenney file="cabinetBedDrawer" scale={2.6} at={[-0.62, 0, -1.6]} paint={{ wood: "#efe6da", _defaultMat: "#e3d8cc" }} />
      <Kenney file="cabinetBedDrawer" scale={2.4} at={[2.9, 0, -1.6]} paint={{ wood: "#efe6da", _defaultMat: "#e3d8cc" }} />
      <Box at={[1.45, 0.25, -1.62]} size={[0.22, 0.5, 0.46]} color="#28252d" />
      <Box at={[1.345, 0.25, -1.4]} size={[0.01, 0.42, 0.012]} color="#e8f2ff" emissive="#cfe6ff" glow={0.8 * glow} outline={false} />
      {/* the backpack */}
      <Box at={[2.1, 0.24, -1.42]} rot={[-0.12, 0.15, 0]} size={[0.36, 0.46, 0.2]} color="#d9cbd1" />
      <Box at={[2.1, 0.2, -1.31]} rot={[-0.12, 0.15, 0]} size={[0.28, 0.2, 0.06]} color="#cbbac2" />

      {/* a cabinet at the back with a plant on it, behind the left speaker */}
      <Box at={[-0.6, y + 0.36, -1.88]} size={[0.5, 0.72, 0.22]} color="#efe6da" />
      <Kenney file="pottedPlant" scale={1.5} at={[-0.62, y + 0.72, -1.88]} />
      <Kenney file="plantSmall1" scale={2.4} at={[-0.88, y, -1.62]} />

      {/* speakers either side */}
      <Kenney file="speaker" scale={0.9} at={[-0.28, y, -1.72]} paint={{ wood: DARK, metalMedium: "#77727f" }} />
      <Kenney file="speaker" scale={0.9} at={[2.68, y, -1.72]} rot={[0, -0.3, 0]} paint={{ wood: DARK, metalMedium: "#77727f" }} />

      {/* three screens: the city, the cherry blossom and the sleeping cat, as painted */}
      <Kenney file="computerScreen" scale={1.45} at={[0.12, y, -1.78]} paint={{ metal: "#3a3741" }} />
      <Screen at={[0.12, y + 0.27, -1.705]} size={[0.52, 0.27]} crop={[648, 356, 196, 104]} glow={glow} />
      <Kenney file="computerScreen" scale={2.1} at={[1.02, y, -1.78]} paint={{ metal: "#3a3741" }} />
      <Screen at={[1.02, y + 0.39, -1.672]} size={[0.76, 0.39]} crop={quadBox(MAIN_SCREEN)} glow={glow} />
      <group position={[1.98, y, -1.72]} rotation={[0, -0.22, 0]}>
        <Kenney file="computerScreen" scale={1.9} paint={{ metal: "#3a3741" }} />
        <Screen at={[0, 0.355, 0.1]} size={[0.69, 0.355]} crop={quadBox(SIDE_SCREEN)} glow={glow} />
      </group>
      <pointLight position={[1.0, y + 0.45, -1.3]} color="#ffc6e0" intensity={0.6 * glow} distance={2.2} decay={1.6} />

      {/* the mic on its arm, and the pop filter */}
      <Cyl at={[-0.18, y + 0.03, -1.92]} r={0.04} h={0.06} color={DARK} />
      <Rod a={[-0.18, y, -1.92]} b={[-0.18, y + 0.32, -1.92]} r={0.015} color={DARK} />
      <Rod a={[-0.18, y + 0.32, -1.92]} b={[0.08, y + 0.82, -1.76]} r={0.014} color={DARK} />
      <Rod a={[0.08, y + 0.82, -1.76]} b={[0.4, y + 0.66, -1.56]} r={0.013} color={DARK} />
      <Cyl at={[0.4, y + 0.53, -1.56]} r={0.045} h={0.2} color="#26232b" />
      <Ring at={[0.47, y + 0.53, -1.46]} rot={[0, 0.5, 0]} r={0.085} tube={0.008} color={DARK} />
      <Toon at={[0.47, y + 0.53, -1.46]} rot={[0, 0.5, 0]} color="#3a2f3d" opacity={0.85}><circleGeometry args={[0.08, 24]} /></Toon>

      {/* headphones, a mug, the stream deck, mouse and mat, iced coffee */}
      <Ring at={[0.1, y + 0.05, -1.42]} rot={[Math.PI / 2, 0, 0.6]} r={0.09} tube={0.012} arc={Math.PI} color={DARK} />
      <Cyl at={[0.02, y + 0.04, -1.47]} rot={[Math.PI / 2, 0, 0.6]} r={0.045} h={0.04} color={DARK} />
      <Cyl at={[0.17, y + 0.04, -1.35]} rot={[Math.PI / 2, 0, 0.6]} r={0.045} h={0.04} color={DARK} />
      <Cyl at={[0.6, y + 0.05, -1.66]} r={0.045} h={0.1} color="#fbf6f2" />
      <Ring at={[0.65, y + 0.05, -1.66]} rot={[0, 0, Math.PI / 2]} r={0.025} tube={0.007} color="#fbf6f2" />
      <Box at={[0.62, y + 0.02, -1.45]} size={[0.2, 0.03, 0.12]} color={DARK} />
      {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => (
        <Box key={`k${r}${c}`} at={[0.55 + c * 0.045, y + 0.037, -1.49 + r * 0.035]} size={[0.03, 0.006, 0.025]} color="#cfe6ff" emissive="#9fd0ff" glow={0.7 * glow} outline={false} />
      )))}
      <Box at={[1.48, y + 0.003, -1.42]} size={[0.46, 0.006, 0.3]} color="#3b3046" outline={false} />
      <Kenney file="computerMouse" scale={2.2} at={[1.5, y + 0.006, -1.42]} paint={{ metalDark: "#2f2a35" }} />
      <Cyl at={[1.66, y + 0.08, -1.62]} r={0.045} r2={0.038} h={0.16} color="#6b4430" opacity={0.85} />
      <Rod a={[1.67, y + 0.1, -1.62]} b={[1.7, y + 0.3, -1.63]} r={0.005} color="#3a2f3d" outline={false} />
      <Cyl at={[1.98, y + 0.05, -1.5]} r={0.04} h={0.1} color="#f4ead8" />

      {/* the tablet with its flowers, a camera, books and a pen cup */}
      <group position={[2.62, y, -1.38]} rotation={[0, -0.45, 0]}>
        <Box at={[0, 0.1, 0.02]} rot={[-0.3, 0, 0]} size={[0.36, 0.25, 0.015]} color={DARK} />
        <Screen at={[0, 0.1, 0.03]} rot={[-0.3, 0, 0]} size={[0.33, 0.22]} crop={[1414, 478, 136, 100]} glow={glow} />
      </group>
      <group position={[2.3, y, -1.33]} rotation={[0, -0.2, 0]}>
        <Box at={[0, 0.05, 0]} size={[0.15, 0.1, 0.08]} color={DARK} />
        <Cyl at={[0, 0.05, 0.06]} rot={[Math.PI / 2, 0, 0]} r={0.035} h={0.06} color="#1f1d23" />
      </group>
      <Kenney file="books" scale={2.2} at={[3.05, y, -1.38]} rot={[0, 1.4, 0]} />
      <Cyl at={[2.85, y + 0.06, -1.6]} r={0.04} h={0.12} color="#f4d9e4" />
      {[-0.015, 0.01, 0.02].map((dx, i) => <Rod key={i} a={[2.85 + dx, y + 0.08, -1.6]} b={[2.85 + dx * 2, y + 0.22, -1.6 + dx]} r={0.006} color={["#e7a1b9", "#3a2f3d", "#f3d27a"][i]} outline={false} />)}
      <Figure at={[0.32, y, -1.5]} rot={0.4} body="#f4f1ee" />
    </group>
  );
}

/* ---------- the shelves and rack at the back left ---------- */

export function Shelves() {
  const x0 = ROOM.x0 + 0.05, x1 = -1.85, z0 = ROOM.z0 + 0.03, z1 = -1.47, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, top = 2.45;
  const boards = [1.0, 1.42, 1.84, 2.26];
  return (
    <group>
      {[[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z], i) => <Box key={i} at={[x, top / 2, z]} size={[0.04, top, 0.04]} color={METAL} />)}
      {boards.map((y, i) => <Box key={i} at={[xc, y, zc]} size={[w, 0.035, d]} color={WOOD} />)}
      {/* the rack below: audio gear */}
      <Box at={[xc, 0.47, zc]} size={[w - 0.08, 0.94, d - 0.04]} color="#3a3640" />
      {[0.22, 0.5, 0.76].map((y, i) => (
        <group key={i}>
          <Box at={[xc, y, z1 - 0.03]} size={[w - 0.2, 0.17, 0.04]} color={["#c9c4cc", "#8e8995", "#d8d2da"][i]} />
          {[0, 1, 2, 3].map((k) => <Cyl key={k} at={[xc - 0.35 + k * 0.12, y, z1 + 0]} rot={[Math.PI / 2, 0, 0]} r={0.02} h={0.02} color="#2a272f" outline={false} />)}
        </group>
      ))}
      {/* the synth on the first shelf */}
      <Box at={[xc, 1.05, zc + 0.04]} size={[0.92, 0.06, 0.3]} color="#d8d3dc" />
      <Box at={[xc, 1.083, zc + 0.09]} size={[0.82, 0.012, 0.13]} color="#fbfbfb" outline={false} />
      {Array.from({ length: 11 }, (_, i) => <Box key={i} at={[xc - 0.37 + i * 0.074, 1.092, zc + 0.065]} size={[0.025, 0.012, 0.075]} color="#2a272f" outline={false} />)}
      {/* figures, books, headphones and plants */}
      {[["#f4f1ee", -2.95], ["#d9b38c", -2.7], ["#3a3436", -2.45], ["#f3c6d6", -2.2]].map(([c, x], i) => <Figure key={i} at={[x as number, 1.86, -1.68]} rot={0.3 - i * 0.2} body={c as string} />)}
      {[["#f3c6d6", -2.9], ["#f4f1ee", -2.62]].map(([c, x], i) => <Figure key={`t${i}`} at={[x as number, 2.28, -1.7]} rot={0.2} body={c as string} />)}
      <Kenney file="books" scale={2.4} at={[-2.95, 1.44, -1.72]} rot={[0, Math.PI / 2, 0]} />
      <Kenney file="books" scale={2.2} at={[-2.15, 2.28, -1.72]} rot={[0, Math.PI / 2, 0]} />
      <Ring at={[-3.08, 1.62, -1.5]} rot={[0, Math.PI / 2, 0]} r={0.11} tube={0.016} arc={Math.PI} color={DARK} />
      <Cyl at={[-3.08, 1.52, -1.39]} rot={[0, 0, Math.PI / 2]} r={0.06} h={0.05} color={DARK} />
      <Cyl at={[-3.08, 1.52, -1.61]} rot={[0, 0, Math.PI / 2]} r={0.06} h={0.05} color={DARK} />
      <Kenney file="plantSmall2" scale={3} at={[-2.85, top + 0.02, -1.72]} />
      <Kenney file="plantSmall3" scale={2.6} at={[-2.2, top + 0.02, -1.72]} />
      {/* the skateboard against the left wall */}
      <Toon at={[ROOM.x0 + 0.06, 0.62, -1.15]} rot={[0, 0, -0.12]} scale={[1, 1, 0.18]} color="#f0b4cc"><capsuleGeometry args={[0.11, 0.98, 6, 14]} /></Toon>
    </group>
  );
}

/** A little cat figure, as the shelves are full of. */
export function Figure({ at, rot = 0, body }: { at: Pos; rot?: number; body: string }) {
  return (
    <group position={at} rotation={[0, rot, 0]}>
      <Ball r={0.055} at={[0, 0.055, 0]} scale={[1, 1.05, 0.9]} color={body} />
      <Ball r={0.05} at={[0, 0.14, 0.01]} color={body} />
      <Toon at={[-0.03, 0.185, 0.01]} color={body}><coneGeometry args={[0.018, 0.04, 4]} /></Toon>
      <Toon at={[0.03, 0.185, 0.01]} color={body}><coneGeometry args={[0.018, 0.04, 4]} /></Toon>
      <Ball r={0.007} at={[-0.017, 0.145, 0.055]} color="#2a2228" outline={false} />
      <Ball r={0.007} at={[0.017, 0.145, 0.055]} color="#2a2228" outline={false} />
    </group>
  );
}

/* ---------- string lights and vines ---------- */

export function StringLights({ power }: { power: number }) {
  const bulbs = useMemo(() => {
    const out: Pos[] = [], z = ROOM.z0 + 0.2, y0 = ROOM.h - 0.14;
    const posts = [ROOM.x0 + 0.1, -1.6, 0, 1.6, ROOM.x1 - 0.1];
    for (let s = 0; s < posts.length - 1; s++) {
      const a = posts[s], b = posts[s + 1];
      for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9; out.push([a + (b - a) * t, y0 - Math.sin(t * Math.PI) * 0.22, z]); }
    }
    return out;
  }, []);
  return (
    <group>
      {bulbs.map((p, i) => (
        <Toon key={i} at={p} color="#fff1c2" emissive="#ffc46b" glow={0.4 + power * 1.6} outline={false} shadow={false}><sphereGeometry args={[0.022, 8, 6]} /></Toon>
      ))}
      {bulbs.slice(0, -1).map((p, i) => <Rod key={`w${i}`} a={[p[0], p[1] + 0.02, p[2]]} b={[bulbs[i + 1][0], bulbs[i + 1][1] + 0.02, bulbs[i + 1][2]]} r={0.003} color="#3a2f2a" outline={false} />)}
    </group>
  );
}

/** Vines hanging from the beam, swaying a little. */
export function Vines() {
  const group = useRef<THREE.Group>(null);
  const still = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  const leaves = useMemo(() => {
    const R = rng(91), out: { p: Pos; s: number; c: string }[] = [];
    for (const [x, len, z] of [[-1.62, 1.5, -1.86], [-1.4, 1.1, -1.84], [3.4, 1.4, -1.86], [3.15, 0.9, -1.84], [-2.95, 0.8, -1.7]] as const) {
      for (let i = 0; i < len / 0.07; i++) {
        const y = ROOM.h - 0.1 - i * 0.07;
        out.push({ p: [x + Math.sin(i * 0.7) * 0.05 + (R() - 0.5) * 0.06, y, z + (R() - 0.5) * 0.08], s: 0.03 + R() * 0.02, c: R() < 0.55 ? "#9cb84a" : "#e0d35c" });
      }
    }
    return out;
  }, []);
  useFrame(({ clock }) => { if (group.current && !still) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.004; });
  return (
    <group ref={group}>
      {leaves.map((l, i) => <Ball key={i} r={l.s} detail={0} at={l.p} scale={[1.3, 0.8, 0.5]} color={l.c} outline={false} shadow={false} />)}
    </group>
  );
}
