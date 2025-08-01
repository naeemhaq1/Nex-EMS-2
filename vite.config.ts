import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// https://vitejs.dev/config/
export default defineConfig({
  esbuild: {
    target: 'es2017', // Target older JS version without BigInt
    supported: {
      'bigint': false // Disable BigInt support to force polyfill
    }
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173,
      host: "0.0.0.0",
      clientPort: process.env.REPL_SLUG ? 443 : 5173,
      protocol: process.env.REPL_SLUG ? 'wss' : 'ws'
    },
    fs: {
      strict: false,
      allow: ['..', '.'],
    },
    origin: process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : undefined,
  },
  define: {
    global: 'globalThis',
    'process.env.WS_TOKEN': JSON.stringify(process.env.WS_TOKEN || 'development_token'),
    '__WS_TOKEN__': JSON.stringify(process.env.WS_TOKEN || 'development_token'),
    'import.meta.env.WS_TOKEN': JSON.stringify(process.env.WS_TOKEN || 'development_token'),
    'window.__WS_TOKEN__': JSON.stringify(process.env.WS_TOKEN || 'development_token'),
    'globalThis.__WS_TOKEN__': JSON.stringify(process.env.WS_TOKEN || 'development_token'),
  },
  optimizeDeps: {
    include: ["react", "react-dom", 'drizzle-orm', 'drizzle-orm/pg-core'],
  },
});