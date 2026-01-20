import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HmacSha256 } from "https://deno.land/std@0.168.0/hash/sha256.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-date, x-login, authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const dlocalLogin = Deno.env.get("DLOCAL_X_LOGIN")!;
    const dlocalSecretKey = Deno.env.get("DLOCAL_SECRET_KEY")!;

    // Leer el body completo para verificar la firma
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    // Verificar la firma de dLocal
    const xDate = req.headers.get("X-Date");
    const authHeader = req.headers.get("Authorization");

    if (!xDate || !authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing required headers" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Reconstruir la firma esperada
    const signatureString = dlocalLogin + xDate + bodyText;
    const hmac = new HmacSha256(dlocalSecretKey);
    hmac.update(signatureString);
    const expectedSignature = hexEncode(hmac.digest());
    const expectedAuth = `V2-HMAC-SHA256, Signature: ${expectedSignature}`;

    // Verificar la firma
    if (authHeader !== expectedAuth) {
      console.error("Invalid signature", {
        received: authHeader,
        expected: expectedAuth,
      });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extraer información del pago de dLocal
    const paymentId = body.id;
    const orderId = body.order_id;
    const status = body.status;
    const amount = body.amount;
    const currency = body.currency;
    const payerName = body.payer?.name;
    const payerEmail = body.payer?.email;

    // Solo procesar pagos que estén PAID (pagados)
    if (status !== "PAID") {
      return new Response(
        JSON.stringify({
          message: "Payment not paid yet",
          status: status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extraer Invoice ID del order_id
    // El order_id debería ser: "Product #XXXX - Invoice #INV-YYYY-NNNN - Vixis"
    let invoiceNumber: string | null = null;

    if (orderId) {
      // Intentar extraer Invoice ID del formato completo
      const invoiceMatch = orderId.match(/Invoice #(INV-\d{4}-\d{4})/);
      if (invoiceMatch) {
        invoiceNumber = invoiceMatch[1];
      } else if (orderId.startsWith("INV-")) {
        // Si el order_id es directamente el Invoice ID
        invoiceNumber = orderId;
      }
    }

    if (!invoiceNumber) {
      return new Response(
        JSON.stringify({
          error: "Could not extract invoice number from order_id",
          order_id: orderId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar la factura por invoice_number
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        user_name,
        user_email,
        amount,
        currency,
        product_id,
        products (id, title)
      `)
      .eq("invoice_number", invoiceNumber)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({
          error: "Invoice not found",
          invoice_number: invoiceNumber,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verificar que la factura no esté ya pagada
    if (invoice.status === "paid" || invoice.status === "completed") {
      return new Response(
        JSON.stringify({
          message: "Invoice is already paid",
          invoice_id: invoice.id,
          current_status: invoice.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Actualizar la factura como pagada
    const updateData: any = {
      status: "paid",
      transaction_id: paymentId,
      paid_at: body.created_date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoice.id)
      .select("id, invoice_number, status, transaction_id, paid_at")
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Failed to update invoice",
          message: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Enviar notificación a Slack (si está configurado)
    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (slackWebhookUrl) {
      try {
        const productTitle = (invoice.products as any)?.title || "N/A";
        const slackMessage = {
          text: "✅ Pago Recibido - dLocal",
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "✅ Pago Recibido - dLocal",
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Invoice:*\n${invoice.invoice_number}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Monto:*\n${amount} ${currency}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Producto:*\n${productTitle}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Cliente:*\n${invoice.user_name || payerName || "N/A"}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Email:*\n${invoice.user_email || payerEmail || "N/A"}`,
                },
                {
                  type: "mrkdwn",
                  text: `*Payment ID:*\n${paymentId}`,
                },
              ],
            },
          ],
        };

        await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackMessage),
        });
      } catch (slackError) {
        console.error("Error al enviar notificación a Slack:", slackError);
        // No fallar el proceso si Slack falla
      }
    }

    // Enviar email de confirmación al usuario
    try {
      await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoice_id: invoice.id,
          is_update: false,
          is_payment_confirmation: true,
        },
      });
    } catch (emailError) {
      console.error("Error al enviar email de confirmación:", emailError);
      // No fallar el proceso si el email falla
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice marked as paid successfully",
        invoice: updatedInvoice,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en dlocal-webhook:", error);
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
