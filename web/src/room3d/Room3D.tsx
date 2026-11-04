import "./room3d.css";
import { createContext, type ElementRef, type ReactNode, type RefObject, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Outlines, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Dragging a thing switches the orbit off.
type Controls = ElementRef<typeof OrbitControls>;
import { currentLight, MAIN_SCREEN, roomUrl, type Light } from "../room/scene";
import { DEFAULT_LAYOUT, hang, type Item, KINDS, moveTo, restore, restyle, ROOM, type Side, turn, variantOf, WINDOW } from "./layout";

/**
 * The 3D room, a test (#/room-3d): the room built in Three.js with toon shading and ink outlines,
 * lit for the hour, where you drag the furniture about, turn it, and change its colour. The layout
 * is kept in this browser. The furniture is simple shapes for now; real models would replace them.
 */

const KEY = "lilt.room3d.layout.1", LIGHT_KEY = "lilt.room3d.light";
const INK = "#2a2230", PICKED = "#ff7a59";

type Mood = { sky: string; bg: string; ambient: [string, number]; sun: [string, number]; sunAt: [number, number, number]; lamp: number; screen: number };
const MOODS: Record<Light, Mood> = {
  morning: { sky: "#f6d8c8", bg: "#2c2533", ambient: ["#ffe6d6", 1.1], sun: ["#ffd0a0", 2.2], sunAt: [3, 3.5, -7], lamp: 0.4, screen: 0.9 },
  day: { sky: "#cfe3f5", bg: "#25293a", ambient: ["#f4f1ff", 1.35], sun: ["#fff4de", 2.6], sunAt: [1.5, 6, -6], lamp: 0.3, screen: 0.85 },
  sunset: { sky: "#f3b49a", bg: "#2d2230", ambient: ["#f1c6d6", 1.0], sun: ["#ff9f6a", 2.4], sunAt: [4, 2.2, -7], lamp: 0.9, screen: 1 },
  night: { sky: "#2b3160", bg: "#0f1122", ambient: ["#6d74b8", 0.75], sun: ["#9fb4ff", 0.7], sunAt: [2, 5, -6], lamp: 3, screen: 1.1 },
};
const WALL = "#efe2d8", WALL_LEFT = "#e8d6ce", FLOOR = "#c49a76";

/* ---------- toon shading ---------- */

// Three flat bands of light, as cel animation does.
function useRamp() {
  return useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, []);
}
const Ramp = createContext<THREE.Texture | null>(null);
/** Outline colour and weight: ink, or the accent while an item is picked. */
const Ink = createContext({ color: INK, thickness: 0.014 });

type Pos = [number, number, number];
interface Part { at?: Pos; rot?: Pos; color: string; emissive?: string; glow?: number; map?: THREE.Texture | null; outline?: boolean; children: ReactNode }

function Toon({ at, rot, color, emissive, glow = 0, map, outline = true, children }: Part) {
  const ramp = useContext(Ramp), ink = useContext(Ink);
  return (
    <mesh position={at} rotation={rot} castShadow receiveShadow>
      {children}
      <meshToonMaterial color={color} gradientMap={ramp} emissive={emissive ?? "#000"} emissiveIntensity={glow} map={map ?? null} />
      {outline && <Outlines thickness={ink.thickness} color={ink.color} />}
    </mesh>
  );
}
const Box = ({ size, ...p }: Omit<Part, "children"> & { size: Pos }) => <Toon {...p}><boxGeometry args={size} /></Toon>;
const Ball = ({ r, scale, ...p }: Omit<Part, "children"> & { r: number; scale?: Pos }) => (
  <group position={p.at} scale={scale}><Toon {...p} at={undefined}><icosahedronGeometry args={[r, 2]} /></Toon></group>
);

/* ---------- the room ---------- */

/** A crop of the painting (painting pixels) as a texture. */
function useCrop(url: string, x: number, y: number, w: number, h: number) {
  const src = useTexture(url);
  return useMemo(() => {
    const t = src.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(w / 1672, h / 941);
    t.offset.set(x / 1672, 1 - (y + h) / 941);
    t.needsUpdate = true;
    return t;
  }, [src, x, y, w, h]);
}

