// Build in a disposable directory; never replace the owner's running web app.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';

const scratch = await mkdtemp(join(tmpdir(), 'lilt-bundle-'));
try {
  await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
    'build', '--manifest', '--outDir', scratch,
  ], { cwd: fileURLToPath(new URL('..', import.meta.url)), timeout: 60_000 });
  const assets = await readdir(join(scratch, 'assets'));
  const manifest = JSON.parse(await readFile(join(scratch, '.vite/manifest.json'), 'utf8'));
  const initial = new Set();
  const visit = key => {
    assert.ok(manifest[key], `manifest entry exists: ${key}`);
    if (initial.has(manifest[key].file)) return;
    initial.add(manifest[key].file);
    for (const dependency of manifest[key].imports ?? []) visit(dependency);
  };
  visit('index.html');
  let initialRaw = 0, initialGzip = 0;
  for (const file of initial) {
    if (!file.endsWith('.js')) continue;
    const bytes = await readFile(join(scratch, file));
    initialRaw += bytes.length;
    initialGzip += gzipSync(bytes).length;
  }
  console.log(`initial js: ${initialRaw.toLocaleString('en-US')} bytes; ${initialGzip.toLocaleString('en-US')} gzip`);
  assert.ok(initialRaw <= 650_000, 'initial JavaScript exceeds 650,000 bytes, including static imports');
  assert.ok(initialGzip <= 200_000, 'initial JavaScript exceeds 200,000 gzip bytes');
  // Total all chunks so splitting files cannot hide growth. Allow ordinary feature additions,
  // but catch the duplicated per-component utilities that inflated the initial migration.
  for (const [extension, rawLimit, gzipLimit] of [['css', 650_000, 110_000], ['js', 1_400_000, 390_000]]) {
    const files = assets.filter(file => file.endsWith(`.${extension}`));
    assert.ok(files.length, `production ${extension} exists`);
    let raw = 0, gzip = 0;
    for (const file of files) {
      const bytes = await readFile(join(scratch, 'assets', file));
      raw += bytes.length;
      gzip += gzipSync(bytes).length;
    }
    console.log(`${extension}: ${raw.toLocaleString('en-US')} bytes; ${gzip.toLocaleString('en-US')} gzip`);
    assert.ok(raw <= rawLimit, `${extension} exceeds the ${rawLimit}-byte bundle budget`);
    assert.ok(gzip <= gzipLimit, `${extension} exceeds the ${gzipLimit}-byte compressed budget`);
  }
  console.log('PASS: production CSS and JavaScript stay within the bundle budgets.');
} finally {
  assert.equal(dirname(resolve(scratch)), resolve(tmpdir()));
  assert.ok(basename(scratch).startsWith('lilt-bundle-'));
  await rm(scratch, { recursive: true, force: true });
}
