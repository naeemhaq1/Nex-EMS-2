
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      allow: ['..', '.', '../shared', '../server']
    },
    hmr: {
      clientPort: 443
    },
    watch: {
      ignored: ['!**/node_modules/.vite/**']
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  define: {
    global: 'globalThis',
    __WS_TOKEN__: JSON.stringify(process.env.WS_TOKEN || ''),
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
