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
  // Si index.html no existe, intentar servirlo de todas formas para que React Router maneje el 404
  try {
    const indexHtml = await Deno.readTextFile("./dist/index.html");
    return new Response(indexHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    // Si no se puede leer index.html, intentar leerlo desde dist/ directamente
    // Si tampoco existe, devolver 404 pero con Content-Type text/html
    // para que el navegador intente renderizarlo y React Router pueda manejar el 404
    console.error("Error reading index.html:", error);
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }
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
