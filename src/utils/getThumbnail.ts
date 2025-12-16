export async function getThumbnailFromUrl(url: string): Promise<string> {
  try {
    // Opción 1: Usar servicio de screenshot
    // Reemplaza 'YOUR_API_KEY' con tu API key
    const screenshotUrl = `https://api.screenshotapi.net/screenshot?url=${encodeURIComponent(
      url
    )}&width=800&height=600`;

    // Opción 2: Usar thumbnail.ws (gratis, sin API key)
    // const screenshotUrl = `https://thumbnail.ws/api/thumbnail/get?url=${encodeURIComponent(url)}&width=800`;

    return screenshotUrl;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    // Fallback: imagen por defecto
    return "https://tu-cdn.cloudfront.net/default-thumbnail.png";
  }
}

// Función alternativa: Extraer og:image de la URL
export async function getOgImageFromUrl(url: string): Promise<string> {
  try {
    // Nota: Esto requiere un backend proxy debido a CORS
    // Por ahora, usa un servicio que haga esto por ti
    const proxyUrl = `https://api.microlink.io/data?url=${encodeURIComponent(
      url
    )}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();

    return (
      data.image?.url ||
      data.logo?.url ||
      "https://tu-cdn.cloudfront.net/default-thumbnail.png"
    );
  } catch (error) {
    console.error("Error fetching og:image:", error);
    return "https://tu-cdn.cloudfront.net/default-thumbnail.png";
  }
}
