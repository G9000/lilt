import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// LILT_API points the dev server at a scratch Lilt (see AGENTS.md) instead of the owner's on :7878.
const api = process.env.LILT_API ?? "http://127.0.0.1:7878";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 127.0.0.1, not "localhost": Spotify only signs you in (and sends you back) at 127.0.0.1.
  server: { host: "127.0.0.1", port: 5173, proxy: Object.fromEntries(["/api", "/mcp", "/auth", "/healthz", "/texts/images", "/texts/audio"].map((p) => [p, { target: api, changeOrigin: false }])) },
  build: { outDir: "dist", sourcemap: false },
});
