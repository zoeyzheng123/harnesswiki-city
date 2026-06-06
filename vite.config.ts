import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Config lives at the repo root (Vite convention, so a bare `vite` command
// finds it) while the dashboard source lives under `src/ui`. `root` points the
// dev server / build at that subtree; the static bundle is emitted to the
// gitignored repo-root `dist/`. `base: "./"` keeps asset paths relative so the
// build works from any host or subpath during the demo.
export default defineConfig({
  root: "src/ui",
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
});
