// Servidor para Deno Deploy que maneja routing SPA
// Todas las rutas redirigen a index.html para que React Router pueda manejar el routing
// Los assets están en S3/CloudFront, así que solo servimos archivos JS/CSS generados por Vite

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Si es un archivo estático generado por Vite (JS, CSS, etc.), servirlo directamente
  // Los assets (imágenes, etc.) están en S3/CloudFront, no los serviré desde aquí
  if (pathname.includes(".") && !pathname.endsWith("/")) {
    const ext = pathname.split(".").pop()?.toLowerCase();
    // Solo servir archivos JS, CSS, JSON, y otros archivos generados por Vite
    if (
      ext &&
      ["js", "css", "json", "map", "woff", "woff2", "ttf", "eot"].includes(ext)
    ) {
      try {
        const file = await Deno.readFile(`./dist${pathname}`);
        const contentType = getContentType(ext);
        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      } catch {
        // Si el archivo no existe, continuar para servir index.html
      }
    }
  }

  // Para todas las demás rutas (incluyendo rutas de la SPA), servir index.html
  // Esto permite que React Router maneje el routing del lado del cliente
  // CRÍTICO: Siempre devolver index.html para rutas no estáticas
  // React Router se encargará de mostrar NotFound.tsx para rutas inválidas
  const possiblePaths = [
    "./dist/index.html", // Build de producción
    "./index.html", // Fallback
    "dist/index.html",
    "index.html",
  ];

  let indexHtml: string | null = null;
  for (const path of possiblePaths) {
    try {
      indexHtml = await Deno.readTextFile(path);
      break;
    } catch (error) {
      // Continuar con el siguiente path
      continue;
    }
  }

  // Si encontramos index.html, servirlo
  // Esto permite que React Router maneje TODAS las rutas (válidas e inválidas)
  if (indexHtml) {
    return new Response(indexHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Si no se encuentra index.html, esto es un error crítico de configuración
  // En producción, esto NUNCA debe pasar si el build está correcto
  console.error("ERROR CRÍTICO: No se pudo encontrar index.html");
  return new Response("Error interno: No se pudo cargar la aplicación", {
    status: 500,
    headers: { "Content-Type": "text/plain" },
  });
});

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
  };
  return types[ext] || "application/octet-stream";
}