function Shell({ light }: { light: Light }) {
  const wx = (WINDOW.x0 + WINDOW.x1) / 2, ww = WINDOW.x1 - WINDOW.x0, wy = (WINDOW.y0 + WINDOW.y1) / 2, wh = WINDOW.y1 - WINDOW.y0;
  // The painted skyline outside, in the same light as the room.
  const sky = useCrop(roomUrl(light), 1000, 0, 672, Math.round(672 * wh / ww));
  const back = -ROOM.d / 2 - 0.05, left = -ROOM.w / 2 - 0.05, t = 0.1;
  return (
    <group>
      <Box at={[0, -0.05, 0]} size={[ROOM.w, 0.1, ROOM.d]} color={FLOOR} outline={false} />
      {/* back wall, with a hole for the window */}
      <Box at={[(-ROOM.w / 2 + WINDOW.x0) / 2, ROOM.h / 2, back]} size={[WINDOW.x0 + ROOM.w / 2, ROOM.h, t]} color={WALL} outline={false} />
      <Box at={[(WINDOW.x1 + ROOM.w / 2) / 2, ROOM.h / 2, back]} size={[ROOM.w / 2 - WINDOW.x1, ROOM.h, t]} color={WALL} outline={false} />
      <Box at={[wx, WINDOW.y0 / 2, back]} size={[ww, WINDOW.y0, t]} color={WALL} outline={false} />
      <Box at={[wx, (WINDOW.y1 + ROOM.h) / 2, back]} size={[ww, ROOM.h - WINDOW.y1, t]} color={WALL} outline={false} />
      {/* the window frame and its bars */}
      {[[wx, WINDOW.y0, ww + 0.1, 0.08], [wx, WINDOW.y1, ww + 0.1, 0.08]].map(([x, y, w, h], i) => <Box key={`h${i}`} at={[x, y, back + 0.06]} size={[w, h, 0.12]} color="#5b4a52" />)}
      {[WINDOW.x0, wx, WINDOW.x1].map((x, i) => <Box key={`v${i}`} at={[x, wy, back + 0.06]} size={[0.07, wh, 0.12]} color="#5b4a52" />)}
      <mesh position={[wx, wy, back - 0.12]}>
        <planeGeometry args={[ww + 0.1, wh + 0.1]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      <Box at={[left, ROOM.h / 2, 0]} size={[t, ROOM.h, ROOM.d]} color={WALL_LEFT} outline={false} />
      {/* skirting, so the corners read */}
      <Box at={[0, 0.06, -ROOM.d / 2 + 0.01]} size={[ROOM.w, 0.12, 0.02]} color="#d9c3b4" outline={false} />
      <Box at={[-ROOM.w / 2 + 0.01, 0.06, 0]} size={[0.02, 0.12, ROOM.d]} color="#d9c3b4" outline={false} />
    </group>
  );
}

/* ---------- the furniture ---------- */

function Cat() {
  const body = useRef<THREE.Group>(null);
  const still = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  useFrame(({ clock }) => {
    if (!body.current || still) return;
    const b = Math.sin(clock.elapsedTime * 1.66);
    body.current.scale.set(1 + 0.01 * b, 1 + 0.05 * b, 1 + 0.01 * b);
  });
  return (
    <group position={[0.05, 0.56, 0.35]} rotation={[0, 0.5, 0]}>
      <group ref={body}><Ball r={0.2} scale={[1.25, 0.6, 1]} at={[0, 0.06, 0]} color="#f4f1ee" /></group>
      <Ball r={0.12} scale={[1, 0.6, 0.9]} at={[-0.02, 0.15, -0.06]} color="#3a3436" />
      <Ball r={0.11} at={[0.24, 0.1, 0.06]} color="#f4f1ee" />
      <Ball r={0.07} scale={[1, 0.8, 1]} at={[0.25, 0.16, 0.02]} color="#3a3436" />
      {[[0.21, 0.2, 0.0], [0.3, 0.2, 0.08]].map((p, i) => <Toon key={i} at={p as Pos} color="#3a3436"><coneGeometry args={[0.035, 0.07, 4]} /></Toon>)}
      <Toon at={[-0.2, 0.05, 0.12]} rot={[Math.PI / 2, 0, 0.9]} color="#3a3436"><capsuleGeometry args={[0.03, 0.26, 4, 8]} /></Toon>
    </group>
  );
}

/** Kenney's Furniture Kit (public/room3d/models, CC0): which model, how much to scale it, which
 * materials take the chosen colour (and a darker shade of it), and a turn so its front faces +z. */
type Spec = { file: string; scale: number; tint?: string[]; shade?: string[]; face?: number };
const MODELS: Record<string, Spec> = {
  bed: { file: "bedDouble", scale: 1.9, tint: ["carpet"] },
  desk: { file: "desk", scale: 1.9, tint: ["wood"] },
  chair: { file: "chairDesk", scale: 1.9, tint: ["carpet"] },
  lamp: { file: "lampRoundFloor", scale: 1.9, tint: ["lamp"] },
  plant: { file: "pottedPlant", scale: 1.9, tint: ["plant"] },
  rug: { file: "rugRounded", scale: 1.3, tint: ["carpet"], shade: ["carpetDarker"] },
  shelf: { file: "bookcaseOpen", scale: 1.9, tint: ["wood"] },
};
const modelUrl = (file: string) => `room3d/models/${file}.glb`;
for (const m of [...Object.values(MODELS).map((m) => m.file), "computerScreen", "computerKeyboard", "books"]) useGLTF.preload(modelUrl(m), false);

const darker = (hex: string) => `#${new THREE.Color(hex).multiplyScalar(0.68).getHexString()}`;

/** A Kenney model, centred on its footprint with its base on the floor, redrawn in toon shading with ink outlines. */
function Kenney({ file, scale, color, tint = [], shade = [], face = 0, glow = 0, at }: Spec & { color?: string; glow?: number; at?: Pos }) {
  const ramp = useContext(Ramp), ink = useContext(Ink);
  const { scene } = useGLTF(modelUrl(file), false);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene), c = box.getCenter(new THREE.Vector3());
    const fix = new THREE.Matrix4().makeScale(scale, scale, scale).multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
    const out: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4; name: string; color: string }[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      out.push({ geometry: m.geometry, matrix: fix.clone().multiply(m.matrixWorld), name: mat.name, color: `#${mat.color.getHexString()}` });
    });
    return out;
  }, [scene, scale]);
  return (
    <group position={at} rotation={[0, face, 0]}>
      {parts.map((p, i) => {
        const own = color && tint.includes(p.name), dim = color && shade.includes(p.name);
        return (
          <mesh key={i} geometry={p.geometry} matrix={p.matrix} matrixAutoUpdate={false} castShadow receiveShadow>
            <meshToonMaterial color={own ? color : dim ? darker(color!) : p.color} gradientMap={ramp}
              emissive={own && glow ? color : "#000"} emissiveIntensity={own ? glow : 0} />
            <Outlines thickness={ink.thickness} color={ink.color} />
          </mesh>
        );
      })}
    </group>
  );
}

