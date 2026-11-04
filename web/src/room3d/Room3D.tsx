import "./room3d.css";
import { type ElementRef, type RefObject, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { currentLight, type Light } from "../room/scene";
import { canTurn, DEFAULT_LAYOUT, hang, type Item, KINDS, moveTo, restore, restyle, ROOM, type Side, turn, variantOf } from "./layout";
import { Ball, Box, Cyl, darker, Ink, INK, Kenney, PICKED, type Pos, Ramp, Rod, Toon, useRamp } from "./parts";
import { DeskSet, DESK, MOODS, Outside, Shell, Shelves, StringLights, Vines } from "./scenery";

/**
 * The room in 3D, a test (#/room-3d): the painted room rebuilt in Three.js, seen from where the
 * painting is, in the light of the hour. Move the bed, the chair, the tall plant and the cabinets;
 * change the colour of those, the keyboard, the lamps and the flowers; hang the two pictures where
 * you like. The layout is kept in this browser.
 */

const KEY = "lilt.room3d.layout.2", LIGHT_KEY = "lilt.room3d.light";
// Where the painting is seen from, and what it looks at.
const EYE: Pos = [0.9, 1.45, 3.3], LOOK: Pos = [0.3, 0.85, -1.5];
// Dragging a thing switches the orbit off.
type Controls = ElementRef<typeof OrbitControls>;

/* ---------- the things you can change ---------- */

/** The sleeping cat, curled up and breathing. */
function Cat() {
  const body = useRef<THREE.Group>(null);
  const still = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);
  useFrame(({ clock }) => {
    if (!body.current || still) return;
    const b = Math.sin(clock.elapsedTime * 1.66);
    body.current.scale.set(1 + 0.012 * b, 1 + 0.05 * b, 1 + 0.012 * b);
  });
  return (
    <group rotation={[0, 0.35, 0]}>
      <group ref={body}>
        <Ball r={0.2} at={[0, 0.09, 0]} scale={[1.35, 0.55, 1]} color="#f6f3f0" />
        <Ball r={0.17} at={[-0.08, 0.13, -0.06]} scale={[1.2, 0.5, 0.95]} color="#2f2a2d" />
      </group>
      <Ball r={0.11} at={[0.27, 0.13, 0.08]} scale={[1, 0.85, 1]} color="#f6f3f0" />
      <Ball r={0.085} at={[0.26, 0.18, 0.04]} scale={[1, 0.7, 1]} color="#2f2a2d" />
      <Toon at={[0.22, 0.25, 0.02]} rot={[0, 0, 0.2]} color="#2f2a2d"><coneGeometry args={[0.035, 0.07, 4]} /></Toon>
      <Toon at={[0.32, 0.25, 0.09]} rot={[0.2, 0, -0.2]} color="#2f2a2d"><coneGeometry args={[0.035, 0.07, 4]} /></Toon>
      <Toon at={[0.05, 0.06, 0.2]} rot={[Math.PI / 2, 0, 1.3]} color="#2f2a2d"><capsuleGeometry args={[0.035, 0.3, 4, 8]} /></Toon>
    </group>
  );
}

/** The big cat-face cushion at the head of the bed. */
function Plush() {
  return (
    <group>
      <Ball r={0.36} scale={[1, 0.85, 0.55]} color="#fbf4ea" />
      <Toon at={[-0.2, 0.28, 0]} rot={[0, 0, 0.35]} color="#fbf4ea"><coneGeometry args={[0.1, 0.16, 4]} /></Toon>
      <Toon at={[0.2, 0.28, 0]} rot={[0, 0, -0.35]} color="#fbf4ea"><coneGeometry args={[0.1, 0.16, 4]} /></Toon>
      <Ball r={0.022} at={[-0.1, 0.03, 0.19]} color="#2a2228" outline={false} />
      <Ball r={0.022} at={[0.1, 0.03, 0.19]} color="#2a2228" outline={false} />
      <Ball r={0.04} at={[-0.18, -0.05, 0.17]} scale={[1, 0.6, 0.3]} color="#f6a9bf" outline={false} />
      <Ball r={0.04} at={[0.18, -0.05, 0.17]} scale={[1, 0.6, 0.3]} color="#f6a9bf" outline={false} />
    </group>
  );
}

