import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date: string;
}

// Rate limiting simple en memoria (para producción usar Redis o similar)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRequestIdentifier(req: Request): string {
  // Intentar obtener IP real desde headers
  const realIp =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip");

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function checkRateLimit(
  identifier: string,
  options: { maxRequests: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    // Nueva ventana o expirada
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (record.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Rate limiting: 60 requests por minuto por IP
    const identifier = getRequestIdentifier(req);
    const rateLimit = checkRateLimit(identifier, {
      maxRequests: 60,
      windowMs: 60 * 1000, // 1 minuto
    });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Demasiadas solicitudes. Por favor, intenta más tarde.",
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(
              (rateLimit.resetAt - Date.now()) / 1000
            ).toString(),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }

    // Obtener API key de exchangerate-api.com desde Doppler
    const exchangeRateApiKey = Deno.env.get("EXCHANGERATE_API_KEY");
    if (!exchangeRateApiKey) {
      throw new Error("EXCHANGERATE_API_KEY no configurada");
    }

    // Obtener parámetros del body o query string
    let baseCurrency = "USD";
    let targetCurrency = "COP";

    // Intentar obtener del body primero (para POST requests desde supabase.functions.invoke)
    if (req.method === "POST") {
      try {
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await req.json();
          if (body && typeof body === "object") {
            baseCurrency = body.base || baseCurrency;
            targetCurrency = body.target || targetCurrency;
          }
        }
      } catch (error) {
        // Si falla al leer el body, continuar con query string
        console.log("Error al leer body:", error);
      }
    }

    // Si no se obtuvieron del body, intentar desde query string
    const url = new URL(req.url);
    const queryBase = url.searchParams.get("base");
    const queryTarget = url.searchParams.get("target");
    if (queryBase) baseCurrency = queryBase;
    if (queryTarget) targetCurrency = queryTarget;

    // Obtener tipo de cambio en tiempo real
    const exchangeUrl = `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${baseCurrency}`;

    let exchangeResponse: Response;
    try {
      exchangeResponse = await fetch(exchangeUrl);
    } catch (fetchError) {
      console.error("Error al hacer fetch a exchangerate-api.com:", fetchError);
      throw new Error(
        `Error de conexión al obtener tipo de cambio: ${fetchError.message}`
      );
    }

    if (!exchangeResponse.ok) {
      const errorText = await exchangeResponse.text();
      console.error(
        `Error de exchangerate-api.com: ${exchangeResponse.status} ${exchangeResponse.statusText}`,
        errorText
      );
      throw new Error(
        `Error al obtener tipo de cambio (${exchangeResponse.status}): ${exchangeResponse.statusText}`
      );
    }

    let exchangeData: ExchangeRateResponse;
    try {
      exchangeData = await exchangeResponse.json();
    } catch (parseError) {
      console.error(
        "Error al parsear respuesta de exchangerate-api.com:",
        parseError
      );
      throw new Error(
        "Error al procesar respuesta de la API de tipos de cambio"
      );
    }

    if (!exchangeData.rates || typeof exchangeData.rates !== "object") {
      console.error(
        "Respuesta inválida de exchangerate-api.com:",
        exchangeData
      );
      throw new Error("Respuesta inválida de la API de tipos de cambio");
    }

    const exchangeRate = exchangeData.rates[targetCurrency];

    if (!exchangeRate || typeof exchangeRate !== "number") {
      return new Response(
        JSON.stringify({
          error: `Moneda ${targetCurrency} no soportada o no disponible`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retornar respuesta
    return new Response(
      JSON.stringify({
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        exchange_rate: exchangeRate,
        date: exchangeData.date,
        calculated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error("Error en get-exchange-rate:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