function Desk({ color }: { color: string }) {
  const [, h] = KINDS.desk.size;
  const screen = useCrop(roomUrl("day"), MAIN_SCREEN[0][0], MAIN_SCREEN[0][1], MAIN_SCREEN[1][0] - MAIN_SCREEN[0][0], MAIN_SCREEN[2][1] - MAIN_SCREEN[0][1]);
  return (
    <group>
      <Kenney {...MODELS.desk} color={color} />
      <Kenney file="computerScreen" scale={1.5} at={[0, h, -0.12]} />
      {/* the cherry blossom from the painting's middle screen */}
      <mesh position={[0, h + 0.27, -0.035]}>
        <planeGeometry args={[0.5, 0.29]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      <Kenney file="computerKeyboard" scale={1.6} at={[0, h, 0.16]} />
    </group>
  );
}

// The bookcase's shelves (as scaled), each with a few of Kenney's books.
const SHELVES: [number, number, number][] = [[-0.16, 0.247, 0], [0.13, 0.703, Math.PI], [-0.12, 1.159, 0.3]];
function Shelf({ color }: { color: string }) {
  return (
    <group>
      <Kenney {...MODELS.shelf} color={color} />
      {SHELVES.map(([x, y, r], i) => <group key={i} rotation={[0, r, 0]} position={[x, y, 0.02]}><Kenney file="books" scale={1.9} /></group>)}
    </group>
  );
}

function Lamp({ color, power }: { color: string; power: number }) {
  return (
    <group>
      <Kenney {...MODELS.lamp} color={color} glow={0.35 + power * 0.25} />
      <pointLight position={[0, 1.45, 0]} color={color} intensity={power} distance={5} decay={1.4} />
    </group>
  );
}

function Picture({ item }: { item: Item }) {
  const [w, h] = KINDS[item.kind].size;
  const map = useTexture(variantOf(item).picture!);
  useMemo(() => { map.colorSpace = THREE.SRGBColorSpace; }, [map]);
  return (
    <group>
      <Box at={[0, 0, 0]} size={[w, h, 0.03]} color="#3b3036" />
      <Toon at={[0, 0, 0.017]} color="#ffffff" map={map} outline={false}><planeGeometry args={[w - 0.06, h - 0.06]} /></Toon>
    </group>
  );
}

function Model({ item, lamp }: { item: Item; lamp: number }) {
  const color = variantOf(item).color ?? "#fff";
  switch (item.kind) {
    case "bed": return <group><Kenney {...MODELS.bed} color={color} /><Cat /></group>;
    case "desk": return <Desk color={color} />;
    case "lamp": return <Lamp color={color} power={lamp} />;
    case "shelf": return <Shelf color={color} />;
    case "poster": case "frame": return <Picture item={item} />;
    default: return <Kenney {...MODELS[item.kind]} color={color} />;
  }
}

/** A coral line round the picked thing: its footprint on the floor, or its frame on the wall. */
function Picked({ item }: { item: Item }) {
  const [w, h, d] = KINDS[item.kind].size;
  const [a, b, y] = item.wall ? [w + 0.1, h + 0.1, 0] : [w + 0.08, d + 0.08, 0.035];
  const t = 0.035, bars: [Pos, Pos][] = item.wall
    ? [[[0, b / 2, 0.03], [a, t, t]], [[0, -b / 2, 0.03], [a, t, t]], [[a / 2, 0, 0.03], [t, b, t]], [[-a / 2, 0, 0.03], [t, b, t]]]
    : [[[0, y, b / 2], [a, 0.01, t]], [[0, y, -b / 2], [a, 0.01, t]], [[a / 2, y, 0], [t, 0.01, b]], [[-a / 2, y, 0], [t, 0.01, b]]];
  return (
    <group>
      {bars.map(([at, size], i) => (
        <mesh key={i} position={at}><boxGeometry args={size} /><meshBasicMaterial color={PICKED} toneMapped={false} /></mesh>
      ))}
    </group>
  );
}

/** Where an item stands: on the floor, turned; or flat on its wall. */
function placement(it: Item): { position: Pos; rotation: Pos } {
  if (it.wall) return it.wall.side === "back"
    ? { position: [it.wall.u, it.wall.y, -ROOM.d / 2 + 0.02], rotation: [0, 0, 0] }
    : { position: [-ROOM.w / 2 + 0.02, it.wall.y, it.wall.u], rotation: [0, Math.PI / 2, 0] };
  return { position: [it.x, 0, it.z], rotation: [0, -it.rot * Math.PI / 2, 0] };
}

/* ---------- moving things ---------- */

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const BACK_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), ROOM.d / 2);
const LEFT_PLANE = new THREE.Plane(new THREE.Vector3(1, 0, 0), ROOM.w / 2);