function Bed({ color }: { color: string }) {
  const [, h, d] = KINDS.bed.size;
  return (
    <group>
      <Kenney file="bedDouble" scale={1.7} paint={{ carpet: color, carpetWhite: "#fbf6f2", wood: "#d7c2ae" }} />
      <Kenney file="pillowLong" scale={1.6} at={[0.3, h - 0.08, -d / 2 + 0.3]} paint={{ carpet: "#fffaf2" }} />
      <group position={[-0.32, h + 0.18, -d / 2 + 0.32]} rotation={[-0.25, 0, 0]}><Plush /></group>
      <group position={[0.05, h - 0.06, 0.4]}><Cat /></group>
    </group>
  );
}

function Chair({ color }: { color: string }) {
  const [, h] = KINDS.chair.size;
  return (
    <group>
      <Kenney file="chairDesk" scale={2.2} paint={{ metalMedium: "#4a4652", carpet: "#5d5768" }} />
      {/* the blanket thrown over the back and falling down its left side, and a little charm on it */}
      <Toon at={[-0.1, h - 0.03, -0.3]} rot={[0, 0, Math.PI / 2]} color={color}><capsuleGeometry args={[0.05, 0.4, 6, 12]} /></Toon>
      <Toon at={[-0.12, h - 0.45, -0.37]} rot={[0.1, 0, 0.05]} scale={[1, 1, 0.25]} color={color}><capsuleGeometry args={[0.18, 0.62, 6, 12]} /></Toon>
      <Toon at={[-0.31, h - 0.62, -0.2]} rot={[0.15, 0.1, 0.12]} scale={[0.25, 1, 1]} color={darker(color, 0.93)}><capsuleGeometry args={[0.14, 0.8, 6, 12]} /></Toon>
      <Toon at={[-0.08, h - 0.2, -0.24]} rot={[-0.12, 0, 0]} scale={[1, 1, 0.25]} color={darker(color, 0.96)}><capsuleGeometry args={[0.16, 0.22, 6, 12]} /></Toon>
      <Rod a={[-0.3, h - 0.5, -0.4]} b={[-0.3, h - 0.66, -0.42]} r={0.004} color="#d8b24a" outline={false} />
      <Ball r={0.035} at={[-0.3, h - 0.7, -0.42]} color="#f6c6d8" />
    </group>
  );
}

function Cabinets({ color }: { color: string }) {
  const [, h] = KINDS.cabinet.size;
  return (
    <group>
      <Kenney file="kitchenCabinetDrawer" scale={2} paint={{ wood: color, woodDark: darker(color, 0.85) }} />
      <Kenney file="books" scale={2.4} at={[0.05, h, 0.05]} />
    </group>
  );
}

/** The globe lamps: on the shelves and by the tall plant. */
function Lamps({ color, power }: { color: string; power: number }) {
  return (
    <group>
      {([[-2.55, 1.44, -1.72, 0.14], [-1.98, 1.02, -1.62, 0.09]] as const).map(([x, y, z, r], i) => (
        <group key={i}>
          <Cyl at={[x, y + 0.02, z]} r={r * 0.45} h={0.04} color="#b98b62" />
          <Toon at={[x, y + 0.04 + r, z]} color="#fff6e8" emissive={color} glow={0.6 + power * 0.5} shadow={false}><sphereGeometry args={[r, 24, 16]} /></Toon>
          <pointLight position={[x, y + r + 0.05, z + 0.1]} color={color} intensity={power * (i ? 0.5 : 1)} distance={3} decay={1.5} />
        </group>
      ))}
    </group>
  );
}

/** The tall leafy plant by the shelves: a pot, a few stems and a cloud of leaves. */
function LeafyPlant({ color }: { color: string }) {
  const [w, h] = KINDS.plant.size;
  const leaves = useMemo(() => {
    let s = 77;
    const R = () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
    return Array.from({ length: 70 }, () => {
      const y = 0.45 + R() * (h - 0.5), spread = 0.1 + (1 - Math.abs(y - h * 0.65) / h) * w * 0.55, a = R() * Math.PI * 2;
      return { p: [Math.cos(a) * spread * R(), y, Math.sin(a) * spread * R()] as Pos, r: 0.045 + R() * 0.03, tilt: [R() - 0.5, a, R() - 0.5] as Pos, light: R() < 0.45 };
    });
  }, [w, h]);
  return (
    <group>
      <Cyl at={[0, 0.17, 0]} r={0.2} r2={0.16} h={0.34} color="#d7c9bb" />
      {[[-0.05, 0.03], [0.06, -0.02], [0, 0.06]].map(([x, z], i) => <Rod key={i} a={[0, 0.3, 0]} b={[x * 3, h - 0.15 - i * 0.12, z * 3]} r={0.012} color="#5f6e3a" outline={false} />)}
      {leaves.map((l, i) => <Ball key={i} r={l.r} detail={0} at={l.p} rot={l.tilt} scale={[1.4, 0.45, 0.8]} color={l.light ? darker(color, 1.18) : color} outline={i % 3 === 0} />)}
    </group>
  );
}

