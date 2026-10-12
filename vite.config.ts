import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ElysiaTools/',
  build: { outDir: 'dist', sourcemap: false }
});
