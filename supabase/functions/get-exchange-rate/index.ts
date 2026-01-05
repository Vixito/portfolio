import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc?: string;
  time_next_update_utc?: string;
}

// Rate limiting simple (autocontenido)
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

function getRequestIdentifier(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
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
        `Error de conexión al obtener tipo de cambio: ${
          fetchError instanceof Error ? fetchError.message : "Error desconocido"
        }`
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

    // Verificar que la respuesta sea exitosa
    if (exchangeData.result !== "success") {
      console.error(
        "Respuesta no exitosa de exchangerate-api.com:",
        exchangeData
      );
      throw new Error(
        "La API de tipos de cambio no devolvió una respuesta exitosa"
      );
    }

    // Verificar que exista conversion_rates
    if (
      !exchangeData.conversion_rates ||
      typeof exchangeData.conversion_rates !== "object"
    ) {
      console.error(
        "Respuesta inválida de exchangerate-api.com:",
        exchangeData
      );
      throw new Error(
        "Respuesta inválida de la API de tipos de cambio: falta conversion_rates"
      );
    }

    const exchangeRate = exchangeData.conversion_rates[targetCurrency];

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
        base_currency: exchangeData.base_code || baseCurrency,
        target_currency: targetCurrency,
        exchange_rate: exchangeRate,
        last_update: exchangeData.time_last_update_utc || null,
        next_update: exchangeData.time_next_update_utc || null,
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
