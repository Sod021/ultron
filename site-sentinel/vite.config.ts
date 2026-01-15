import { defineConfig, ConfigEnv, UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { PluginOption } from 'vite';
import { componentTagger } from 'lovable-tagger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "fadaebd0-ac62-4bb4-ad0f-1e52ab7f58cf-00-2pq42u28u79qu.kirk.replit.dev"
    ],
  },
  plugins: [
    react(),
    mode === "development" ? componentTagger() : null
  ].filter(Boolean) as PluginOption[],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
}));
