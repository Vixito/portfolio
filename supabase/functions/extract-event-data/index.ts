import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExtractedEventData {
  title: string;
  date: string | null;
  description: string | null;
  thumbnail_url: string | null;
  location: string | null;
  platform: string;
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      throw new Error("Se requiere una URL válida");
    }

    console.log(`Extrayendo datos del evento desde: ${url}`);

    // Detectar plataforma
    let platform = "unknown";
    if (url.includes("passline.com")) {
      platform = "passline";
    } else if (url.includes("start.gg")) {
      platform = "startgg";
    } else if (url.includes("smash.gg")) {
      platform = "startgg"; // start.gg era smash.gg antes
    } else if (url.includes("duel.plus")) {
      platform = "duelplus";
    }

    let eventData: ExtractedEventData | null = null;

    // Extraer datos según la plataforma
    switch (platform) {
      case "passline":
        eventData = await extractPasslineEvent(url);
        break;
      case "startgg":
        eventData = await extractStartGGEvent(url);
        break;
      case "duelplus":
        eventData = await extractDuelPlusEvent(url);
        break;
      default:
        // Intentar extracción genérica
        eventData = await extractGenericEvent(url);
        break;
    }

    if (!eventData) {
      throw new Error("No se pudieron extraer datos del evento");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: eventData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error al extraer datos del evento:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error al extraer datos del evento",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Extrae datos de un evento de Passline
 */
async function extractPasslineEvent(
  url: string
): Promise<ExtractedEventData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener página: ${response.statusText}`);
    }

    const html = await response.text();

    // Usar DOMParser para parsear HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extraer título
    const titleEl =
      doc.querySelector("h1") ||
      doc.querySelector('[class*="title"]') ||
      doc.querySelector("title");
    const title = titleEl?.textContent?.trim() || "";

    // Extraer fecha
    let date: string | null = null;
    const dateEl =
      doc.querySelector("time[datetime]") ||
      doc.querySelector('[class*="date"]') ||
      doc.querySelector('[class*="fecha"]');
    if (dateEl) {
      const datetime = dateEl.getAttribute("datetime");
      if (datetime) {
        date = datetime.split("T")[0]; // Solo la fecha, sin hora
      } else {
        const dateText = dateEl.textContent?.trim();
        if (dateText) {
          // Intentar parsear la fecha
          try {
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split("T")[0];
            }
          } catch (e) {
            console.warn("No se pudo parsear la fecha:", dateText);
          }
        }
      }
    }

    // Extraer descripción
    let description: string | null = null;
    const descEl =
      doc.querySelector('[class*="description"]') ||
      doc.querySelector('[class*="descripcion"]') ||
      doc.querySelector("meta[name='description']");
    if (descEl) {
      description =
        descEl.getAttribute("content") || descEl.textContent?.trim() || null;
      if (description && description.length > 500) {
        description = description.substring(0, 500) + "...";
      }
    }

    // Extraer thumbnail
    let thumbnail_url: string | null = null;
    const imgEl =
      doc.querySelector('meta[property="og:image"]') ||
      doc.querySelector('[class*="thumbnail"] img') ||
      doc.querySelector('[class*="image"] img') ||
      doc.querySelector("img");
    if (imgEl) {
      thumbnail_url =
        imgEl.getAttribute("content") ||
        imgEl.getAttribute("src") ||
        imgEl.getAttribute("data-src") ||
        null;
      if (thumbnail_url && !thumbnail_url.startsWith("http")) {
        const urlObj = new URL(url);
        thumbnail_url = `${urlObj.origin}${thumbnail_url}`;
      }
    }

    // Extraer ubicación
    let location: string | null = null;
    const locationEl =
      doc.querySelector('[class*="location"]') ||
      doc.querySelector('[class*="ubicacion"]') ||
      doc.querySelector('[class*="venue"]');
    if (locationEl) {
      location = locationEl.textContent?.trim() || null;
    }

    if (!title) {
      return null;
    }

    return {
      title,
      date,
      description,
      thumbnail_url,
      location,
      platform: "Passline",
    };
  } catch (error) {
    console.error("Error al extraer evento de Passline:", error);
    return null;
  }
}

/**
 * Extrae datos de un evento de start.gg
 */
async function extractStartGGEvent(
  url: string
): Promise<ExtractedEventData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener página: ${response.statusText}`);
    }

    const html = await response.text();

    // Usar DOMParser para parsear HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extraer título
    const titleEl =
      doc.querySelector("h1") ||
      doc.querySelector('[class*="event-name"]') ||
      doc.querySelector("title");
    const title = titleEl?.textContent?.trim() || "";

    // Extraer fecha
    let date: string | null = null;
    const dateEl =
      doc.querySelector("time[datetime]") ||
      doc.querySelector('[class*="date"]') ||
      doc.querySelector('[class*="start-date"]');
    if (dateEl) {
      const datetime = dateEl.getAttribute("datetime");
      if (datetime) {
        date = datetime.split("T")[0];
      } else {
        const dateText = dateEl.textContent?.trim();
        if (dateText) {
          try {
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split("T")[0];
            }
          } catch (e) {
            console.warn("No se pudo parsear la fecha:", dateText);
          }
        }
      }
    }

    // Extraer descripción
    let description: string | null = null;
    const descEl =
      doc.querySelector('[class*="description"]') ||
      doc.querySelector("meta[name='description']");
    if (descEl) {
      description =
        descEl.getAttribute("content") || descEl.textContent?.trim() || null;
      if (description && description.length > 500) {
        description = description.substring(0, 500) + "...";
      }
    }

    // Extraer thumbnail
    let thumbnail_url: string | null = null;
    const imgEl =
      doc.querySelector('meta[property="og:image"]') ||
      doc.querySelector('[class*="banner"] img') ||
      doc.querySelector("img");
    if (imgEl) {
      thumbnail_url =
        imgEl.getAttribute("content") ||
        imgEl.getAttribute("src") ||
        imgEl.getAttribute("data-src") ||
        null;
      if (thumbnail_url && !thumbnail_url.startsWith("http")) {
        const urlObj = new URL(url);
        thumbnail_url = `${urlObj.origin}${thumbnail_url}`;
      }
    }

    // Extraer ubicación
    let location: string | null = null;
    const locationEl =
      doc.querySelector('[class*="venue"]') ||
      doc.querySelector('[class*="location"]');
    if (locationEl) {
      location = locationEl.textContent?.trim() || null;
    }

    if (!title) {
      return null;
    }

    return {
      title,
      date,
      description,
      thumbnail_url,
      location,
      platform: "start.gg",
    };
  } catch (error) {
    console.error("Error al extraer evento de start.gg:", error);
    return null;
  }
}

