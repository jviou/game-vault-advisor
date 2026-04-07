import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy API vers json-server (port 3001 en dev local, ou configurable)
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:3001",
        rewrite: (p) => p.replace(/^\/api/, ""),
        changeOrigin: true,
      },
      // Proxy SteamGridDB vers le proxy Node.js local
      "/sgdb": {
        target: process.env.VITE_DEV_SGDB_TARGET || "http://localhost:3000",
        rewrite: (p) => p.replace(/^\/sgdb/, ""),
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
