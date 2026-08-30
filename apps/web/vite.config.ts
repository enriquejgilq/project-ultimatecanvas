import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/features': '/src/features',
      '@/hooks': '/src/hooks',
      '@/lib': '/src/lib',
      '@/pages': '/src/pages',
      '@/routes': '/src/routes',
      '@/utils': '/src/utils',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
