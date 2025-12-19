import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasslineEvent {
  title: string;
  date: string;
  description: string | null;
  passline_url: string;
  thumbnail_url: string | null;
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // URL de passline.com - puede ser una URL específica de perfil o eventos
    const passlineUrl =
      Deno.env.get("PASSLINE_URL") ||
      Deno.env.get("PASSLINE_PROFILE_URL") ||
      "https://passline.com";

    console.log(`Scraping eventos desde: ${passlineUrl}`);

    // Hacer scraping de passline.com
    const response = await fetch(passlineUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener página: ${response.statusText}`);
    }

    const html = await response.text();
    const events: PasslineEvent[] = [];

    // Método 1: Buscar JSON embebido (muchos sitios modernos usan esto)
    const jsonMatches = html.matchAll(
      /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const match of jsonMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        // Buscar eventos en diferentes estructuras JSON comunes
        const foundEvents = extractEventsFromJSON(jsonData);
        if (foundEvents.length > 0) {
          events.push(...foundEvents);
          break; // Si encontramos eventos en JSON, usamos esos
        }
      } catch (e) {
        // Continuar con el siguiente script tag
        continue;
      }
    }

    // Método 2: Si no encontramos eventos en JSON, usar DOMParser
    if (events.length === 0) {
      try {
        // Usar DOMParser para parsear HTML de forma más robusta
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Buscar eventos en diferentes estructuras HTML comunes
        // Intentar múltiples selectores comunes
        const eventSelectors = [
          'article[class*="event"]',
          'div[class*="event"]',
          'div[class*="card"]',
          'a[href*="/event"]',
          'a[href*="/e/"]',
        ];

        for (const selector of eventSelectors) {
          const elements = doc.querySelectorAll(selector);
          if (elements.length > 0) {
            for (const element of elements) {
              const event = extractEventFromElement(element, passlineUrl);
              if (event && event.title && event.passline_url) {
                // Evitar duplicados
                if (
                  !events.some((e) => e.passline_url === event.passline_url)
                ) {
                  events.push(event);
                }
              }
            }
            if (events.length > 0) break; // Si encontramos eventos, no buscar más
          }
        }
      } catch (e) {
        console.error("Error al parsear HTML con DOMParser:", e);
      }
    }

    // Método 3: Fallback a regex si DOMParser no funciona
    if (events.length === 0) {
      console.log("Usando método regex como fallback");
      const eventPattern =
        /<a[^>]*href="([^"]*\/event[^"]*|\/[^"]*\/e\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      const matches = html.matchAll(eventPattern);

      for (const match of matches) {
        const href = match[1];
        const content = match[2];

        // Extraer título
        const titleMatch =
          content.match(/<h[123][^>]*>([^<]+)<\/h[123]>/i) ||
          content.match(
            /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i
          );
        const title = titleMatch ? titleMatch[1].trim() : "";

        // Extraer fecha
        const dateMatch =
          content.match(/<time[^>]*datetime="([^"]+)"/i) ||
          content.match(
            /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i
          ) ||
          content.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1].trim() : "";

        // Extraer descripción
        const descMatch = content.match(/<p[^>]*>([^<]+)<\/p>/i);
        const description = descMatch ? descMatch[1].trim() : null;

        // Extraer thumbnail
        const imgMatch = content.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
        const thumbnail_url = imgMatch
          ? imgMatch[1].startsWith("http")
            ? imgMatch[1]
            : `${passlineUrl}${imgMatch[1]}`
          : null;

        const passline_url = href.startsWith("http")
          ? href
          : `${passlineUrl}${href}`;

        if (title && passline_url) {
          events.push({
            title,
            date: date
              ? parseDate(date)
              : new Date().toISOString().split("T")[0],
            description,
            passline_url,
            thumbnail_url,
          });
        }
      }
    }

    // Sincronizar eventos con Supabase
    const syncedEvents = [];
    for (const event of events) {
      // Verificar si el evento ya existe (por passline_url)
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("passline_url", event.passline_url)
        .single();

      if (existing) {
        // Actualizar evento existente
        const { data, error } = await supabase
          .from("events")
          .update({
            title: event.title,
            date: event.date,
            description: event.description,
            thumbnail_url: event.thumbnail_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error(`Error al actualizar evento ${existing.id}:`, error);
        } else {
          syncedEvents.push(data);
        }
      } else {
        // Insertar nuevo evento
        const { data, error } = await supabase
          .from("events")
          .insert({
            title: event.title,
            date: event.date,
            description: event.description,
            passline_url: event.passline_url,
            thumbnail_url: event.thumbnail_url,
          })
          .select()
          .single();

        if (error) {
          console.error(`Error al insertar evento:`, error);
        } else {
          syncedEvents.push(data);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsFound: events.length,
        eventsSynced: syncedEvents.length,
        events: syncedEvents,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Error al sincronizar eventos",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Extrae eventos de un objeto JSON (busca en diferentes estructuras comunes)
 */
function extractEventsFromJSON(jsonData: any): PasslineEvent[] {
  const events: PasslineEvent[] = [];

  // Buscar en diferentes estructuras JSON comunes
  const searchPaths = [
    jsonData.events,
    jsonData.data?.events,
    jsonData.props?.pageProps?.events,
    jsonData.__NEXT_DATA__?.props?.pageProps?.events,
    Array.isArray(jsonData) ? jsonData : null,
  ];

  for (const data of searchPaths) {
    if (Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        if (
          item &&
          (item.title || item.name) &&
          (item.url || item.link || item.href)
        ) {
          events.push({
            title: item.title || item.name || "",
            date:
              item.date ||
              item.startDate ||
              item.datetime ||
              new Date().toISOString().split("T")[0],
            description:
              item.description || item.excerpt || item.summary || null,
            passline_url: item.url || item.link || item.href || "",
            thumbnail_url:
              item.thumbnail ||
              item.image ||
              item.coverImage ||
              item.thumbnailUrl ||
              null,
          });
        }
      }
      if (events.length > 0) break;
    }
  }

  return events;
}

/**
 * Extrae información de evento de un elemento HTML
 */
function extractEventFromElement(
  element: Element,
  baseUrl: string
): PasslineEvent | null {
  try {
    // Buscar título
    const titleEl =
      element.querySelector(
        "h1, h2, h3, h4, [class*='title'], [class*='name']"
      ) || element;
    const title = titleEl?.textContent?.trim() || "";

    // Buscar link
    const linkEl = element.closest("a") || element.querySelector("a");
    const href = linkEl?.getAttribute("href") || "";
    const passline_url = href
      ? href.startsWith("http")
        ? href
        : `${baseUrl}${href}`
      : "";

    if (!title || !passline_url) return null;

    // Buscar fecha
    const dateEl =
      element.querySelector("time, [class*='date'], [datetime]") || element;
    const datetime = dateEl?.getAttribute("datetime") || "";
    const dateText = dateEl?.textContent?.trim() || datetime;
    const date = dateText
      ? parseDate(dateText)
      : new Date().toISOString().split("T")[0];

    // Buscar descripción
    const descEl = element.querySelector(
      "p, [class*='description'], [class*='excerpt'], [class*='summary']"
    );
    const description = descEl?.textContent?.trim() || null;

    // Buscar thumbnail
    const imgEl = element.querySelector("img");
    const imgSrc =
      imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "";
    const thumbnail_url = imgSrc
      ? imgSrc.startsWith("http")
        ? imgSrc
        : `${baseUrl}${imgSrc}`
      : null;

    return {
      title,
      date,
      description,
      passline_url,
      thumbnail_url,
    };
  } catch (e) {
    console.error("Error al extraer evento del elemento:", e);
    return null;
  }
}

/**
 * Parsea una fecha en varios formatos comunes
 */
function parseDate(dateString: string): string {
  if (!dateString) {
    return new Date().toISOString().split("T")[0];
  }

  // Intentar parsear diferentes formatos
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (format === formats[0] || format === formats[3]) {
        // YYYY-MM-DD o YYYY/MM/DD
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (format === formats[1]) {
        // DD/MM/YYYY -> YYYY-MM-DD
        return `${match[3]}-${match[2]}-${match[1]}`;
      } else if (format === formats[2]) {
        // DD-MM-YYYY -> YYYY-MM-DD
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  // Si no se puede parsear, intentar con Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch (e) {
    console.error("Error al parsear fecha:", e);
  }

  // Si todo falla, retornar fecha actual
  return new Date().toISOString().split("T")[0];
}
