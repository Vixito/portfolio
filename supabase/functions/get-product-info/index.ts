import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parsear request body
    const { product_id, public_id, product_name } = await req.json();

    let query = supabase
      .from("products")
      .select(`
        *,
        product_pricing (*)
      `)
      .eq("is_active", true);

    // Buscar por public_id (preferido), product_id, o nombre
    if (public_id) {
      query = query.eq("public_id", public_id);
    } else if (product_id) {
      query = query.eq("id", product_id);
    } else if (product_name) {
      query = query.ilike("title", `%${product_name}%`);
    } else {
      return new Response(
        JSON.stringify({ error: "Se requiere public_id, product_id o product_name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: products, error } = await query.limit(1);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "Producto no encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const product = products[0];

    // Formatear respuesta para el bot
    const response = {
      id: product.id,
      public_id: product.public_id,
      title: product.title,
      title_translations: product.title_translations,
      description: product.description,
      description_translations: product.description_translations,
      full_description: product.full_description,
      full_description_translations: product.full_description_translations,
      base_price_usd: product.base_price_usd,
      base_price_cop: product.base_price_cop,
      sector: product.sector,
      thumbnail_url: product.thumbnail_url,
      // Pricing actual
      pricing: product.product_pricing && product.product_pricing.length > 0
        ? {
            current_price_usd: product.product_pricing[0].current_price_usd,
            current_price_cop: product.product_pricing[0].current_price_cop,
            is_on_sale: product.product_pricing[0].is_on_sale,
            sale_percentage: product.product_pricing[0].sale_percentage,
            sale_price_usd: product.product_pricing[0].sale_price_usd,
            sale_price_cop: product.product_pricing[0].sale_price_cop,
          }
        : null,
      // URL del producto
      store_url: `https://vixis.dev/store?product=${product.public_id}`,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en get-product-info:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
