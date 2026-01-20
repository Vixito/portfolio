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
    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: "invoice_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener la factura con el producto relacionado
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        products (id, title, description, full_description)
      `)
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generar HTML de la factura (estilo Nutrition Facts)
    const formatPrice = (amount: number, currency: string) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency === "USD" ? "USD" : "COP",
        minimumFractionDigits: currency === "USD" ? 2 : 0,
      }).format(amount);
    };

    const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoice.invoice_number}</title>
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700,800" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html { font-size: 16px; }
    body {
      font-family: 'Open Sans', sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
      margin: 0;
    }
    .invoice-label {
      border: 2px solid black;
      width: 270px;
      margin: 20px auto;
      padding: 0 7px;
      background: white;
    }
    header h1 {
      text-align: center;
      margin: 4px 0;
      letter-spacing: 0.15px;
      font-weight: 800;
      font-size: 1.2em;
    }
    p { margin: 0; display: flex; justify-content: space-between; }
    .divider { border-bottom: 1px solid #888989; margin: 2px 0; }
    .bold { font-weight: 800; }
    .divider-large {
      height: 10px;
      background-color: black;
      border: 0;
      margin: 2px 0;
    }
    .divider-medium {
      height: 5px;
      background-color: black;
      border: 0;
      margin: 2px 0;
    }
    .studio-row {
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
    }
    .studio {
      font-size: 0.9em;
      font-weight: 800;
      display: flex;
      align-items: flex-end;
      gap: 20px;
    }
    .studio-logo {
      height: 20px;
      border-radius: 4px;
      display: block;
    }
    .product-name {
      font-size: 0.9em;
      font-weight: 400;
      text-align: right;
    }
    .user-info {
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .request-type {
      font-weight: 800;
    }
    .calories-info {
      display: flex;
      flex-direction: column;
      margin: 4px 0;
      width: 100%;
    }
    .amount-to-pay {
      font-size: 0.85rem;
      font-weight: 800;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-top: 4px;
    }
    .amount-label {
      font-size: 1.5em;
      font-weight: 800;
    }
    .amount-value {
      font-size: 2.4em;
      font-weight: 700;
    }
    .daily-value { font-size: 0.85rem; }
    .delivery-time {
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #888989;
    }
    .feature-item {
      display: flex;
      justify-content: space-between;
    }
    .feature-price {
      min-width: 60px;
      text-align: right;
    }
    .payment-button-container {
      margin: 10px 0;
      text-align: center;
    }
    .payment-button {
      padding: 10px 20px;
      background-color: #0d0d0d;
      color: #03fff6;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 700;
      display: inline-block;
    }
    .note {
      font-size: 0.6rem;
      margin: 5px 0;
      padding: 0 8px;
      text-indent: -8px;
    }
  </style>
</head>
<body>
  <div class="invoice-label">
    <header>
      <h1 class="bold">Invoice #${invoice.invoice_number}</h1>
      <div class="divider"></div>
      <div class="studio-row">
        <p class="studio">
          <img
            src="https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp"
            alt="Vixis Studio"
            class="studio-logo"
          >
          Vixis Studio
        </p>
        <span class="product-name">${invoice.products && (invoice.products as any).title ? (invoice.products as any).title : ''}</span>
      </div>
      <p class="user-info">
        <span class="bold">${invoice.user_name}</span>
        <span class="request-type">${invoice.request_type}</span>
      </p>
    </header>
    <div class="divider-large"></div>
    <div class="calories-info">
      <p class="amount-to-pay">Amount to pay</p>
      <div class="amount-row">
        <span class="amount-label">Total</span>
        <span class="amount-value">${formatPrice(invoice.amount, invoice.currency)}</span>
      </div>
    </div>
    <div class="divider-medium"></div>
    <div class="daily-value">
      <p class="delivery-time" style="margin: 4px 0; display: flex; justify-content: space-between; border-bottom: 1px solid #888989;">
        <span class="bold" style="font-weight: 800;">Approximate delivery time</span>
        <span style="text-align: right; min-width: 60px;">${invoice.delivery_time}</span>
      </p>
      ${
        invoice.custom_fields?.features &&
        Array.isArray(invoice.custom_fields.features) &&
        invoice.custom_fields.features.length > 0
          ? invoice.custom_fields.features
              .map(
                (feature: any) => `
      <div class="divider"></div>
      <div class="feature-item" style="display: flex; justify-content: space-between;">
        <span class="bold" style="font-weight: 800;">${feature.name || "Feature"}</span>
        <span class="feature-price" style="min-width: 60px; text-align: right;">${formatPrice(feature.price || 0, feature.currency || invoice.currency || "USD")}</span>
      </div>
      `
              )
              .join("")
          : ""
      }
      <div class="divider-large"></div>
      <div class="payment-button-container" style="margin: 10px 0; text-align: center;">
        <a
          href="#"
          class="payment-button"
          style="padding: 10px 20px; background-color: #0d0d0d; color: #03fff6; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block;"
          onclick="event.preventDefault(); window.open('https://airtm.me/Vixis','_blank'); window.open('https://app.airtm.com/ivt/vixis','_blank');"
        >
          Pay Now
        </a>
      </div>
      <div class="divider-medium"></div>
      <p class="note">
        * In the payment note you must put:<br>
        Product #${invoice.product_id.substring(0, 8)} - Invoice #${invoice.invoice_number} - Vixis
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Obtener webhook URL de Make.com desde variables de entorno (opcional)
    const makeWebhookUrl = Deno.env.get("MAKE_INVOICE_WEBHOOK_URL");
    
    // API Key de Resend (requerido si no hay Make webhook)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    let emailSent = false;

    // Prioridad: Make.com webhook > Resend
    if (makeWebhookUrl) {
      // Enviar a Make.com para que envíe el email
      try {
        const webhookResponse = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            user_email: invoice.user_email,
            user_name: invoice.user_name,
            invoice_html: invoiceHTML,
            product_id: invoice.product_id,
            amount: invoice.amount,
            currency: invoice.currency,
            delivery_time: invoice.delivery_time,
            request_type: invoice.request_type,
            custom_fields: invoice.custom_fields,
            from_email: "noreply@vixis.dev",
            from_name: "Vixis Studio",
            subject: `Invoice #${invoice.invoice_number} - Vixis Studio`,
          }),
        });

        if (webhookResponse.ok) {
          emailSent = true;
        } else {
          throw new Error(`Webhook failed: ${webhookResponse.statusText}`);
        }
      } catch (webhookError) {
        console.error("Error al enviar webhook a Make.com:", webhookError);
        // Intentar con Resend como fallback
        if (resendApiKey) {
          try {
            const resendResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "noreply@vixis.dev",
                to: invoice.user_email,
                subject: `Invoice #${invoice.invoice_number} - Vixis Studio`,
                html: invoiceHTML,
              }),
            });
            if (resendResponse.ok) {
              emailSent = true;
            } else {
              const errorText = await resendResponse.text();
              console.error("Resend API error:", errorText);
            }
          } catch (resendError) {
            console.error("Error al enviar con Resend:", resendError);
          }
        }
      }
    } else if (resendApiKey) {
      // Enviar directamente con Resend
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "noreply@vixis.dev",
            to: invoice.user_email,
            subject: `Invoice #${invoice.invoice_number} - Vixis Studio`,
            html: invoiceHTML,
          }),
        });
        
        if (resendResponse.ok) {
          emailSent = true;
        } else {
          const errorText = await resendResponse.text();
          console.error("Resend API error:", errorText);
          throw new Error(`Resend failed: ${resendResponse.statusText} - ${errorText}`);
        }
      } catch (resendError) {
        console.error("Error al enviar con Resend:", resendError);
        throw resendError;
      }
    } else {
      console.warn("No hay servicio de email configurado. Configura RESEND_API_KEY en Supabase Edge Functions o MAKE_INVOICE_WEBHOOK_URL");
      return new Response(
        JSON.stringify({
          error: "No email service configured",
          message: "Configure RESEND_API_KEY in Supabase Edge Functions secrets, or MAKE_INVOICE_WEBHOOK_URL",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!emailSent) {
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          message: "All email services failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice email sent successfully",
        invoice_id: invoice.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en send-invoice-email:", error);
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
