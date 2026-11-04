import { createContext, type ReactNode, useContext, useMemo } from "react";
import { Outlines, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

/** Building blocks for the 3D room: toon shading, ink outlines, simple shapes and Kenney's models. */

export type Pos = [number, number, number];
export const INK = "#3b2b33", PICKED = "#ff7a59";

/** Three soft bands of light, as a painted anime background has. */
export function useRamp() {
  return useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, []);
}
export const Ramp = createContext<THREE.Texture | null>(null);
/** Outline colour and weight: ink, or the accent while a thing is picked. */
export const Ink = createContext({ color: INK, thickness: 0.006 });

export interface Part { at?: Pos; rot?: Pos; scale?: Pos; color: string; emissive?: string; glow?: number; map?: THREE.Texture | null; outline?: boolean; opacity?: number; shadow?: boolean; children: ReactNode }

export function Toon({ at, rot, scale, color, emissive, glow = 0, map, outline = true, opacity, shadow = true, children }: Part) {
  const ramp = useContext(Ramp), ink = useContext(Ink);
  return (
    <mesh position={at} rotation={rot} scale={scale} castShadow={shadow && opacity === undefined} receiveShadow>
      {children}
      <meshToonMaterial color={color} gradientMap={ramp} emissive={emissive ?? "#000"} emissiveIntensity={glow} map={map ?? null}
        transparent={opacity !== undefined} opacity={opacity ?? 1} />
      {outline && opacity === undefined && <Outlines thickness={ink.thickness} color={ink.color} />}
    </mesh>
  );
}
type Shape = Omit<Part, "children">;
export const Box = ({ size, ...p }: Shape & { size: Pos }) => <Toon {...p}><boxGeometry args={size} /></Toon>;
export const Cyl = ({ r, r2, h, seg = 18, ...p }: Shape & { r: number; r2?: number; h: number; seg?: number }) => <Toon {...p}><cylinderGeometry args={[r, r2 ?? r, h, seg]} /></Toon>;
export const Ball = ({ r, detail = 2, ...p }: Shape & { r: number; detail?: number }) => <Toon {...p}><icosahedronGeometry args={[r, detail]} /></Toon>;
export const Ring = ({ r, tube, arc = Math.PI * 2, ...p }: Shape & { r: number; tube: number; arc?: number }) => <Toon {...p}><torusGeometry args={[r, tube, 8, 28, arc]} /></Toon>;

/** A rod from a to b (a mic arm, a stem, a wire). */
export function Rod({ a, b, r, color, outline = true }: { a: Pos; b: Pos; r: number; color: string; outline?: boolean }) {
  const { at, rot, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return { at: va.add(vb).multiplyScalar(0.5).toArray() as Pos, rot: [e.x, e.y, e.z] as Pos, len: d.length() };
  }, [a, b]);
  return <Cyl at={at} rot={rot} r={r} h={len} seg={8} color={color} outline={outline} />;
}

/** A crop of the painting (painting pixels) as a texture, for the screens that show what the painting's do. */
export function useCrop(url: string, x: number, y: number, w: number, h: number) {
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

/* ---------- Kenney's Furniture Kit (public/room3d/models, CC0) ---------- */

const modelUrl = (file: string) => `room3d/models/${file}.glb`;
export const KENNEY = ["bedDouble", "books", "cabinetBedDrawer", "chairDesk", "computerKeyboard", "computerMouse", "computerScreen", "kitchenCabinetDrawer",
  "pillowLong", "plantSmall1", "plantSmall2", "plantSmall3", "pottedPlant", "speaker"];
for (const f of KENNEY) useGLTF.preload(modelUrl(f), false);

/** A Kenney model, centred on its footprint with its base at y 0, redrawn in toon shading; `paint` recolours its materials by name. */
export function Kenney({ file, scale, paint = {}, glow, at, rot, outline = true }: {
  file: string; scale: number; paint?: Record<string, string>; glow?: { material: string; amount: number }; at?: Pos; rot?: Pos; outline?: boolean;
}) {
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
    <group position={at} rotation={rot}>
      {parts.map((p, i) => {
        const lit = glow?.material === p.name;
        const color = paint[p.name] ?? p.color;
        return (
          <mesh key={i} geometry={p.geometry} matrix={p.matrix} matrixAutoUpdate={false} castShadow receiveShadow>
            <meshToonMaterial color={color} gradientMap={ramp} emissive={lit ? color : "#000"} emissiveIntensity={lit ? glow!.amount : 0} />
            {outline && <Outlines thickness={ink.thickness} color={ink.color} />}
          </mesh>
        );
      })}
    </group>
  );
}

export const darker = (hex: string, k = 0.68) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
