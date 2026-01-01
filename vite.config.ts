import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  readFileSync,
  existsSync,
  readlinkSync,
  statSync,
  readdirSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import type { Plugin } from "vite";

/**
 * Plugin robusto que resuelve módulos npm usando el import_map.json de Deno
 * Solo resuelve módulos que realmente necesitan ayuda, dejando que Vite maneje el resto
 */
function denoResolvePlugin(): Plugin {
  let importMap: Record<string, string> = {};
  let rootDir: string;

  // Función para resolver symlink relativo a ruta absoluta
  function resolveSymlink(symlinkPath: string): string | null {
    if (!existsSync(symlinkPath)) {
      return null;
    }

    try {
      const stats = statSync(symlinkPath);
      if (!stats.isSymbolicLink()) {
        return symlinkPath;
      }

      const target = readlinkSync(symlinkPath);

      if (!target.startsWith("/")) {
        const symlinkDir = dirname(symlinkPath);
        const absoluteTarget = resolve(symlinkDir, target);
        return absoluteTarget;
      }

      return target;
    } catch (e) {
      return null;
    }
  }

  // Función para encontrar la ruta real de un módulo
  function findRealPath(moduleName: string, subPath = ""): string | null {
    // Si hay subpath, intentar resolverlo
    if (subPath) {
      const nodeModulesPath = resolve(
        rootDir,
        "node_modules",
        moduleName,
        subPath
      );
      const resolvedPath = resolveSymlink(nodeModulesPath);
      if (resolvedPath && existsSync(resolvedPath)) {
        const stats = statSync(resolvedPath);
        // Solo devolver si es un archivo, no un directorio
        if (stats.isFile()) {
          return resolvedPath;
        }
      }
    }

    // Para módulos sin subpath, no intervenir - dejar que Vite los resuelva
    // Solo intervenimos si hay un problema específico con symlinks
    return null;
  }

  return {
    name: "deno-resolve",
    enforce: "pre",
    configResolved(config) {
      rootDir = config.root;
      try {
        const importMapContent = readFileSync(
          resolve(rootDir, "import_map.json"),
          "utf-8"
        );
        const parsed = JSON.parse(importMapContent);
        importMap = parsed.imports || {};
      } catch (e) {
        console.warn("[deno-resolve] No se pudo cargar import_map.json");
      }
    },
    resolveId(source, importer) {
      // Solo manejar subpaths explícitos como "gsap/ScrollTrigger"
      for (const [key, value] of Object.entries(importMap)) {
        if (source.startsWith(key + "/")) {
          if (value.startsWith("npm:")) {
            const subPath = source.substring(key.length);
            const pkgSpec = value.replace("npm:", "");
            let moduleName: string;
            if (pkgSpec.startsWith("@")) {
              const parts = pkgSpec.split("@");
              moduleName =
                parts.length >= 3
                  ? `@${parts[1]}`
                  : pkgSpec.split("@")[0] + "@" + (pkgSpec.split("@")[1] || "");
            } else {
              moduleName = pkgSpec.split("@")[0];
            }

            const realPath = findRealPath(moduleName, subPath);
            if (realPath) {
              return realPath;
            }
          }
        }
      }

      // Para módulos normales sin subpath, no intervenir
      // Dejar que Vite use su resolución por defecto
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), denoResolvePlugin()],
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
    preserveSymlinks: true, // Cambiar a true para que Vite siga los symlinks
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
      conditions: ["import", "module", "browser", "default"],
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {},
    },
  },
});