/** The keyboard on the desk. */
function Keyboard({ color }: { color: string }) {
  return <Kenney file="computerKeyboard" scale={2.4} at={[0.98, DESK.y, -1.45]} paint={{ metalMedium: color, metalDark: "#fbf4f6" }} />;
}

/** Flowers in a vase at the right end of the desk. */
function Flowers({ color }: { color: string }) {
  const blossoms = useMemo(() => {
    let s = 41;
    const R = () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
    return Array.from({ length: 22 }, () => ({ p: [(R() - 0.5) * 0.36, 0.3 + R() * 0.32, (R() - 0.5) * 0.26] as Pos, r: 0.03 + R() * 0.025, leaf: R() < 0.25 }));
  }, []);
  return (
    <group position={[3.05, DESK.y, -1.75]}>
      <Cyl at={[0, 0.11, 0]} r={0.07} r2={0.09} h={0.22} color="#f4ece4" />
      {blossoms.map((b, i) => <Rod key={`s${i}`} a={[0, 0.2, 0]} b={b.p} r={0.004} color="#6f8a4a" outline={false} />)}
      {blossoms.map((b, i) => <Ball key={i} r={b.r} at={b.p} detail={1} color={b.leaf ? "#7ea35a" : i % 3 ? color : darker(color, 0.9)} outline={!b.leaf} />)}
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
      <Toon at={[0, 0, 0.017]} color="#ffffff" map={map} outline={false}><planeGeometry args={[w - 0.05, h - 0.05]} /></Toon>
    </group>
  );
}

function Model({ item, lamp }: { item: Item; lamp: number }) {
  const color = variantOf(item).color ?? "#fff";
  switch (item.kind) {
    case "bed": return <Bed color={color} />;
    case "chair": return <Chair color={color} />;
    case "plant": return <LeafyPlant color={color} />;
    case "cabinet": return <Cabinets color={color} />;
    case "keyboard": return <Keyboard color={color} />;
    case "lamps": return <Lamps color={color} power={lamp} />;
    case "flowers": return <Flowers color={color} />;
    default: return <Picture item={item} />;
  }
}

/** A coral line round the picked thing: its footprint on the floor, or its frame on the wall. */
function Picked({ item }: { item: Item }) {
  const [w, h, d] = KINDS[item.kind].size;
  if (KINDS[item.kind].fixed) return null;
  const [a, b, y] = item.wall ? [w + 0.08, h + 0.08, 0] : [w + 0.08, d + 0.08, 0.02];
  const t = 0.03, bars: [Pos, Pos][] = item.wall
    ? [[[0, b / 2, 0.03], [a, t, t]], [[0, -b / 2, 0.03], [a, t, t]], [[a / 2, 0, 0.03], [t, b, t]], [[-a / 2, 0, 0.03], [t, b, t]]]
    : [[[0, y, b / 2], [a, 0.01, t]], [[0, y, -b / 2], [a, 0.01, t]], [[a / 2, y, 0], [t, 0.01, b]], [[-a / 2, y, 0], [t, 0.01, b]]];
  return <group>{bars.map(([at, size], i) => <mesh key={i} position={at}><boxGeometry args={size} /><meshBasicMaterial color={PICKED} toneMapped={false} /></mesh>)}</group>;
}

/** Where a thing stands: on the floor, turned; flat on its wall; or, fixed, where the scene puts it. */
function placement(it: Item): { position: Pos; rotation: Pos } {
  if (KINDS[it.kind].fixed) return { position: [0, 0, 0], rotation: [0, 0, 0] };
  if (it.wall) return it.wall.side === "back"
    ? { position: [it.wall.u, it.wall.y, ROOM.z0 + 0.02], rotation: [0, 0, 0] }
    : { position: [ROOM.x0 + 0.02, it.wall.y, it.wall.u], rotation: [0, Math.PI / 2, 0] };
  return { position: [it.x, 0, it.z], rotation: [0, -it.rot * Math.PI / 2, 0] };
}

