import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRequestIdentifier } from "../_shared/rate-limit.ts";
import {
  calculatePricingSchema,
  validateRequest,
} from "../_shared/validation.ts";

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting: 20 requests por minuto por IP
    const identifier = getRequestIdentifier(req);
    const rateLimit = checkRateLimit(identifier, {
      maxRequests: 20,
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
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }

    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener API key de exchangerate-api.com desde Doppler
    const exchangeRateApiKey = Deno.env.get("EXCHANGERATE_API_KEY");
    if (!exchangeRateApiKey) {
      throw new Error("EXCHANGERATE_API_KEY no configurada");
    }

    // Parsear y validar request body
    const body = await req.json();
    const validation = validateRequest(calculatePricingSchema, body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      });
    }

    const { product_id, base_currency, target_currency, region, quantity } =
      validation.data;

    // 1. Obtener producto de la base de datos
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("base_price_usd, title")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: "Producto no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Obtener tipo de cambio en tiempo real
    const exchangeUrl = `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${base_currency}`;
    const exchangeResponse = await fetch(exchangeUrl);

    if (!exchangeResponse.ok) {
      throw new Error(
        `Error al obtener tipo de cambio: ${exchangeResponse.statusText}`
      );
    }

    const exchangeData: ExchangeRateResponse = await exchangeResponse.json();
    const exchangeRate = exchangeData.rates[target_currency];

    if (!exchangeRate) {
      return new Response(
        JSON.stringify({ error: `Moneda ${target_currency} no soportada` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Calcular precio base (con ajustes por región si aplica)
    let adjustedBasePrice = Number(product.base_price_usd);

    // Ajustes por región (ejemplo: Colombia vs USA)
    if (region) {
      // Lógica de ajuste: puedes expandir esto según tus necesidades
      if (
        region.toLowerCase().includes("colombia") ||
        region.toLowerCase().includes("co")
      ) {
        // Precio base para Colombia
        adjustedBasePrice = adjustedBasePrice * 1.0; // Sin ajuste adicional
      } else if (
        region.toLowerCase().includes("usa") ||
        region.toLowerCase().includes("united states")
      ) {
        // Precio base para USA (más alto)
        adjustedBasePrice = adjustedBasePrice * 1.5;
      }
      // Puedes agregar más regiones aquí
    }

    // 4. Calcular precio final
    const finalPrice = adjustedBasePrice * exchangeRate * quantity;

    // 5. Retornar respuesta
    return new Response(
      JSON.stringify({
        product_id,
        product_title: product.title,
        base_price_usd: product.base_price_usd,
        adjusted_base_price: adjustedBasePrice,
        exchange_rate: exchangeRate,
        target_currency,
        quantity,
        final_price: Math.round(finalPrice * 100) / 100, // Redondear a 2 decimales
        region: region || "default",
        calculated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
