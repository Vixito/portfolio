import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BlogPost {
  id: string;
  title: string;
  thumbnail: string;
  excerpt: string;
  url: string;
  platform: string;
  date: string;
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { platform = "all", username } = body;

    let posts: BlogPost[] = [];

    if (platform === "medium") {
      const mediumUsername = username || Deno.env.get("MEDIUM_USERNAME");
      if (!mediumUsername) {
        throw new Error("Se requiere username para Medium");
      }
      posts = await fetchMediumPosts(mediumUsername);
    } else if (platform === "devto") {
      const devtoUsername = username || Deno.env.get("DEVTO_USERNAME");
      if (!devtoUsername) {
        throw new Error("Se requiere username para Dev.to");
      }
      posts = await fetchDevToPosts(devtoUsername);
    } else if (platform === "all") {
      // Obtener posts de todas las plataformas
      const mediumUsername = Deno.env.get("MEDIUM_USERNAME") || username;
      const devtoUsername = Deno.env.get("DEVTO_USERNAME") || username;

      const promises: Promise<BlogPost[]>[] = [];

      if (mediumUsername) {
        promises.push(fetchMediumPosts(mediumUsername));
      }

      if (devtoUsername) {
        promises.push(fetchDevToPosts(devtoUsername));
      }

      const results = await Promise.allSettled(promises);
      const allPosts: BlogPost[] = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          allPosts.push(...result.value);
        } else {
          console.error("Error al obtener posts:", result.reason);
        }
      }

      // Ordenar por fecha (más recientes primero)
      posts = allPosts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } else {
      throw new Error(`Plataforma no soportada: ${platform}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        posts,
        count: posts.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en fetch-blog-posts:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error al obtener posts",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Obtiene posts de Medium usando RSS
 */
async function fetchMediumPosts(username: string): Promise<BlogPost[]> {
  try {
    // Limpiar username (remover @ si existe)
    const cleanUsername = username.replace(/^@/, "");
    const rssUrl = `https://medium.com/feed/@${cleanUsername}`;

    console.log(`Obteniendo posts de Medium para: ${cleanUsername}`);

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener RSS de Medium: ${response.statusText}`);
    }

    const xml = await response.text();
    const posts: BlogPost[] = [];

    // Parsear RSS XML
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

    for (const match of itemMatches) {
      const itemXml = match[1];

      // Extraer título
      const titleMatch =
        itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
        itemXml.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch
        ? titleMatch[1]
            .trim()
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
        : "";

      // Extraer link (Medium puede tener múltiples formatos)
      const linkMatch =
        itemXml.match(/<link>(.*?)<\/link>/i) ||
        itemXml.match(/<guid[^>]*>(.*?)<\/guid>/i);
      let url = linkMatch ? linkMatch[1].trim() : "";

      // Limpiar URL de Medium (remover parámetros de tracking)
      if (url.includes("?")) {
        url = url.split("?")[0];
      }

      // Extraer descripción/excerpt
      const descMatch =
        itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) ||
        itemXml.match(/<description>(.*?)<\/description>/i);
      let description = descMatch ? descMatch[1].trim() : "";

      // Limpiar HTML de la descripción
      description = description
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();

      const excerpt =
        description.length > 200
          ? description.substring(0, 200).trim() + "..."
          : description || "Sin descripción disponible";

      // Extraer fecha
      const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
      const pubDate = dateMatch
        ? dateMatch[1].trim()
        : new Date().toISOString();
      let date: string;
      try {
        date = new Date(pubDate).toISOString().split("T")[0];
      } catch {
        date = new Date().toISOString().split("T")[0];
      }

      // Extraer thumbnail - múltiples métodos
      let thumbnail = "";

      // Método 1: Buscar en content:encoded
      const contentMatch = itemXml.match(
        /<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/i
      );
      if (contentMatch) {
        const imgMatch = contentMatch[1].match(
          /<img[^>]*src=["']([^"']+)["'][^>]*>/i
        );
        if (imgMatch) {
          thumbnail = imgMatch[1];
        }
      }

      // Método 2: Buscar en media:content o media:thumbnail
      if (!thumbnail) {
        const mediaMatch =
          itemXml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i) ||
          itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i);
        if (mediaMatch) {
          thumbnail = mediaMatch[1];
        }
      }

      // Método 3: Buscar cualquier imagen en el contenido
      if (!thumbnail) {
        const anyImgMatch = itemXml.match(
          /<img[^>]*src=["']([^"']+)["'][^>]*>/i
        );
        if (anyImgMatch) {
          thumbnail = anyImgMatch[1];
        }
      }

      // Fallback: usar imagen placeholder de Medium
      if (!thumbnail) {
        thumbnail = `https://miro.medium.com/max/1200/1*placeholder.png`;
      }

      // Limpiar URL de thumbnail (remover parámetros de tamaño si es necesario)
      if (thumbnail.includes("?q=")) {
        thumbnail = thumbnail.split("?q=")[0];
      }

      if (title && url) {
        // Generar ID único basado en la URL
        const urlParts = url.split("/");
        const slug =
          urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || "";
        const id = `medium-${slug || Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;

        posts.push({
          id,
          title,
          thumbnail,
          excerpt,
          url,
          platform: "Medium",
          date,
        });
      }
    }

    console.log(`Encontrados ${posts.length} posts de Medium`);
    return posts;
  } catch (error) {
    console.error("Error al obtener posts de Medium:", error);
    return [];
  }
}

/**
 * Obtiene posts de Dev.to usando su API
 */
async function fetchDevToPosts(username: string): Promise<BlogPost[]> {
  try {
    // Limpiar username
    const cleanUsername = username.replace(/^@/, "");
    const apiUrl = `https://dev.to/api/articles?username=${cleanUsername}&per_page=30`;

    console.log(`Obteniendo posts de Dev.to para: ${cleanUsername}`);

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error al obtener posts de Dev.to: ${response.statusText}`
      );
    }

    const articles = await response.json();

    if (!Array.isArray(articles)) {
      console.warn("Dev.to API no devolvió un array:", articles);
      return [];
    }

    const posts: BlogPost[] = articles
      .filter((article: any) => article && article.title && article.url)
      .map((article: any) => {
        // Limpiar excerpt
        let excerpt = article.description || article.excerpt || "";
        if (excerpt.length > 200) {
          excerpt = excerpt.substring(0, 200).trim() + "...";
        }

        // Obtener thumbnail
        const thumbnail =
          article.cover_image ||
          article.social_image ||
          article.main_image ||
          `https://via.placeholder.com/400x300?text=Dev.to`;

        // Parsear fecha
        let date: string;
        try {
          date = article.published_at
            ? new Date(article.published_at).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
        } catch {
          date = new Date().toISOString().split("T")[0];
        }

        return {
          id: `devto-${article.id}`,
          title: article.title,
          thumbnail,
          excerpt,
          url: article.url.startsWith("http")
            ? article.url
            : `https://dev.to${article.url}`,
          platform: "Dev.to",
          date,
        };
      });

    console.log(`Encontrados ${posts.length} posts de Dev.to`);
    return posts;
  } catch (error) {
    console.error("Error al obtener posts de Dev.to:", error);
    return [];
  }
}
