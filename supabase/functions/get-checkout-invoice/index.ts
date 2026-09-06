import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  getCheckoutInvoiceWithProduct,
  buildDeliveryPayload,
  deliverCheckoutOrder,
  getNowPaymentsInvoiceStatus,
} from "../_shared/checkout.ts";

// Devuelve el estado de una factura de checkout y, SOLO si está pagada,
// la información de entrega (links de acceso, mensajes).
// Para NowPayments, si la factura sigue pendiente se consulta el estado a la
// API de NowPayments: si ya está "finished", se entrega sin depender del IPN
// (el webhook puede no llegar en sandbox).
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    let invoiceId = url.searchParams.get("invoice_id");

    if (!invoiceId) {
      try {
        const body = await req.json();
        invoiceId = body?.invoice_id;
      } catch {
        // sin body, no hacer nada
      }
    }

    if (!invoiceId) {
      return jsonCheckoutResponse(400, { error: "invoice_id es requerido" });
    }

    const invoice = await getCheckoutInvoiceWithProduct(supabase, invoiceId);
    if (!invoice) {
      return jsonCheckoutResponse(404, { error: "Factura no encontrada" });
    }

    const paid =
      invoice.status === "paid" || invoice.status === "completed";

    // Fallback NowPayments: confirmar el pago directamente contra la API
    if (!paid) {
      const npInvoiceId = invoice.custom_fields?.np_invoice_id;
      if (npInvoiceId) {
        const npStatus = await getNowPaymentsInvoiceStatus(String(npInvoiceId));
        if (
          npStatus?.payment_status === "finished" &&
          (invoice.status === "pending" || invoice.status === "waiting")
        ) {
          const delivery = await deliverCheckoutOrder(supabase, {
            invoice,
            gateway: "nowpayments",
            transactionId: String(
              npStatus.payment_id || npStatus.id || `NP-${invoice.id}`
            ),
          });
          return jsonCheckoutResponse(200, delivery);
        }
      }
    }

    return jsonCheckoutResponse(200, buildDeliveryPayload(invoice));
  } catch (error) {
    console.error("Error en get-checkout-invoice:", error);
    return jsonCheckoutResponse(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});