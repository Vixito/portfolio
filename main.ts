// Servidor para Deno Deploy / Google Cloud Run que maneja routing SPA
// Todas las rutas redirigen a index.html para que React Router pueda manejar el routing
// Los assets están en S3/CloudFront, así que solo servimos archivos JS/CSS generados por Vite

// Cloud Run requiere que escuchemos en el puerto proporcionado por la variable de entorno PORT
const port = parseInt(Deno.env.get("PORT") || "8080", 10);

Deno.serve({ port }, async (req: Request) => {
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
        // Intentar desde dist primero (build de producción)
        const distPath = `./dist${pathname}`;
        const file = await Deno.readFile(distPath);
        const contentType = getContentType(ext);
        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      } catch {
        // Si no existe en dist, intentar desde la raíz
        try {
          const rootPath = `.${pathname}`;
          const file = await Deno.readFile(rootPath);
          const contentType = getContentType(ext);
          return new Response(file, {
            headers: { "Content-Type": contentType },
          });
        } catch {
          // Si el archivo no existe, continuar para servir index.html
        }
      }
    }
  }

  // Para todas las demás rutas (incluyendo rutas de la SPA), servir index.html
  // Esto permite que React Router maneje el routing del lado del cliente
  // CRÍTICO: Siempre devolver index.html para rutas no estáticas
  // React Router se encargará de mostrar NotFound.tsx para rutas inválidas
  const possiblePaths = [
    "./dist/index.html", // Build de producción (Cloud Run)
    "./index.html", // Fallback directo
    "dist/index.html",
    "index.html",
  ];

  let indexHtml: string | null = null;
  for (const path of possiblePaths) {
    try {
      indexHtml = await Deno.readTextFile(path);
      break;
    } catch {
      // Continuar con el siguiente path
      continue;
    }
  }

  // Si encontramos index.html, servirlo
  // Esto permite que React Router maneje TODAS las rutas (válidas e inválidas)
  if (indexHtml) {
    return new Response(indexHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Si no se encuentra index.html, construir HTML mínimo que carga la app
  // Esto NUNCA debe pasar en producción, pero es un fallback crítico
  // para evitar mostrar "Not Found" como texto plano
  const fallbackHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vixis | Portfolio</title>
  <link rel="icon" type="image/svg+xml" href="https://cdn.vixis.dev/Foto+de+Perfil+2.webp" />
</head>
<body>
  <div id="root"></div>
  <noscript>Por favor, habilita JavaScript para ver este sitio.</noscript>
  <script type="module" crossorigin src="/assets/index.js"></script>
  <link rel="stylesheet" crossorigin href="/assets/index.css">
</body>
</html>`;

  return new Response(fallbackHtml, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
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