/* ---------- moving things ---------- */

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const BACK_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), -ROOM.z0);
const LEFT_PLANE = new THREE.Plane(new THREE.Vector3(1, 0, 0), -ROOM.x0);

/** Where the pointer's ray meets a wall, as (side, u, y), or null when it's off both walls. */
function onWall(ray: THREE.Ray): { side: Side; u: number; y: number } | null {
  const hits: { side: Side; u: number; y: number; d: number }[] = [];
  const p = new THREE.Vector3();
  if (ray.intersectPlane(BACK_PLANE, p) && p.x >= ROOM.x0 && p.x <= ROOM.x1 && p.y >= 0 && p.y <= ROOM.h) hits.push({ side: "back", u: p.x, y: p.y, d: ray.origin.distanceTo(p) });
  if (ray.intersectPlane(LEFT_PLANE, p) && p.z >= ROOM.z0 && p.z <= ROOM.z1 && p.y >= 0 && p.y <= ROOM.h) hits.push({ side: "left", u: p.z, y: p.y, d: ray.origin.distanceTo(p) });
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
    if (KINDS[it.kind].fixed) return;
    // Hold it where it was grabbed, so it doesn't jump to the pointer.
    if (it.wall) { const w = onWall(e.ray); const same = w && w.side === it.wall.side; drag.current = { id: it.id, dx: same ? w.u - it.wall.u : 0, dz: same ? w.y - it.wall.y : 0 }; }
    else { const p = new THREE.Vector3(); e.ray.intersectPlane(FLOOR_PLANE, p); drag.current = { id: it.id, dx: it.x - p.x, dz: it.z - p.z }; }
    if (controls.current) controls.current.enabled = false;
    document.body.style.cursor = "grabbing";
  };

  const lamp = MOODS[light].lamp;
  return (
    <>
      {items.map((it) => (
        <Ink.Provider key={it.id} value={it.id === picked ? { color: PICKED, thickness: 0.016 } : { color: INK, thickness: 0.006 }}>
          <group {...placement(it)} onPointerDown={grab(it)}
            onPointerOver={(e) => { e.stopPropagation(); if (!drag.current) document.body.style.cursor = KINDS[it.kind].fixed ? "pointer" : "grab"; }}
            onPointerOut={() => { if (!drag.current) document.body.style.cursor = ""; }}>
            <Model item={it} lamp={lamp} />
            {it.id === picked && <Picked item={it} />}
          </group>
        </Ink.Provider>
      ))}
    </>
  );
}

/** A wider view on a narrow window, so the desk stays in frame. */
function Lens() {
  const { camera, size } = useThree();
  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera, aspect = size.width / size.height;
    c.fov = aspect >= 1.6 ? 52 : aspect >= 1.1 ? 60 : 78;
    c.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Scene(props: Omit<Parameters<typeof Things>[0], "controls">) {
  const ramp = useRamp(), mood = MOODS[props.light];
  const controls = useRef<Controls>(null);
  return (
    <Ramp.Provider value={ramp}>
      <Lens />
      <color attach="background" args={[mood.bg]} />
      <fog attach="fog" args={[mood.haze, 40, 230]} />
      <ambientLight color={mood.ambient[0]} intensity={mood.ambient[1]} />
      <hemisphereLight args={[mood.sky[1], "#6b5560", 0.35]} />
      <directionalLight position={mood.sunAt} color={mood.sun[0]} intensity={mood.sun[1]} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-far={30} />
      <Outside mood={mood} />
      <Shell />
      <DeskSet mood={mood} />
      <Shelves />
      <StringLights power={mood.bulbs} />
      <Vines />
      <Things {...props} controls={controls} />
      <OrbitControls ref={controls} target={LOOK} enablePan={false} enableDamping
        minAzimuthAngle={-0.35} maxAzimuthAngle={0.45} minPolarAngle={1.12} maxPolarAngle={1.5} minDistance={3} maxDistance={5.6} />
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
      <Canvas shadows dpr={[1, 2]} camera={{ position: EYE, fov: 52, near: 0.05, far: 900 }} onPointerMissed={() => setPicked(null)}
        gl={{ antialias: true }} aria-label="The room in 3D: the bed, the chair, the plant and the cabinets can be moved">
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
            {canTurn(it) && <button onClick={() => setItems((all) => turn(all, it.id))}>Turn</button>}
            <button className="r3-done" onClick={() => setPicked(null)}>Done</button>
          </>
        ) : (
          <>
            <span>Drag the bed, chair, plant or cabinets to move them. Click anything outlined to change it.</span>
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