/**
 * Extrae datos de un evento de duel.plus
 * Intenta usar API primero, luego scraping HTML como fallback
 */
async function extractDuelPlusEvent(
  url: string
): Promise<ExtractedEventData | null> {
  try {
    // Intentar extraer ID del evento desde la URL
    // Ejemplo: https://duel.plus/tournament/123 o https://duel.plus/event/abc
    const urlMatch = url.match(
      /duel\.plus\/(?:tournament|event|t)\/([^\/\?]+)/
    );
    const eventId = urlMatch ? urlMatch[1] : null;

    // Intentar usar API si tenemos un ID
    if (eventId) {
      try {
        // Intentar diferentes endpoints de API comunes
        const apiEndpoints = [
          `https://api.duel.plus/v1/tournaments/${eventId}`,
          `https://api.duel.plus/v1/events/${eventId}`,
          `https://duel.plus/api/tournaments/${eventId}`,
          `https://duel.plus/api/events/${eventId}`,
        ];

        for (const apiUrl of apiEndpoints) {
          try {
            const apiResponse = await fetch(apiUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "application/json",
              },
            });

            if (apiResponse.ok) {
              const apiData = await apiResponse.json();

              // Mapear datos de la API a nuestro formato
              const title =
                apiData.name || apiData.title || apiData.tournament?.name || "";
              const date =
                apiData.startDate || apiData.date || apiData.start_at || null;
              const description = apiData.description || apiData.bio || null;
              const thumbnail_url =
                apiData.image || apiData.thumbnail || apiData.banner || null;
              const location =
                apiData.location || apiData.venue || apiData.venueName || null;

              if (title) {
                return {
                  title,
                  date: date
                    ? new Date(date).toISOString().split("T")[0]
                    : null,
                  description:
                    description && description.length > 500
                      ? description.substring(0, 500) + "..."
                      : description,
                  thumbnail_url,
                  location,
                  platform: "duel.plus",
                };
              }
            }
          } catch (apiError) {
            // Continuar con el siguiente endpoint
            console.log(
              `API endpoint ${apiUrl} no disponible, intentando siguiente...`
            );
            continue;
          }
        }
      } catch (apiError) {
        console.log("No se pudo usar API, intentando scraping HTML...");
      }
    }

    // Fallback a scraping HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener página: ${response.statusText}`);
    }

    const html = await response.text();

    // Buscar JSON embebido (muchas plataformas modernas usan esto)
    const jsonMatches = html.matchAll(
      /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const match of jsonMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        // Buscar datos del evento en diferentes estructuras JSON comunes
        const eventData =
          jsonData.props?.pageProps?.tournament ||
          jsonData.props?.pageProps?.event ||
          jsonData.__NEXT_DATA__?.props?.pageProps?.tournament ||
          jsonData.__NEXT_DATA__?.props?.pageProps?.event ||
          jsonData.tournament ||
          jsonData.event;

        if (eventData) {
          const title = eventData.name || eventData.title || "";
          const date =
            eventData.startDate || eventData.date || eventData.start_at || null;
          const description = eventData.description || eventData.bio || null;
          const thumbnail_url =
            eventData.image || eventData.thumbnail || eventData.banner || null;
          const location =
            eventData.location ||
            eventData.venue ||
            eventData.venueName ||
            null;

          if (title) {
            return {
              title,
              date: date ? new Date(date).toISOString().split("T")[0] : null,
              description:
                description && description.length > 500
                  ? description.substring(0, 500) + "..."
                  : description,
              thumbnail_url,
              location,
              platform: "duel.plus",
            };
          }
        }
      } catch (e) {
        // Continuar con el siguiente script tag
        continue;
      }
    }

    // Si no encontramos JSON, usar DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extraer título
    const titleEl =
      doc.querySelector("h1") ||
      doc.querySelector('[class*="tournament-name"]') ||
      doc.querySelector('[class*="event-name"]') ||
      doc.querySelector('[class*="title"]') ||
      doc.querySelector("title");
    const title = titleEl?.textContent?.trim() || "";

    // Extraer fecha
    let date: string | null = null;
    const dateEl =
      doc.querySelector("time[datetime]") ||
      doc.querySelector('[class*="date"]') ||
      doc.querySelector('[class*="start-date"]') ||
      doc.querySelector('[class*="startDate"]');
    if (dateEl) {
      const datetime = dateEl.getAttribute("datetime");
      if (datetime) {
        date = datetime.split("T")[0];
      } else {
        const dateText = dateEl.textContent?.trim();
        if (dateText) {
          try {
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split("T")[0];
            }
          } catch (e) {
            console.warn("No se pudo parsear la fecha:", dateText);
          }
        }
      }
    }

    // Extraer descripción
    let description: string | null = null;
    const descEl =
      doc.querySelector('[class*="description"]') ||
      doc.querySelector('[class*="bio"]') ||
      doc.querySelector("meta[name='description']") ||
      doc.querySelector('meta[property="og:description"]');
    if (descEl) {
      description =
        descEl.getAttribute("content") || descEl.textContent?.trim() || null;
      if (description && description.length > 500) {
        description = description.substring(0, 500) + "...";
      }
    }

    // Extraer thumbnail
    let thumbnail_url: string | null = null;
    const imgEl =
      doc.querySelector('meta[property="og:image"]') ||
      doc.querySelector('[class*="banner"] img') ||
      doc.querySelector('[class*="thumbnail"] img') ||
      doc.querySelector('[class*="tournament-image"] img') ||
      doc.querySelector("img");
    if (imgEl) {
      thumbnail_url =
        imgEl.getAttribute("content") ||
        imgEl.getAttribute("src") ||
        imgEl.getAttribute("data-src") ||
        null;
      if (thumbnail_url && !thumbnail_url.startsWith("http")) {
        const urlObj = new URL(url);
        thumbnail_url = `${urlObj.origin}${thumbnail_url}`;
      }
    }

    // Extraer ubicación
    let location: string | null = null;
    const locationEl =
      doc.querySelector('[class*="venue"]') ||
      doc.querySelector('[class*="location"]') ||
      doc.querySelector('[class*="venueName"]');
    if (locationEl) {
      location = locationEl.textContent?.trim() || null;
    }

    if (!title) {
      return null;
    }

    return {
      title,
      date,
      description,
      thumbnail_url,
      location,
      platform: "duel.plus",
    };
  } catch (error) {
    console.error("Error al extraer evento de duel.plus:", error);
    return null;
  }
}