/** Where the pointer's ray meets a wall, as (side, u, y), or null when it's off both walls. */
function onWall(ray: THREE.Ray): { side: Side; u: number; y: number } | null {
  const hits: { side: Side; u: number; y: number; d: number }[] = [];
  const p = new THREE.Vector3();
  if (ray.intersectPlane(BACK_PLANE, p) && Math.abs(p.x) <= ROOM.w / 2 && p.y >= 0 && p.y <= ROOM.h) hits.push({ side: "back", u: p.x, y: p.y, d: ray.origin.distanceTo(p) });
  if (ray.intersectPlane(LEFT_PLANE, p) && Math.abs(p.z) <= ROOM.d / 2 && p.y >= 0 && p.y <= ROOM.h) hits.push({ side: "left", u: p.z, y: p.y, d: ray.origin.distanceTo(p) });
  hits.sort((a, b) => a.d - b.d);
  return hits[0] ?? null;
}

function Things({ items, setItems, picked, setPicked, controls, light }: {
  items: Item[]; setItems: (f: (i: Item[]) => Item[]) => void; picked: string | null; setPicked: (id: string | null) => void;
  controls: RefObject<Controls>; light: Light;
}) {
  const { camera, gl, raycaster } = useThree();
  const drag = useRef<{ id: string; dx: number; dz: number } | null>(null);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      setItems((all) => {
        const it = all.find((o) => o.id === d.id);
        if (!it) return all;
        if (it.wall) { const w = onWall(raycaster.ray); return w ? hang(all, d.id, w.side, w.u - d.dx, w.y - d.dz) : all; }
        const p = new THREE.Vector3();
        return raycaster.ray.intersectPlane(FLOOR_PLANE, p) ? moveTo(all, d.id, p.x + d.dx, p.z + d.dz) : all;
      });
    };
    const up = () => {
      if (!drag.current) return;
      drag.current = null;
      if (controls.current) controls.current.enabled = true;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [camera, gl, raycaster, ndc, setItems, controls]);

  const grab = (it: Item) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setPicked(it.id);
    // Hold it where it was grabbed, so it doesn't jump to the pointer.
    if (it.wall) { const w = onWall(e.ray); drag.current = { id: it.id, dx: w && w.side === it.wall.side ? w.u - it.wall.u : 0, dz: w && w.side === it.wall.side ? w.y - it.wall.y : 0 }; }
    else { const p = new THREE.Vector3(); e.ray.intersectPlane(FLOOR_PLANE, p); drag.current = { id: it.id, dx: it.x - p.x, dz: it.z - p.z }; }
    if (controls.current) controls.current.enabled = false;
    document.body.style.cursor = "grabbing";
  };

  const lamp = MOODS[light].lamp;
  return (
    <>
      {items.map((it) => (
        <Ink.Provider key={it.id} value={it.id === picked ? { color: PICKED, thickness: 0.03 } : { color: INK, thickness: 0.014 }}>
          <group {...placement(it)} onPointerDown={grab(it)}
            onPointerOver={(e) => { e.stopPropagation(); if (!drag.current) document.body.style.cursor = "grab"; }}
            onPointerOut={() => { if (!drag.current) document.body.style.cursor = ""; }}>
            <Model item={it} lamp={lamp} />
            {it.id === picked && <Picked item={it} />}
          </group>
        </Ink.Provider>
      ))}
    </>
  );
}

