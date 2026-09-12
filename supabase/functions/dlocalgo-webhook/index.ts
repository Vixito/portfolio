import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  getCheckoutInvoiceWithProduct,
  deliverCheckoutOrder,
  getCheckoutInvoiceByCustomField,
  getDLocalGoEnv,
  getDLocalGoPaymentStatus,
  buildDLocalGoPaymentMeta,
} from "../_shared/checkout.ts";

/**
 * dLocal Go webhook: el cuerpo es { "payment_id": "[Payment Id]" }.
 * Firma: Authorization "V2-HMAC-SHA256, Signature: <hex>".
 * message = API_KEY + rawBody, secret = SECRET_KEY (sin fecha).
 */
async function verifySignature(
  apiKey: string | undefined,
  secretKey: string | undefined,
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  if (!apiKey || !secretKey || !signature || !rawBody) return false;
  try {
    const message = apiKey + rawBody;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(message)
    );
    const hex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === signature;
  } catch (err) {
    console.error("Error verificando firma dLocal:", err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { apiKey, secretKey } = getDLocalGoEnv();
    const rawBody = await req.text();
    if (!rawBody) {
      return jsonCheckoutResponse(400, { error: "Body vacío" });
    }

    const authHeader = req.headers.get("authorization") || "";
    const sigMatch = authHeader.match(/Signature:\s*([0-9a-fA-F]+)/i);
    const signature = sigMatch ? sigMatch[1] : null;

    if (!(await verifySignature(apiKey, secretKey, rawBody, signature))) {
      return jsonCheckoutResponse(401, { error: "Firma inválida" });
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonCheckoutResponse(400, { error: "JSON inválido" });
    }

    const paymentId = payload.payment_id;
    if (!paymentId) {
      return jsonCheckoutResponse(400, { error: "payment_id es requerido" });
    }

    const payment = await getDLocalGoPaymentStatus(String(paymentId));
    if (!payment) {
      return jsonCheckoutResponse(502, {
        error: "No se pudo consultar el pago en dLocal",
      });
    }

    let invoice: any = null;
    if (payment.order_id) {
      invoice = await getCheckoutInvoiceWithProduct(supabase, payment.order_id);
    }
    if (!invoice && payment.payer?.id) {
      invoice = await getCheckoutInvoiceWithProduct(supabase, payment.payer.id);
    }
    if (!invoice && payment.payer?.email) {
      const byField = await supabase
        .from("invoices")
        .select("id")
        .eq("user_email", String(payment.payer.email))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byField?.data?.id) {
        invoice = await getCheckoutInvoiceWithProduct(supabase, byField.data.id);
      }
    }
    if (!invoice) {
      invoice = await getCheckoutInvoiceByCustomField(
        supabase,
        "dlocalgo_payment_id",
        String(paymentId)
      );
    }
    if (!invoice) {
      return jsonCheckoutResponse(404, { error: "Factura no encontrada" });
    }

    if (payment.status === "PAID") {
      const incoming = Number(payment.amount);
      if (
        Number.isFinite(incoming) &&
        Math.abs(incoming - Number(invoice.amount)) > 0.01
      ) {
        console.error(
          `dLocal Go: monto no coincide factura=${invoice.amount} pago=${incoming}`
        );
        return jsonCheckoutResponse(409, { error: "Monto no coincide" });
      }

      const delivered = await deliverCheckoutOrder(supabase, {
        invoice,
        gateway: "dlocalgo",
        transactionId: String(payment.id),
        paidAt: payment.approved_date || new Date().toISOString(),
        paymentMeta: buildDLocalGoPaymentMeta(payment),
      });

      return jsonCheckoutResponse(200, {
        ok: true,
        ...delivered,
        status: "PAID",
      });
    }

    const statusMap: Record<string, string> = {
      REJECTED: "cancelled",
      CANCELLED: "cancelled",
      EXPIRED: "cancelled",
    };
    const targetStatus = statusMap[payment.status];
    if (
      targetStatus &&
      invoice.status !== "paid" &&
      invoice.status !== "completed"
    ) {
      await supabase
        .from("invoices")
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
    }

    return jsonCheckoutResponse(200, { ok: true, status: payment.status });
  } catch (err) {
    console.error("dlocalgo-webhook error:", err);
    return jsonCheckoutResponse(500, {
      error:
        err instanceof Error ? err.message : "Error interno inesperado",
    });
  }
});