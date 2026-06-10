import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone demo build — no backend, no API proxy. Built output is a fully static site.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5180,
  },
});
