import type { Plugin } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Plugin de Vite para resolver módulos npm usando el import_map.json de Deno
 * Esto soluciona el problema de que Rollup no puede resolver symlinks relativos
 */
export function denoResolvePlugin(): Plugin {
  let importMap: Record<string, string> = {};
  let rootDir: string;

  // Función helper para extraer versión del spec npm
  function parseNpmSpec(spec: string): { name: string; version: string } {
    const pkgSpec = spec.replace("npm:", "");
    const parts = pkgSpec.split("@");
    
    if (parts.length === 1) {
      return { name: parts[0], version: "latest" };
    }
    
    // Manejar scoped packages como @hookform/resolvers@1.3.4
    if (pkgSpec.startsWith("@")) {
      const [scope, name, ...versionParts] = pkgSpec.split("@");
      if (versionParts.length > 0) {
        return { name: `@${name}`, version: versionParts.join("@") };
      }
      return { name: `@${name}`, version: "latest" };
    }
    
    // Paquetes normales
    const name = parts[0];
    const version = parts.slice(1).join("@") || "latest";
    return { name, version };
  }

  // Función para encontrar la ruta real del módulo
  function findModulePath(pkgName: string, version: string, subPath = ""): string | null {
    // Primero intentar la ruta esperada en node_modules/.deno/
    const expectedPath = resolve(
      rootDir,
      "node_modules",
      ".deno",
      `${pkgName}@${version}`,
      "node_modules",
      pkgName,
      subPath
    );

    if (existsSync(expectedPath)) {
      return expectedPath;
    }

    // Si no existe, intentar usar el symlink en node_modules directamente
    const symlinkPath = resolve(rootDir, "node_modules", pkgName, subPath);
    if (existsSync(symlinkPath)) {
      return symlinkPath;
    }

    return null;
  }

  return {
    name: "deno-resolve",
    configResolved(config) {
      rootDir = config.root;
      try {
        const importMapPath = resolve(rootDir, "import_map.json");
        const importMapContent = readFileSync(importMapPath, "utf-8");
        const parsed = JSON.parse(importMapContent);
        importMap = parsed.imports || {};
      } catch (error) {
        console.warn("No se pudo cargar import_map.json:", error);
      }
    },
    resolveId(source, importer) {
      // Si el módulo está en el import_map y es un módulo npm
      if (importMap[source]) {
        const mappedValue = importMap[source];
        if (mappedValue.startsWith("npm:")) {
          const { name, version } = parseNpmSpec(mappedValue);
          const modulePath = findModulePath(name, version);
          
          if (modulePath) {
            return modulePath;
          }
        }
      }

      // Manejar subpaths como "gsap/ScrollTrigger"
      for (const [key, value] of Object.entries(importMap)) {
        if (source.startsWith(key + "/")) {
          if (value.startsWith("npm:")) {
            const subPath = source.substring(key.length);
            const { name, version } = parseNpmSpec(value);
            const modulePath = findModulePath(name, version, subPath);
            
            if (modulePath) {
              return modulePath;
            }
          }
        }
      }

      return null;
    },
  };
}
