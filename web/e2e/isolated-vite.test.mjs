import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createIsolatedVite } from './isolated-vite.mjs';

test('browser fixtures keep independent caches and preserve the development cache', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'lilt-cache-test-'));
  const devCache = path.join(root, 'node_modules', '.vite');
  const servers = [];
  try {
    await mkdir(devCache, { recursive: true });
    await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    await writeFile(path.join(devCache, 'owner-marker'), 'untouched');
    for (let i = 0; i < 2; i++) servers.push(await createIsolatedVite({ root, logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] } }));
    const caches = servers.map(server => path.resolve(server.config.cacheDir));
    assert.notEqual(caches[0], path.resolve(devCache), 'fixture must not share the dev cache');
    assert.notEqual(caches[0], caches[1], 'concurrent fixtures must not share caches');
    await servers[0].close();
    await servers[1].listen();
    assert.equal(await readFile(path.join(devCache, 'owner-marker'), 'utf8'), 'untouched');
  } finally {
    await Promise.all(servers.map(server => server.close()));
    await rm(root, { recursive: true, force: true });
  }
});
