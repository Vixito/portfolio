import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  getCheckoutInvoiceWithProduct,
  buildDeliveryPayload,
} from "../_shared/checkout.ts";

// Devuelve el estado de una factura de checkout y, SOLO si está pagada,
// la información de entrega (links de acceso, mensajes).
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice_id");

    if (!invoiceId) {
      return jsonCheckoutResponse(400, { error: "invoice_id es requerido" });
    }

    const invoice = await getCheckoutInvoiceWithProduct(supabase, invoiceId);
    if (!invoice) {
      return jsonCheckoutResponse(404, { error: "Factura no encontrada" });
    }

    return jsonCheckoutResponse(200, buildDeliveryPayload(invoice));
  } catch (error) {
    console.error("Error en get-checkout-invoice:", error);
    return jsonCheckoutResponse(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});