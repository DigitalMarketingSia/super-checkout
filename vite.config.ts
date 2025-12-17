import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    base: '/', // Use absolute paths for all assets to work correctly on nested routes
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/mp-api': {
          target: 'https://api.mercadopago.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mp-api/, '')
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      // Correctly expose VERCEL_URL to import.meta.env for client-side usage
      'import.meta.env.VITE_VERCEL_URL': JSON.stringify(process.env.VERCEL_URL || env.VERCEL_URL),
      // Keep process.env version for backward compatibility if used elsewhere
      'process.env.VITE_VERCEL_URL': JSON.stringify(process.env.VERCEL_URL || env.VERCEL_URL)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
