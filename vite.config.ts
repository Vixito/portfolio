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
 * Construye rutas absolutas desde symlinks relativos que Rollup puede entender
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
        // Si no es symlink, es una ruta directa
        return symlinkPath;
      }

      // Leer el target del symlink
      const target = readlinkSync(symlinkPath);

      // Si es relativo, construir la ruta absoluta
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
    // Primero intentar node_modules directo (symlink)
    const nodeModulesPath = resolve(
      rootDir,
      "node_modules",
      moduleName,
      subPath
    );

    // Resolver el symlink si existe
    const resolvedPath = resolveSymlink(nodeModulesPath);
    if (resolvedPath && existsSync(resolvedPath)) {
      return resolvedPath;
    }

    // Si existe pero no es symlink, usarlo directamente
    if (existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }

    // Buscar en .deno directamente
    const denoDir = resolve(rootDir, "node_modules", ".deno");
    if (existsSync(denoDir)) {
      try {
        const { readdirSync } = require("node:fs");
        const entries = readdirSync(denoDir);
        const matchingEntry = entries.find((entry: string) =>
          entry.startsWith(`${moduleName}@`)
        );

        if (matchingEntry) {
          const denoPath = resolve(
            denoDir,
            matchingEntry,
            "node_modules",
            moduleName,
            subPath
          );
          if (existsSync(denoPath)) {
            return denoPath;
          }
        }
      } catch (e) {
        // Ignorar errores
      }
    }

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
      // Intentar resolver desde import_map
      if (importMap[source]) {
        const mappedValue = importMap[source];
        if (mappedValue.startsWith("npm:")) {
          const pkgSpec = mappedValue.replace("npm:", "");
          // Extraer nombre del paquete
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

          const realPath = findRealPath(moduleName);
          if (realPath) {
            return realPath;
          }
        }
      }

      // Manejar subpaths como "gsap/ScrollTrigger"
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

      // Si no está en el import_map, intentar resolver directamente
      const directPath = findRealPath(source);
      if (directPath) {
        return directPath;
      }

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
    preserveSymlinks: false,
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
