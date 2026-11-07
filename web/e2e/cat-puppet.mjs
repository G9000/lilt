import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2]; if (shots) await mkdir(shots, { recursive: true });
const server = await createIsolatedVite({ logLevel: 'error' }); await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1240, height: 1050 }, reducedMotion: 'reduce' });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  const evidence = await page.evaluate(async () => {
    const { CATS } = await import('/src/room/catChoices.ts');
    const { loadRoomImage } = await import('/src/room/roomReadiness.tsx');
    const { renderCatPuppet, syncCatOutline } = await import('/src/room/catPuppet.ts');
    const sheet = document.createElement('div');
    sheet.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#765661;color:white;padding:16px;display:grid;grid-template-columns:150px repeat(3,330px);gap:12px;align-content:start;align-items:center;font:14px sans-serif;overflow:auto';
    document.body.append(sheet);
    for (const label of ['', 'Rest', 'Ear flick', 'Tail swish']) { const text = document.createElement('b'); text.textContent = label; sheet.append(text); }
    const results = [];
    for (const choice of CATS) {
      const image = await loadRoomImage(choice.image);
      const name = document.createElement('b'); name.textContent = choice.name; sheet.append(name);
      const snapshots = [], timings = [];
      let outlineMatches = true;
      for (const pose of [{ ear: 0, tail: 0 }, { ear: 1, tail: 0 }, { ear: 0, tail: .65 }]) {
        const start = performance.now(), sprite = renderCatPuppet(image, pose); timings.push(performance.now() - start);
        if (!sprite) throw new Error(`Missing puppet for ${choice.id}`);
        const copy = document.createElement('canvas'); copy.width = 660; copy.height = 330;
        copy.style.cssText = 'width:330px;height:165px;background:#a47886';
        syncCatOutline(copy, sprite.canvas, sprite.revision);
        const data = sprite.canvas.getContext('2d').getImageData(0,0,660,330).data;
        const outline = copy.getContext('2d').getImageData(0,0,660,330).data;
        outlineMatches &&= data.every((value, i) => i % 4 !== 3 || value === outline[i]);
        snapshots.push(data); sheet.append(copy);
      }
      const countChanges = (a, b, box) => {
        let changes = 0;
        for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) {
          const i = (y * 660 + x) * 4;
          if (a[i] !== b[i] || a[i+1] !== b[i+1] || a[i+2] !== b[i+2] || a[i+3] !== b[i+3]) changes++;
        }
        return changes;
      };
      const rest = renderCatPuppet(image, { ear: 0, tail: 0 });
      const restored = rest.canvas.getContext('2d').getImageData(0,0,660,330).data;
      const revision = rest.revision;
      const cached = renderCatPuppet(image, { ear: 0, tail: 0 });
      const reused = cached.revision === revision;
      const warmed = [];
      for (let step = 1; step <= 30; step++) {
        const start = performance.now(); renderCatPuppet(image, { ear: step / 30, tail: 0 }); warmed.push(performance.now() - start);
      }
      results.push({ id: choice.id, outlineMatches, restored: snapshots[0].every((v,i) => v === restored[i]), cached: reused,
        ear: countChanges(snapshots[0], snapshots[1], [310,0,660,170]), tail: countChanges(snapshots[0], snapshots[2], [310,240,465,330]),
        face: countChanges(snapshots[0], snapshots[1], [490,175,615,255]), paws: countChanges(snapshots[0], snapshots[2], [480,270,590,310]),
        body: countChanges(snapshots[0], snapshots[1], [60,60,270,215]) + countChanges(snapshots[0], snapshots[2], [60,60,270,215]),
        timings, averageMs: warmed.reduce((a,b) => a+b,0) / warmed.length });
    }
    const blockedImage = new Image(); blockedImage.src = CATS[0].image; await blockedImage.decode();
    const read = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = () => { throw new DOMException('Pixel reads blocked', 'SecurityError'); };
    let fallback;
    try { fallback = renderCatPuppet(blockedImage, { ear: 1, tail: 0 }) === null; }
    finally { CanvasRenderingContext2D.prototype.getImageData = read; }
    return { results, fallback };
  });
  console.log(JSON.stringify(evidence));
  if (shots) await page.screenshot({ path: path.join(shots, 'ear-tail-poses.png') });
  for (const result of evidence.results) {
    assert.ok(result.ear > 500 && result.tail > 500, `${result.id} visibly deforms ears and tail`);
    assert.equal(result.face + result.paws + result.body, 0, `${result.id} face, paws and body remain fixed`);
    assert.ok(result.outlineMatches && result.restored && result.cached, `${result.id} matching outline, exact rest and cached pose`);
  }
  assert.equal(evidence.fallback, true, 'pixel-read restrictions allow the original-image fallback');
} finally { await browser?.close(); await server.close(); }
