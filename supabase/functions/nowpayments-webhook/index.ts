import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  getCheckoutInvoiceWithProduct,
  deliverCheckoutOrder,
} from "../_shared/checkout.ts";

// Verifica la firma HMAC-SHA512 que NowPayments envía en x-nowpayments-sig.
// Método documentado por NowPayments: JSON.stringify(payload, Object.keys(payload).sort())
async function verifyNowPaymentsSignature(
  secret: string,
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );

  const hashArray = Array.from(new Uint8Array(signed));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hex === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");

    // Leer el body crudo para verificar la firma
    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonCheckoutResponse(400, { error: "Body inválido" });
    }

    if (payload.payment_status === "refunded") {
      return jsonCheckoutResponse(200, { ok: true });
    }

    if (!ipnSecret) {
      // Sin secret configurado, no arriesgar: rechazar
      console.error("NOWPAYMENTS_IPN_SECRET no está configurado");
      return jsonCheckoutResponse(500, {
        error: "IPN secret no configurado",
      });
    }

    const signature = req.headers.get("x-nowpayments-sig");
    const valid = await verifyNowPaymentsSignature(
      ipnSecret,
      rawBody,
      signature
    );

    if (!valid) {
      console.error("Firma de NowPayments inválida");
      return jsonCheckoutResponse(401, { error: "Firma inválida" });
    }

    // Buscar la factura local: primero por order_id, luego por np_invoice_id
    const { order_id, payment_id, payment_status, price_amount } = payload;

    let invoice: any = null;

    if (order_id) {
      invoice = await getCheckoutInvoiceWithProduct(supabase, order_id);
    }

    if (!invoice && payload.invoice_id != null) {
      const { data: byNpInvoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("custom_fields->>np_invoice_id", String(payload.invoice_id))
        .maybeSingle();
      invoice = byNpInvoice;
      if (invoice) {
        invoice = await getCheckoutInvoiceWithProduct(supabase, invoice.id);
      }
    }

    if (!invoice) {
      return jsonCheckoutResponse(404, {
        error: "Factura no encontrada",
        order_id: order_id || null,
      });
    }

    // Solo pagos finalizados cuentan como entrega
    if (payment_status !== "finished") {
      return jsonCheckoutResponse(200, {
        ok: true,
        message: `Payment status ${payment_status} - no entregable`,
      });
    }

    const transactionId =
      String(payload.payment_id || payment_id || "");

    const delivery = await deliverCheckoutOrder(supabase, {
      invoice,
      gateway: "nowpayments",
      transactionId: transactionId || `NP-${invoice.id}`,
    });

    return jsonCheckoutResponse(200, {
      ok: true,
      ...(delivery as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Error en nowpayments-webhook:", error);
    return jsonCheckoutResponse(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});