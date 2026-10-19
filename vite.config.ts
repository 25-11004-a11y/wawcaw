import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/patterns', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('./api/patterns.ts');
          await mod.default(req, res);
        } catch (err) {
          console.warn('API /api/patterns execution error:', err);
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'patterns_unavailable' }));
        }
      });

      server.middlewares.use('/api/pattern-image', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('./api/pattern-image.ts');
          await mod.default(req, res);
        } catch (err) {
          console.warn('API /api/pattern-image execution error:', err);
          res.statusCode = 400;
          res.end('Bad request');
        }
      });

      server.middlewares.use('/api/art-card', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('./api/art-card.ts');
          await mod.default(req, res);
        } catch (err) {
          console.warn('API /api/art-card execution error:', err);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ fallback: true }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