/**
 * Extracción genérica para otras plataformas
 */
async function extractGenericEvent(
  url: string
): Promise<ExtractedEventData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener página: ${response.statusText}`);
    }

    const html = await response.text();

    // Usar DOMParser para parsear HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extraer título desde meta tags o título de la página
    let title = "";
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      title = ogTitle.getAttribute("content") || "";
    } else {
      const titleEl = doc.querySelector("h1") || doc.querySelector("title");
      title = titleEl?.textContent?.trim() || "";
    }

    // Extraer fecha
    let date: string | null = null;
    const dateEl = doc.querySelector("time[datetime]");
    if (dateEl) {
      const datetime = dateEl.getAttribute("datetime");
      if (datetime) {
        date = datetime.split("T")[0];
      }
    }

    // Extraer descripción
    let description: string | null = null;
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (ogDesc) {
      description = ogDesc.getAttribute("content") || null;
    } else if (metaDesc) {
      description = metaDesc.getAttribute("content") || null;
    }
    if (description && description.length > 500) {
      description = description.substring(0, 500) + "...";
    }

    // Extraer thumbnail
    let thumbnail_url: string | null = null;
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      thumbnail_url = ogImage.getAttribute("content") || null;
    }

    if (!title) {
      return null;
    }

    // Detectar plataforma desde la URL
    const urlObj = new URL(url);
    const platform = urlObj.hostname.replace("www.", "");

    return {
      title,
      date,
      description,
      thumbnail_url,
      location: null,
      platform,
    };
  } catch (error) {
    console.error("Error al extraer evento genérico:", error);
    return null;
  }
}
