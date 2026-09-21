import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  reconcileGumroadSale,
  getCheckoutInvoiceByCustomField,
} from "../_shared/checkout.ts";
import { getGumroadEnv, gumroadGetSale, safeEqual } from "../_shared/gumroad.ts";

/**
 * Gumroad Ping (https://gumroad.com/ping): POST x-www-form-urlencoded,
 * SIN firma. Seguridad: ?key=GUMROAD_PING_SECRET en la URL del ping
 * (Settings → Advanced → Ping). At-least-once: deduplicar por sale_id.
 * El ping es solo un trigger: la venta se re-lee por API antes de conciliar.
 * Responder 2xx rápido (timeout de 5s en Gumroad).
 */
async function parsePingBody(req: Request): Promise<Record<string, string>> {
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("form-urlencoded") || ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  const text = await req.text();
  try {
    const json = JSON.parse(text);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(json)) {
      if (v !== null && v !== undefined) out[k] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }
  if (req.method !== "POST") {
    return jsonCheckoutResponse(405, { error: "Método no permitido" });
  }

  try {
    const { pingSecret } = getGumroadEnv();
    if (!pingSecret) {
      console.error("GUMROAD_PING_SECRET no configurado");
      return jsonCheckoutResponse(500, { error: "Ping secret no configurado" });
    }
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    if (!safeEqual(key, pingSecret)) {
      return jsonCheckoutResponse(401, { error: "No autorizado" });
    }

    const ping = await parsePingBody(req);
    const saleId = String(ping.sale_id || "");
    const resource = String(ping.resource_name || "sale");
    const isTest = String(ping.test || "").toLowerCase() === "true";

    if (isTest) {
      // Pings de prueba ("Send test ping"): ack sin conciliar.
      return jsonCheckoutResponse(200, { ok: true, test: true });
    }
    if (!saleId) {
      return jsonCheckoutResponse(400, { error: "sale_id es requerido" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (resource !== "sale") {
      // refund/dispute/etc: comparten sale_id. Se anotan, no se deshace la entrega
      // (mismo criterio que nowpayments con refunded).
      const invoice = await getCheckoutInvoiceByCustomField(
        supabase,
        "gumroad_sale_id",
        saleId
      );
      if (invoice) {
        const cf = { ...(invoice.custom_fields || {}) };
        cf[`gumroad_${resource}`] = true;
        cf.gumroad_last_event_at = new Date().toISOString();
        await supabase
          .from("invoices")
          .update({ custom_fields: cf, updated_at: new Date().toISOString() })
          .eq("id", invoice.id);
      }
      return jsonCheckoutResponse(200, {
        ok: true,
        recorded: resource,
        invoice_id: invoice?.id || null,
      });
    }

    const sale = await gumroadGetSale(saleId);
    if (!sale) {
      return jsonCheckoutResponse(404, { error: "Venta no encontrada en Gumroad" });
    }
    const result = await reconcileGumroadSale(supabase, sale);
    return jsonCheckoutResponse(200, result);
  } catch (err) {
    console.error("gumroad-webhook error:", err);
    return jsonCheckoutResponse(500, {
      error: err instanceof Error ? err.message : "Error interno inesperado",
    });
  }
});
