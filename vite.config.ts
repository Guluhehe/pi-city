import { defineConfig } from 'vite';

// Local default is `/`. GitHub project Pages sets VITE_BASE=/pi-city/ in CI.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  server: { port: 5173 },
  preview: { port: 4173 },
});
