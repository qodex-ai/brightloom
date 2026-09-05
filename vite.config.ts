import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = 'http://localhost:4101';

export default defineConfig({
  root: 'src/ui',
  plugins: [react()],
  server: {
    port: 4100,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
      '/openapi.json': { target: apiTarget, changeOrigin: false },
    },
  },
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
  },
});
