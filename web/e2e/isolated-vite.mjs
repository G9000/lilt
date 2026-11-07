import { createServer as socketServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite merges proxy maps and treats port 0 as its normal dev port. Neither belongs in a fixture.
export async function createIsolatedVite(options) {
  const probe = socketServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  // Optimizers replace this directory. Sharing it can invalidate another server's dependencies.
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'lilt-vite-'));
  try {
    const server = await createServer({
      ...options,
      cacheDir,
      configFile: false,
      plugins: [react(), tailwindcss(), ...(options.plugins ?? [])],
      server: { host: '127.0.0.1', port, strictPort: true, proxy: undefined },
    });
    const close = server.close.bind(server);
    server.close = async () => {
      await close();
      await rm(cacheDir, { recursive: true, force: true });
    };
    return server;
  } catch (error) {
    await rm(cacheDir, { recursive: true, force: true });
    throw error;
  }
}
