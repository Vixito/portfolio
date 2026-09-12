import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

// Lectura pública de una factura por su UUID (página "Pay Invoice").
// El UUID es el gate de acceso (se comparte por email); la service role
// key se usa aquí server-side y nunca sale del servidor.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let id = url.searchParams.get("id") || "";
  if (!id) {
    try {
      id = (await req.json())?.id || "";
    } catch {
      // sin body, no hacer nada
    }
  }

  if (!id) {
    return json(400, { error: "id es requerido" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        products (id, title, description, full_description)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return json(404, { error: "Factura no encontrada" });
      }
      return json(500, { error: error.message });
    }
    return json(200, data);
  } catch (error) {
    console.error("Error en get-invoice:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});