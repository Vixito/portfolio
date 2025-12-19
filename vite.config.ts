import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    hmr: {
      clientPort: 5173,
    },
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    // Asegurar que Vite pueda resolver módulos npm desde node_modules
    // En Deno, node_modules se crea automáticamente con nodeModulesDir: "auto"
    conditions: ["import", "module", "browser", "default"],
  },
  optimizeDeps: {
    include: [
      "gsap",
      "framer-motion",
      "zod",
      "zustand",
      "recharts",
      "react-hook-form",
      "@tanstack/react-query",
      "@hookform/resolvers",
      "@supabase/supabase-js",
      "react-router-dom",
    ],
    esbuildOptions: {
      // Asegurar que esbuild pueda resolver módulos npm
      conditions: ["import", "module", "browser", "default"],
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Asegurar que Rollup pueda resolver módulos npm
      // En Deno, los módulos npm están en node_modules (creado por nodeModulesDir: "auto")
      output: {
        // No externalizar módulos npm, deben ser incluidos en el bundle
      },
    },
  },
});
