import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@minijay/timeline/timeline.css',
        replacement: fileURLToPath(
          new URL('../src/timeline/editor.css', import.meta.url),
        ),
      },
      {
        find: '@minijay/timeline',
        replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      },
    ],
  },
});
