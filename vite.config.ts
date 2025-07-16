import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
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
    // Use esbuild for better compatibility
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['@tanstack/react-query'],
        },
      },
    },
    // Source maps for debugging in development only
    sourcemap: false,
    // Ensure compatibility with older browsers
    target: 'es2015',
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost',
    fs: {
      strict: true,
      deny: ["**/.*", "**/node_modules/**"],
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: '0.0.0.0',
  },
  // Environment variables configuration
  envPrefix: ['VITE_', 'PUBLIC_'],
  // Security optimizations
  define: {
    __DEV__: process.env.NODE_ENV !== 'production',
  },
  // Ensure optimal chunking for deployment
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
});
