import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: Object.fromEntries(["/api", "/mcp", "/healthz", "/texts/images"].map((p) => [p, { target: "http://127.0.0.1:7878", changeOrigin: false }])) },
  build: { outDir: "dist", sourcemap: false },
});
