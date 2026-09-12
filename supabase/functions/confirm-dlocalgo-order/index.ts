import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  getCheckoutInvoiceWithProduct,
  deliverCheckoutOrder,
  getDLocalGoEnv,
  buildDLocalGoPaymentMeta,
} from "../_shared/checkout.ts";

// Confirma un pago del Transparent Checkout (SmartFields) de dLocal Go.
// POST /v1/payments/confirm/{checkout_token} con el cardToken generado por
// el SDK. Puede devolver:
//   - redirect_url → el cliente debe completar 3DS (y volver por success_url,
//     donde el polling de get-checkout-invoice entrega).
//   - status PAID / APPROVED → entrega inmediata.
//   - status pendiente → se guarda el payment_id y el polling entrega.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { apiKey, secretKey, baseUrl } = getDLocalGoEnv();
    if (!apiKey || !secretKey) {
      return jsonCheckoutResponse(500, {
        error: "DLocal no está configurado",
      });
    }

    const body = await req.json();
    const {
      invoice_id,
      checkout_token,
      card_token,
      client_first_name,
      client_last_name,
      client_document_type,
      client_document,
      client_country,
      client_email,
      installments_id,
    } = body || {};

    if (!invoice_id || !checkout_token || !card_token) {
      return jsonCheckoutResponse(400, {
        error: "invoice_id, checkout_token y card_token son requeridos",
      });
    }

    const invoice = await getCheckoutInvoiceWithProduct(supabase, invoice_id);
    if (!invoice) {
      return jsonCheckoutResponse(404, { error: "Factura no encontrada" });
    }

    // Idempotencia: si ya está pagada, no re-cobrar
    if (invoice.status === "paid" || invoice.status === "completed") {
      const already = await deliverCheckoutOrder(supabase, {
        invoice,
        gateway: "dlocalgo",
        transactionId:
          invoice.transaction_id || invoice.custom_fields?.dlocalgo_payment_id,
      });
      return jsonCheckoutResponse(200, {
        ok: true,
        ...already,
        paid: true,
      });
    }

    const confirmBody: Record<string, unknown> = {
      cardToken: String(card_token),
      clientFirstName: String(
        client_first_name || client_email || "Cliente"
      ).slice(0, 100),
      clientLastName: String(client_last_name || "").slice(0, 100),
      clientEmail: String(client_email || invoice.user_email).slice(0, 100),
    };
    if (client_document_type) confirmBody.clientDocumentType = client_document_type;
    if (client_document) confirmBody.clientDocument = String(client_document);
    if (client_country) confirmBody.clientCountry = String(client_country).toUpperCase();
    if (installments_id) confirmBody.installmentsId = installments_id;

    let dlocalRes: Response;
    try {
      dlocalRes = await fetch(
        `${baseUrl}/v1/payments/confirm/${encodeURIComponent(checkout_token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}:${secretKey}`,
          },
          body: JSON.stringify(confirmBody),
        }
      );
    } catch (networkErr) {
      console.error("Network error dLocal confirm:", networkErr);
      return jsonCheckoutResponse(502, {
        error: "No se pudo contactar a dLocal, intenta de nuevo",
      });
    }

    const data = await dlocalRes.json().catch(() => ({}));

    if (!dlocalRes.ok) {
      console.error(
        `dLocal confirm error ${dlocalRes.status}:`,
        JSON.stringify(data)
      );
      return jsonCheckoutResponse(
        dlocalRes.status >= 500 ? 502 : 400,
        {
          error:
            (data as any)?.error?.message ||
            "La tarjeta fue rechazada, intenta con otra",
          details: data,
        }
      );
    }

    const status = String(
      (data as any)?.status ||
        (data as any)?.payment_status ||
        ""
    ).toUpperCase();
    const paymentId =
      (data as any)?.id ||
      (data as any)?.payment_id ||
      (data as any)?.payment?.id ||
      null;

    // 3DS: redirigir al cliente a autenticarse
    if ((data as any)?.redirect_url) {
      if (paymentId) {
        await supabase
          .from("invoices")
          .update({
            custom_fields: {
              ...(invoice.custom_fields || {}),
              dlocalgo_payment_id: String(paymentId),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);
      }
      return jsonCheckoutResponse(200, {
        ok: true,
        redirect_url: (data as any).redirect_url,
        invoice_id: invoice.id,
        status: status || "PENDING",
      });
    }

    if (paymentId) {
      await supabase
        .from("invoices")
        .update({
          custom_fields: {
            ...(invoice.custom_fields || {}),
            dlocalgo_payment_id: String(paymentId),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
    }

    if (["PAID", "APPROVED", "COMPLETED", "AUTHORIZED"].includes(status)) {
      const delivery = await deliverCheckoutOrder(supabase, {
        invoice,
        gateway: "dlocalgo",
        transactionId: String(paymentId || invoice.id),
        paymentMeta: buildDLocalGoPaymentMeta(data),
      });
      return jsonCheckoutResponse(200, {
        ok: true,
        ...delivery,
        paid: true,
      });
    }

    // Pendiente (ej. verificación manual): el polling de get-checkout-invoice
    // consultará la API de dLocal y entregará cuando pase a PAID si indicamos
    // el payment_id en custom_fields.
    return jsonCheckoutResponse(200, {
      ok: true,
      paid: false,
      status: status || "PENDING",
      invoice_id: invoice.id,
      dlocalgo_payment_id: paymentId,
    });
  } catch (err) {
    console.error("confirm-dlocalgo-order error:", err);
    return jsonCheckoutResponse(500, {
      error:
        err instanceof Error ? err.message : "Error interno inesperado",
    });
  }
});