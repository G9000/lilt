import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Palette } from './materials';

export function box(parent: T.Object3D, size: [number, number, number], at: [number, number, number], mat: T.Material, radius = 0.015) {
  const mesh = new T.Mesh(new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 3)), mat);
  mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function cylinder(parent: T.Object3D, top: number, bottom: number, height: number, at: [number, number, number], mat: T.Material) {
  const mesh = new T.Mesh(new T.CylinderGeometry(top, bottom, height, 32), mat);
  mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function rod(parent: T.Object3D, a: T.Vector3, b: T.Vector3, radius: number, mat: T.Material) {
  const mesh = cylinder(parent, radius, radius, a.distanceTo(b), [0, 0, 0], mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return mesh;
}
function ring(parent: T.Object3D, radius: number, tube: number, z: number, mat: T.Material) {
  const mesh = new T.Mesh(new T.TorusGeometry(radius, tube, 5, 64), mat);
  mesh.position.z = z; parent.add(mesh); return mesh;
}

export function desk(parent: T.Object3D, p: Palette) {
  const group = new T.Group(); group.position.set(0.55, 0, -0.72); parent.add(group);
  box(group, [2.55, 0.085, 1.05], [0, 0.86, 0], p.wood, 0.035);
  box(group, [2.32, 0.18, 0.08], [0, 0.72, -0.39], p.edge);
  for (const x of [-1.12, 1.12]) for (const z of [-0.37, 0.37]) {
    const leg = box(group, [0.09, 0.81, 0.09], [x, 0.405, z], p.edge);
    leg.rotation.z = -x * 0.015;
  }
  box(group, [0.59, 0.16, 0.84], [0.81, 0.73, 0], p.wood);
  box(group, [0.15, 0.025, 0.035], [0.81, 0.73, 0.44], p.dark);
  // Two real pages, spine and a pencil, with a few quiet ink lines.
  const notebook = new T.Group(); notebook.position.set(-0.08, 0.916, 0.22); notebook.rotation.y = -0.16; group.add(notebook);
  box(notebook, [0.66, 0.018, 0.39], [0, 0, 0], p.pink, 0.008);
  for (const x of [-0.16, 0.16]) {
    const page = box(notebook, [0.31, 0.012, 0.37], [x, 0.013, 0], p.paper, 0.003); page.rotation.z = -Math.sign(x) * 0.035;
    for (let i = 0; i < 6; i++) box(notebook, [0.2 - (i % 3) * 0.015, 0.001, 0.002], [x, 0.027, -0.11 + i * 0.035], p.edge, 0);
  }
  rod(notebook, new T.Vector3(0.08, 0.05, -0.1), new T.Vector3(0.3, 0.05, 0.14), 0.008, p.dark);
  // Ceramic cup with a visible hollow opening.
  const cup = new T.Mesh(new T.LatheGeometry([new T.Vector2(0.055, 0), new T.Vector2(0.067, 0.13), new T.Vector2(0.059, 0.13), new T.Vector2(0.05, 0.02)], 32), p.paper);
  cup.position.set(-0.65, 0.903, -0.04); cup.castShadow = true; group.add(cup);
  const handle = ring(cup, 0.037, 0.009, 0, p.paper); handle.position.set(0.07, 0.07, 0);
  cylinder(cup, 0.052, 0.052, 0.002, [0, 0.065, 0], p.dark);
  return group;
}

export function lamp(parent: T.Object3D, p: Palette) {
  const root = new T.Group(); root.position.set(1.38, 0.905, -0.72); root.userData.action = 'lamp'; parent.add(root);
  cylinder(root, 0.16, 0.19, 0.04, [0, 0.025, 0], p.teal);
  const a = new T.Vector3(0, 0.06, 0), b = new T.Vector3(0.13, 0.39, -0.02), c = new T.Vector3(-0.13, 0.66, 0.01);
  for (const z of [-0.025, 0.025]) {
    rod(root, a.clone().add(new T.Vector3(0, 0, z)), b.clone().add(new T.Vector3(0, 0, z)), 0.014, p.dark);
    rod(root, b.clone().add(new T.Vector3(0, 0, z)), c.clone().add(new T.Vector3(0, 0, z)), 0.012, p.teal);
  }
  for (const v of [a, b, c]) {
    const joint = cylinder(root, 0.032, 0.032, 0.068, [v.x, v.y, v.z], p.teal); joint.rotation.x = Math.PI / 2;
  }
  const shade = new T.Group(); shade.position.copy(c); shade.rotation.z = -0.42; root.add(shade);
  const profile = [[0.19, 0], [0.19, 0.02], [0.16, 0.09], [0.08, 0.19], [0.045, 0.21]].map(([x, y]) => new T.Vector2(x, y));
  const shell = new T.Mesh(new T.LatheGeometry(profile, 48), p.teal); shell.castShadow = true; shade.add(shell);
  const lining = new T.MeshBasicMaterial({ color: '#f6e0ad', side: T.DoubleSide });
  const inner = new T.Mesh(new T.CircleGeometry(0.174, 40), lining); inner.rotation.x = Math.PI / 2; inner.position.y = 0.015; shade.add(inner);
  const bulbMaterial = new T.MeshBasicMaterial({ color: '#b5c5ad' });
  const bulb = new T.Mesh(new T.SphereGeometry(0.035, 16, 12), bulbMaterial); bulb.position.y = -0.005; shade.add(bulb);
  const light = new T.SpotLight('#ffd89a', 0, 2.2, 0.72, 0.8, 1.4);
  light.position.set(-0.14, 0.64, 0.02); light.target.position.set(-0.43, 0, 0.13); root.add(light, light.target);
  const poolMat = new T.MeshBasicMaterial({ color: '#ffe5a6', transparent: true, opacity: 0, depthWrite: false });
  const pool = new T.Mesh(new T.CircleGeometry(0.32, 48), poolMat); pool.rotation.x = -Math.PI / 2; pool.scale.y = 0.8; pool.position.set(-0.32, 0.002, 0.04); root.add(pool);
  return { root, set(on: boolean) { light.intensity = on ? 2.5 : 0; bulbMaterial.color.set(on ? '#fff1bd' : '#b5c5ad'); lining.color.set(on ? '#ffe2a2' : '#b7c3ab'); poolMat.opacity = on ? 0.18 : 0; } };
}

export function fan(parent: T.Object3D, p: Palette) {
  const root = new T.Group(); root.position.set(-1.3, 0, -0.25); root.rotation.y = 0.12; root.userData.action = 'fan'; parent.add(root);
  const base = cylinder(root, 0.24, 0.28, 0.055, [0, 0.045, 0], p.teal); base.scale.z = 0.8;
  cylinder(root, 0.035, 0.047, 0.69, [0, 0.4, -0.04], p.teal);
  box(root, [0.1, 0.2, 0.1], [0, 0.68, -0.045], p.teal, 0.025);
  for (let i = 0; i < 3; i++) box(root, [0.034, 0.015, 0.055], [-0.06 + i * 0.06, 0.077, 0.12], i ? p.paper : p.dark, 0.005);
  const head = new T.Group(); head.position.set(0, 1.01, -0.04); root.add(head);
  const motor = cylinder(head, 0.083, 0.085, 0.18, [0, 0, -0.05], p.dark); motor.rotation.x = Math.PI / 2;
  const blades = new T.Group(); head.add(blades);
  for (let i = 0; i < 3; i++) {
    const shape = new T.Shape(); shape.moveTo(0.025, 0); shape.bezierCurveTo(0.02, 0.14, -0.1, 0.31, 0.04, 0.31);
    shape.bezierCurveTo(0.19, 0.28, 0.19, 0.12, 0.035, 0); shape.closePath();
    const blade = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.003, bevelThickness: 0.003, curveSegments: 12 }), p.teal);
    blade.rotation.z = i * Math.PI * 2 / 3; blades.add(blade);
  }
  for (const z of [-0.065, 0.07]) ring(head, 0.345, 0.008, z, p.dark);
  for (let i = 1; i <= 6; i++) ring(head, i * 0.05, 0.0028, 0.105 - (i / 6) ** 2 * 0.035, p.wire);
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2;
    const curve = new T.QuadraticBezierCurve3(new T.Vector3(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.11), new T.Vector3(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.13), new T.Vector3(Math.cos(a) * 0.345, Math.sin(a) * 0.345, 0.07));
    head.add(new T.Mesh(new T.TubeGeometry(curve, 8, 0.0025, 4, false), p.wire));
  }
  const hub = cylinder(head, 0.065, 0.065, 0.026, [0, 0, 0.115], p.teal); hub.rotation.x = Math.PI / 2;
  return { root, head, blades };
}

