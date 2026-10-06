import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the app from /<repo-name>/; locally and in tests it is served from /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
