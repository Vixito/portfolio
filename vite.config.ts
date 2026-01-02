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
    dedupe: [
      "react",
      "react-dom",
      "framer-motion",
      "motion-dom",
      "motion-utils",
    ],
    preserveSymlinks: false, // Cambiar a false para que Vite resuelva los symlinks a sus rutas reales
    conditions: ["import", "module", "browser", "default"],
    alias: {
      // Forzar uso de framer-motion 11.x y sus dependencias
      "framer-motion": "framer-motion",
      "motion-dom": "motion-dom",
      "motion-utils": "motion-utils",
    },
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
    exclude: ["motion-dom"],
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
      external: (id) => {
        // No externalizar nada, queremos que Vite procese todo
        return false;
      },
      plugins: [
        // Plugin para resolver motion-dom correctamente
        {
          name: "resolve-motion-dom",
          resolveId(source, importer) {
            // Si framer-motion está importando motion-dom, forzar la versión 11.18.1
            if (source === "motion-dom") {
              // Buscar la ruta real de motion-dom@11.18.1
              const path11 = resolve(
                process.cwd(),
                "node_modules/.deno/motion-dom@11.18.1/node_modules/motion-dom"
              );
              if (existsSync(path11)) {
                // Si el importador es framer-motion, usar la versión 11.x
                if (importer?.includes("framer-motion")) {
                  return path11;
                }
                // Para otros importadores, también usar 11.x si existe
                return path11;
              }
            }
            // Similar para motion-utils
            if (source === "motion-utils") {
              const path11 = resolve(
                process.cwd(),
                "node_modules/.deno/motion-utils@11.18.1/node_modules/motion-utils"
              );
              if (existsSync(path11)) {
                return path11;
              }
            }
            return null;
          },
        },
      ],
      onwarn(warning, warn) {
        // Suprimir advertencias específicas de módulos
        if (
          warning.code === "UNRESOLVED_IMPORT" ||
          warning.code === "MISSING_EXPORT"
        ) {
          // Solo mostrar si no es de framer-motion o supabase
          if (
            !warning.id?.includes("framer-motion") &&
            !warning.id?.includes("motion-dom") &&
            !warning.id?.includes("@supabase")
          ) {
            warn(warning);
          }
        } else {
          warn(warning);
        }
      },
    },
  },
});
