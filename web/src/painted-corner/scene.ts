import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { palette, sunPatch, type CornerStyle } from './materials';
import { box, curtain, desk, fan, lamp, plant, rod } from './objects';

export interface CornerState { lamp: boolean; fan: 0 | 1 | 2; paused: boolean }
export type Action = 'lamp' | 'fan';
export type { CornerStyle } from './materials';
export interface Corner {
  set(state: CornerState): void;
  reset(): void;
  move(horizontal: number, vertical?: number, zoom?: number): void;
  dispose(): void;
}

export function createCorner(canvas: HTMLCanvasElement, initial: CornerState, events: {
  action(action: Action): void; hover(action: Action | null): void; ready(): void; error(): void;
}, style: CornerStyle = 'painted'): Corner {
  const sketch = style === 'sketch';
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  const ink = new T.Color('#694431');
  const outline = sketch ? new OutlineEffect(renderer, { defaultThickness: 0.0011, defaultColor: ink.toArray(), defaultAlpha: 0.85 }) : null;
  const scene = new T.Scene(); scene.background = new T.Color(sketch ? '#ead4b9' : '#b2d0cb');
  // OutlineEffect has no dispose method. Capture its temporary materials during its first
  // pass, before it restores the scene, so StrictMode cleanup can release those programs too.
  const outlineMaterials = new Set<T.Material>();
  const afterRender = scene.onAfterRender;
  if (outline) scene.onAfterRender = () => {
    scene.traverse(o => {
      if (o instanceof T.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m instanceof T.ShaderMaterial) outlineMaterials.add(m);
      }
    });
  };
  const camera = new T.PerspectiveCamera(43, 1, 0.05, 35);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = false;
  controls.minAzimuthAngle = -0.38; controls.maxAzimuthAngle = 0.42;
  controls.minPolarAngle = 1.03; controls.maxPolarAngle = 1.6;
  controls.minDistance = 2.8; controls.maxDistance = 8.5;
  controls.rotateSpeed = 0.45; controls.zoomSpeed = 0.55;
  const p = palette(style);
  const ambient = new T.HemisphereLight(sketch ? '#fff3df' : '#d2f2ed', sketch ? '#b6a18b' : '#7e9a94', 2.2); scene.add(ambient);
  const sun = new T.DirectionalLight(sketch ? '#fff6df' : '#fff0c8', 2.6); sun.position.set(-2.8, 6, -3.4); sun.target.position.set(0.3, 0, 0.9);
  sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); sun.shadow.camera.left = -3.8; sun.shadow.camera.right = 3.8;
  sun.shadow.camera.top = 4.5; sun.shadow.camera.bottom = -3; sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00015;
  scene.add(sun, sun.target);

  // Build around the opening, so the window is a hole in a real wall.
  box(scene, [6.8, 0.12, 5.7], [0, -0.065, 0.7], p.floor);
  for (let i = 0; i < 17; i++) box(scene, [0.012, 0.002, 5.6], [-3.2 + i * 0.4, 0.001, 0.7], p.edge, 0);
  box(scene, [6.8, 1.16, 0.14], [0, 0.58, -1.65], p.wall);
  box(scene, [6.8, 3, 0.14], [0, 4.57, -1.65], p.wall);
  box(scene, [1.45, 2, 0.14], [-2.675, 2.13, -1.65], p.wall);
  box(scene, [1.1, 2, 0.14], [2.85, 2.13, -1.65], p.wall);
  box(scene, [0.12, 3.55, 4.8], [-3.38, 1.77, 0.7], p.wall);
  box(scene, [6.7, 0.1, 0.05], [0, 0.08, -1.53], p.edge);
  // Frame, sill and slightly open inner casement.
  box(scene, [4.35, 0.1, 0.37], [0.16, 1.15, -1.5], p.wood);
  for (const x of [-1.98, 0.14, 2.29]) box(scene, [0.065, 1.97, 0.085], [x, 2.13, -1.54], p.edge);
  for (const y of [1.2, 2.23, 3.08]) box(scene, [4.33, 0.055, 0.085], [0.16, y, -1.54], p.edge);
  const casement = new T.Group(); casement.position.set(-1.96, 1.24, -1.48); casement.rotation.y = -0.14; scene.add(casement);
  for (const x of [0, 1.04]) box(casement, [0.026, 1.8, 0.035], [x, 0.9, 0], p.edge);
  for (const y of [0, 0.96, 1.8]) box(casement, [1.04, 0.027, 0.035], [0.52, y, 0], p.edge);
  box(casement, [0.02, 0.12, 0.04], [0.99, 0.8, 0.035], p.dark);
  rod(scene, new T.Vector3(-2.35, 3.17, -1.32), new T.Vector3(2.65, 3.17, -1.32), 0.018, p.edge);
  const curtains = [curtain(scene, p, -1.9, -1), curtain(scene, p, 2.25, 1)];
  desk(scene, p);
  const deskLamp = lamp(scene, p), deskFan = fan(scene, p);
  plant(scene, p, -0.55, 1.21, -1.47, 0.85);
  plant(scene, p, 1.78, 1.21, -1.45, 0.72);
  // A few personal things keep the corner inhabited without hiding its controls.
  box(scene, [1.05, 0.04, 0.22], [-2.66, 2.21, -1.43], p.wood);
  plant(scene, p, -2.87, 2.24, -1.4, 0.85);
  for (let i = 0; i < 5; i++) {
    const book = box(scene, [0.044, 0.23 + (i % 3) * 0.025, 0.14], [-2.53 + i * 0.055, 2.37, -1.41], i % 2 ? p.paper : p.book, 0.003);
    book.rotation.z = i === 4 ? -0.13 : 0;
  }
  // Stool at the edge of the composition provides foreground parallax.
  box(scene, [0.49, 0.055, 0.43], [0.29, 0.5, 0.48], p.wood, 0.045);
  for (const x of [0.1, 0.48]) for (const z of [0.32, 0.64]) box(scene, [0.045, 0.48, 0.045], [x, 0.25, z], p.edge);

  const patch = sunPatch();
  const patchMaterial = new T.MeshBasicMaterial({ map: patch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  patchMaterial.userData.outlineParameters = { visible: false };
  const floorSun = new T.Mesh(new T.PlaneGeometry(3.8, 3), patchMaterial); floorSun.rotation.x = -Math.PI / 2; floorSun.rotation.z = -0.18; floorSun.position.set(0.2, 0.012, 0.45); scene.add(floorSun);
  const deskSun = new T.Mesh(new T.PlaneGeometry(2.5, 1.01), patchMaterial); deskSun.rotation.x = -Math.PI / 2; deskSun.position.set(0.55, 0.904, -0.72); scene.add(deskSun);

  // The outdoors is distant painted scenery; furniture and window are all modeled.
  const landscapeMaterial = new T.MeshBasicMaterial({ color: '#c7e6db' });
  landscapeMaterial.userData.outlineParameters = { visible: false };
  const landscape = new T.Mesh(new T.PlaneGeometry(8.4, 5.6), landscapeMaterial); landscape.position.set(0, 2.8, -3.4); scene.add(landscape);
  let dead = false, broken = false, state = initial, raf = 0, last = 0, time = 0, ready = false, loaded = 0, activePointer: number | null = null;
  let narrow: boolean | null = null;
  let down: { x: number; y: number; id: number; moved: boolean } | null = null;
  function loadedOne() { if (++loaded === 2 && !dead && !broken) { ready = true; render(); events.ready(); } }
  function fail() { if (!dead) { broken = true; stop(); events.error(); } }
  const texture = new T.TextureLoader().load(`/painted-corner/${sketch ? 'sketch-summer' : 'summer'}.png`, t => {
    if (dead) { t.dispose(); return; }
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    landscapeMaterial.map = t; landscapeMaterial.color.set('#ffffff'); landscapeMaterial.needsUpdate = true;
    loadedOne();
  }, undefined, fail);
  const atlas = new T.TextureLoader().load(`/painted-corner/${sketch ? 'sketch-surfaces' : 'surfaces'}.png`, t => {
    if (dead) { t.dispose(); return; }
    p.applyAtlas(t);
    for (const c of curtains) { c.mesh.material.map = p.cloth.map; c.mesh.material.color.copy(p.cloth.color); c.mesh.material.needsUpdate = true; }
    loadedOne();
  }, undefined, fail);

  function render() {
    if (dead || broken) return;
    if (outline) { outline.render(scene, camera); if (outlineMaterials.size) scene.onAfterRender = afterRender; }
    else renderer.render(scene, camera);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function frame(now: number) {
    if (dead || broken || state.paused || document.hidden) { stop(); return; }
    raf = requestAnimationFrame(frame);
    if (last && now - last < 32) return;
    const dt = last ? Math.min((now - last) / 1000, 0.06) : 0; last = now; time += dt;
    deskFan.blades.rotation.z -= dt * (state.fan === 2 ? 23 : state.fan === 1 ? 9 : 0);
    if (state.fan) deskFan.head.rotation.y = Math.sin(time * 0.42) * 0.21;
    curtains.forEach(c => c.update(time));
    floorSun.position.x = 0.2 + Math.sin(time * 0.22) * 0.018;
    render();
  }
  function start() { if (!dead && !broken && !raf && !state.paused && !document.hidden) raf = requestAnimationFrame(frame); }
  function resize() {
    if (dead) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    const isNarrow = camera.aspect < 0.85;
    camera.fov = isNarrow ? 57 : 43;
    camera.updateProjectionMatrix();
    if (narrow !== isNarrow) { narrow = isNarrow; reset(); }
    renderer.setSize(width, height, false); render();
  }
  function reset() {
    controls.target.set(0.05, 1.52, -0.65);
    camera.position.set(narrow ? 0.1 : -0.95, narrow ? 2.2 : 2.07, narrow ? 7.2 : 4.45);
    controls.update(); render();
  }
  const ray = new T.Raycaster(), pointer = new T.Vector2();
  function hit(e: PointerEvent): Action | null {
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    // Occluding furniture is included: a hidden object cannot be clicked through the desk.
    for (const intersection of ray.intersectObjects(scene.children, true)) {
      if (!(intersection.object instanceof T.Mesh) || intersection.object === floorSun || intersection.object === deskSun) continue;
      let object: T.Object3D | null = intersection.object;
      while (object) { if (object.userData.action) return object.userData.action as Action; object = object.parent; }
      return null;
    }
    return null;
  }
  function pointerDown(e: PointerEvent) {
    if (activePointer !== null) { down = null; return; }
    activePointer = e.pointerId; down = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    canvas.focus({ preventScroll: true });
  }
  function pointerMove(e: PointerEvent) {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
    const action = down?.moved ? null : hit(e);
    canvas.style.cursor = action ? 'pointer' : 'grab'; events.hover(action);
  }
  function pointerUp(e: PointerEvent) {
    if (down && e.pointerId === down.id && !down.moved && e.button === 0 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
      const action = hit(e); if (action) events.action(action);
    }
    if (activePointer === e.pointerId) activePointer = null;
    down = null;
  }
  function cancel() { down = null; activePointer = null; events.hover(null); }
  function visibility() { if (document.hidden) stop(); else { render(); start(); } }
  function lost(e: Event) { e.preventDefault(); fail(); }
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  controls.addEventListener('change', render);
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('pointerleave', cancel); canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  deskLamp.set(state.lamp); resize(); start();

  return {
    set(next) { state = next; deskLamp.set(next.lamp); if (state.paused) stop(); else start(); render(); },
    reset,
    move(horizontal, vertical = 0, zoom = 1) {
      const offset = camera.position.clone().sub(controls.target), spherical = new T.Spherical().setFromVector3(offset);
      spherical.theta = T.MathUtils.clamp(spherical.theta + horizontal, controls.minAzimuthAngle, controls.maxAzimuthAngle);
      spherical.phi = T.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
      spherical.radius = T.MathUtils.clamp(spherical.radius * zoom, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical)); controls.update(); render();
    },
    dispose() {
      dead = true; stop(); observer.disconnect(); controls.removeEventListener('change', render); controls.dispose();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('pointerleave', cancel); canvas.removeEventListener('webglcontextlost', lost);
      document.removeEventListener('visibilitychange', visibility);
      const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
      scene.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      p.dispose(); patch.dispose(); texture.dispose(); atlas.dispose(); sun.shadow.map?.dispose();
      outlineMaterials.forEach(m => m.dispose()); outlineMaterials.clear(); scene.onAfterRender = afterRender;
      renderer.dispose();
      // Let the browser reclaim the context too on repeated entry and React StrictMode remounts.
      if (ready || !canvas.isConnected) renderer.forceContextLoss();
    },
  };
}
