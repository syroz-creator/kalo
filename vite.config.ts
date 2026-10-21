import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const key = process.env.VITE_REVENUECAT_IOS_API_KEY ?? loadEnv(mode, import.meta.dirname, 'VITE_REVENUECAT_IOS_API_KEY').VITE_REVENUECAT_IOS_API_KEY;
  if (key?.trim() && !/^appl_[A-Za-z0-9]+$/.test(key.trim())) {
    throw new Error('VITE_REVENUECAT_IOS_API_KEY must be a public Apple SDK key (appl_...), never a secret API key.');
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