export function plant(parent: T.Object3D, p: Palette, x: number, y: number, z: number, scale = 1) {
  const root = new T.Group(); root.position.set(x, y, z); root.scale.setScalar(scale); parent.add(root);
  cylinder(root, 0.105, 0.073, 0.18, [0, 0.09, 0], p.terracotta);
  cylinder(root, 0.11, 0.11, 0.025, [0, 0.18, 0], p.terracotta);
  cylinder(root, 0.097, 0.097, 0.008, [0, 0.183, 0], p.dark);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, h = 0.27 + (i % 4) * 0.055, end = new T.Vector3(Math.sin(a) * 0.16, h, Math.cos(a) * 0.12);
    rod(root, new T.Vector3(0, 0.18, 0), end, 0.003, p.leaf);
    const leaf = new T.Mesh(new T.SphereGeometry(1, 10, 6), i % 3 ? p.leaf : p.leafLight);
    leaf.scale.set(0.07, 0.012, 0.14); leaf.position.copy(end); leaf.rotation.set(0.3, a, -0.2); root.add(leaf);
  }
  return root;
}

export function curtain(parent: T.Object3D, p: Palette, x: number, side: number) {
  const geometry = new T.PlaneGeometry(0.72, 1.9, 24, 36);
  const rest = geometry.attributes.position.array.slice() as Float32Array;
  const mat = p.cloth.clone(); mat.side = T.DoubleSide; mat.transparent = true; mat.opacity = 0.88;
  const mesh = new T.Mesh(geometry, mat); mesh.position.set(x, 2.13, -1.36); mesh.receiveShadow = true; parent.add(mesh);
  function update(t: number) {
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const px = rest[i * 3], py = rest[i * 3 + 1], drop = (0.95 - py) / 1.9;
      const fold = Math.sin((px + 0.36) * 39) * 0.047;
      const breeze = Math.sin(t * 0.65 + drop * 2 + side) * 0.06;
      position.setXYZ(i, px + side * Math.sin(drop * Math.PI * 0.8) * 0.13 + breeze * drop, py + Math.cos(px * 17) * 0.015 * drop, fold + drop ** 2 * (0.16 + breeze));
    }
    position.needsUpdate = true; geometry.computeVertexNormals();
  }
  update(0); return { mesh, update };
}
