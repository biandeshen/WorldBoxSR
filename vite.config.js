import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  root: 'client',
  base: command === 'build' ? '/WorldBoxSR/' : '/',
  server: {
    host: process.env.HOST || '127.0.0.1',
    port: Number(process.env.PORT || 8080),
    strictPort: true
  },
  build: {
    outDir: '../.pages',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022'
  }
}));
