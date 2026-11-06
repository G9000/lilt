import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';

/** A production build with no backend proxy and no owner data. */
export async function productionPreview() {
  const root = await mkdtemp(join(tmpdir(), 'lilt-preview-'));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
  let server;
  const close = async () => {
    if (server?.listening) await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('lilt-preview-'));
    await rm(root, { recursive: true, force: true });
  };
  try {
    await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'build', '--manifest', '--outDir', root], {
      cwd: fileURLToPath(new URL('..', import.meta.url)), timeout: 60_000,
    });
    const manifest = JSON.parse(await readFile(join(root, '.vite/manifest.json'), 'utf8'));
    server = createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
        const file = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
        const bytes = await readFile(file);
        response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(bytes);
      } catch { response.writeHead(404).end(); }
    });
    await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
    return { url: `http://127.0.0.1:${server.address().port}/`, manifest, close };
  } catch (error) { await close(); throw error; }
}
