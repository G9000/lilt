import { createServer as socketServer } from 'node:net';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// Vite merges proxy maps and treats port 0 as its normal dev port. Neither belongs in a fixture.
export async function createIsolatedVite(options) {
  const probe = socketServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return createServer({
    ...options,
    configFile: false,
    plugins: [react(), ...(options.plugins ?? [])],
    server: { host: '127.0.0.1', port, strictPort: true, proxy: undefined },
  });
}
