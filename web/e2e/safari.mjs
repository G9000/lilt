// Installed Safari smoke harness, without enabling Remote Automation or microphone access.
// Run Lilt against a disposable data directory on :7979, then run this script and open :5175.
// Audio is generated in the browser. The real recorder, local API, storage and Praat are used.
import { createServer, request } from "node:http";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { build } = require(createRequire(require.resolve("vite")).resolve("esbuild"));
const backend = new URL(process.env.LILT_URL ?? "http://127.0.0.1:7979");
const port = Number(process.env.SAFARI_TEST_PORT ?? 5175);
const resultsPath = process.env.SAFARI_RESULTS ?? "/private/tmp/lilt-safari-results.json";
let latest = null;
const bundle = await build({
  entryPoints: [new URL("safari-browser.ts", import.meta.url).pathname],
  bundle: true, platform: "browser", format: "iife", target: "safari16", write: false,
  plugins: [{ name: "browser-pitch-tests", setup(builder) {
    builder.onResolve({ filter: /^node:(test|assert\/strict)$/ }, ({ path }) => ({ path, namespace: "test-shim" }));
    builder.onLoad({ filter: /.*/, namespace: "test-shim" }, ({ path }) => ({ contents: path === "node:test" ? `
      globalThis.__pitchResults = [];
      export function test(name, fn) {
        try { fn(); globalThis.__pitchResults.push({name, pass:true}); }
        catch(error) { globalThis.__pitchResults.push({name, pass:false, error:String(error)}); }
      }` : `
      function deep(a,b) {
        if(Object.is(a,b)) return true;
        if(!a || !b || typeof a!=='object' || typeof b!=='object' || Array.isArray(a)!==Array.isArray(b)) return false;
        const keys=Object.keys(a);
        return keys.length===Object.keys(b).length && keys.every(k=>Object.hasOwn(b,k) && deep(a[k],b[k]));
      }
      function check(ok,message) { if(!ok) throw new Error(message || 'Assertion failed'); }
      export default {
        ok:check,
        equal:(a,b,message)=>check(Object.is(a,b),message || String(a)+' !== '+String(b)),
        deepEqual:(a,b,message)=>check(deep(a,b),message || 'Values differ')
      };` }));
  } }],
});
const html = `<!doctype html><meta charset="utf-8"><title>Lilt Safari checks</title>
<style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:20px}button{font:inherit;padding:14px}pre{white-space:pre-wrap}li{margin:8px 0}</style>
<h1>Lilt Safari checks</h1><p>Generated audio only. Real local API and recording storage use the disposable test server.</p>
<button id="run">Run Safari checks and open peer window</button><p id="status">Ready</p><ul id="results"></ul><pre id="details"></pre><script src="/checks.js"></script>`;
const server = createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    // Preserve the browser's Host, as Vite does, so Lilt's Origin/Host check remains effective.
    const upstream = request(new URL(req.url, backend), { method: req.method, headers: req.headers }, (response) => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on("error", (error) => { res.writeHead(502); res.end(JSON.stringify({ error: error.message })); });
    req.pipe(upstream); return;
  }
  if (req.url === "/results" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    latest = JSON.parse(body);
    await writeFile(resultsPath, JSON.stringify(latest, null, 2));
    console.log(`${latest.complete ? "COMPLETE" : "PROGRESS"}: ${latest.results.filter(r => r.pass).length}/${latest.results.length} passed`);
    res.writeHead(200); res.end("ok"); return;
  }
  if (req.url === "/results") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(latest)); return; }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", req.url === "/checks.js" ? "text/javascript" : "text/html");
  res.end(req.url === "/checks.js" ? bundle.outputFiles[0].contents : html);
});
server.listen(port, "127.0.0.1", () => console.log(`Safari checks: http://127.0.0.1:${port} (backend ${backend.origin}); results ${resultsPath}`));