/** An orthographic camera framed so the whole room fits, whatever the window's shape. */
function Frame() {
  const { camera, size } = useThree();
  useEffect(() => {
    (camera as THREE.OrthographicCamera).zoom = Math.min(size.width / 9.6, size.height / 7.4);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Scene(props: Omit<Parameters<typeof Things>[0], "controls">) {
  const ramp = useRamp(), mood = MOODS[props.light];
  const controls = useRef<Controls>(null);
  return (
    <Ramp.Provider value={ramp}>
      <Frame />
      <color attach="background" args={[mood.bg]} />
      <ambientLight color={mood.ambient[0]} intensity={mood.ambient[1]} />
      <directionalLight position={mood.sunAt} color={mood.sun[0]} intensity={mood.sun[1]} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <Shell light={props.light} />
      <Things {...props} controls={controls} />
      <OrbitControls ref={controls} target={[0, 0.9, 0]} enablePan={false} enableDamping
        minAzimuthAngle={0.12} maxAzimuthAngle={Math.PI / 2 - 0.12} minPolarAngle={0.55} maxPolarAngle={1.3}
        minZoom={40} maxZoom={260} />
    </Ramp.Provider>
  );
}

/* ---------- the page ---------- */

const load = (): Item[] => { try { const s = localStorage.getItem(KEY); return s ? restore(JSON.parse(s)) : DEFAULT_LAYOUT; } catch { return DEFAULT_LAYOUT; } };
const LIGHT_NAMES: [Light | "auto", string][] = [["auto", "Now"], ["morning", "Morning"], ["day", "Day"], ["sunset", "Sunset"], ["night", "Night"]];

export function Room3D() {
  const [items, setItemsRaw] = useState<Item[]>(load);
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<Light | "auto">(() => { try { return (localStorage.getItem(LIGHT_KEY) as Light | null) ?? "auto"; } catch { return "auto"; } });
  const [now, setNow] = useState(currentLight);
  useEffect(() => { const id = window.setInterval(() => setNow(currentLight()), 60000); return () => window.clearInterval(id); }, []);
  const light = mode === "auto" ? now : mode;
  const setItems = (f: (i: Item[]) => Item[]) => setItemsRaw((all) => f(all));
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private window: forget on reload */ } }, [items]);
  useEffect(() => { try { if (mode === "auto") localStorage.removeItem(LIGHT_KEY); else localStorage.setItem(LIGHT_KEY, mode); } catch { /* private window */ } }, [mode]);

  const it = items.find((o) => o.id === picked) ?? null;
  // Keys for the picked thing: arrows move it a step, R turns it, C changes it, Escape lets go.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!picked || (e.target as HTMLElement).tagName === "INPUT") return;
      const cur = items.find((o) => o.id === picked);
      if (!cur) return;
      const step: Record<string, [number, number]> = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.25], ArrowDown: [0, 0.25] };
      if (e.key in step) {
        e.preventDefault();
        const [dx, dz] = step[e.key], w = cur.wall;
        // On a wall, left and right slide along it and up and down raise or lower it.
        setItems((all) => w ? hang(all, cur.id, w.side, w.u + dx, w.y - dz) : moveTo(all, cur.id, cur.x + dx, cur.z + dz));
      } else if (e.key === "r" || e.key === "R") setItems((all) => turn(all, cur.id));
      else if (e.key === "c" || e.key === "C") setItems((all) => restyle(all, cur.id));
      else if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, items]);

  return (
    <div className="r3">
      <Canvas orthographic shadows dpr={[1, 2]} camera={{ position: [8, 6.5, 8], zoom: 90, near: 0.1, far: 100 }} onPointerMissed={() => setPicked(null)}
        gl={{ antialias: true }} aria-label="A 3D room you can rearrange">
        <Suspense fallback={null}>
          <Scene items={items} setItems={setItems} picked={picked} setPicked={setPicked} light={light} />
        </Suspense>
      </Canvas>
      <header className="r3-top">
        <button className="r3-pill" onClick={() => { window.location.hash = "#/"; }}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to the room
        </button>
        <span className="r3-title">The room in 3D <span>a test</span></span>
        <div className="r3-pill r3-seg" role="group" aria-label="Light">
          {LIGHT_NAMES.map(([id, name]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{name}</button>)}
        </div>
      </header>
      <footer className="r3-bar" aria-live="polite">
        {it ? (
          <>
            <span><b>{KINDS[it.kind].name}</b> · {variantOf(it).name}</span>
            <button onClick={() => setItems((all) => restyle(all, it.id))}>{KINDS[it.kind].wall ? "Change picture" : "Change colour"}</button>
            {!it.wall && <button onClick={() => setItems((all) => turn(all, it.id))}>Turn</button>}
            <button className="r3-done" onClick={() => setPicked(null)}>Done</button>
          </>
        ) : (
          <>
            <span>Drag anything to move it. Click it to change its colour or turn it.</span>
            <button onClick={() => { setItemsRaw(DEFAULT_LAYOUT); setPicked(null); }}>Reset room</button>
          </>
        )}
      </footer>
      <nav className="r3-list" aria-label="Things in the room">
        {items.map((o) => <button key={o.id} aria-pressed={o.id === picked} onClick={() => setPicked(o.id)}>{KINDS[o.kind].name}</button>)}
      </nav>
    </div>
  );
}

export default Room3D;
