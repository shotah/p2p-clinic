import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Worker URL from environment
    'import.meta.env.VITE_WORKER_URL': JSON.stringify(
      process.env.VITE_WORKER_URL || 'http://localhost:8787'
    ),
  },
});
