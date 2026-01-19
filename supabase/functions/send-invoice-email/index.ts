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
      margin: -4px 0;
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
    .studio { margin: 4px 0; font-size: 0.9em; }
    .user-info { margin: 4px 0; display: flex; justify-content: space-between; }
    .calories-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .left-container { display: flex; flex-direction: column; }
    .small-text { font-size: 0.85rem; margin: 0; font-weight: 400; }
    .amount-label {
      margin: -5px -2px;
      font-size: 2em;
      font-weight: 700;
    }
    .amount-value {
      margin: -7px -2px;
      font-size: 2.4em;
      font-weight: 700;
    }
    .daily-value { font-size: 0.85rem; }
    .delivery-time {
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #888989;
      padding-bottom: 2px;
    }
    .payment-button-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 10px 0;
    }
    .payment-button {
      display: block;
      padding: 10px 20px;
      background-color: #2093c4;
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 700;
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
      <p class="studio">Vixis Studio</p>
      <p class="user-info">
        <span class="bold">${invoice.user_name}</span>
        <span>${invoice.request_type}</span>
      </p>
    </header>
    <div class="divider-large"></div>
    <div class="calories-info">
      <div class="left-container">
        <h2 class="bold small-text">Amount to pay</h2>
        <p class="amount-label">Total</p>
      </div>
      <span class="amount-value">${formatPrice(invoice.amount, invoice.currency)}</span>
    </div>
    <div class="divider-medium"></div>
    <div class="daily-value">
      <p class="delivery-time">
        <span class="bold">Approximate delivery time</span>
        <span>${invoice.delivery_time}</span>
      </p>
      ${
        invoice.custom_fields && Object.keys(invoice.custom_fields).length > 0
          ? Object.entries(invoice.custom_fields)
              .map(
                ([key, value]) => `
        <div class="divider"></div>
        <p>
          <span class="bold">${key}</span>
          <span>${String(value)}</span>
        </p>
      `
              )
              .join("")
          : ""
      }
      <div class="divider-large"></div>
      <div class="payment-button-container">
        <a href="https://app.airtm.com/ivt/vixis" class="payment-button" target="_blank">
          Pay Now
        </a>
        <a href="https://airtm.me/Vixis" class="payment-button" target="_blank">
          Alternative Payment
        </a>
      </div>
      <div class="divider-medium"></div>
      <p class="note">
        * In the payment note you must put: Product #${invoice.product_id} - Invoice #${invoice.invoice_number} - Vixis
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Obtener webhook URL de Make.com desde variables de entorno
    const makeWebhookUrl = Deno.env.get("MAKE_INVOICE_WEBHOOK_URL");

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
          }),
        });

        if (!webhookResponse.ok) {
          throw new Error(`Webhook failed: ${webhookResponse.statusText}`);
        }
      } catch (webhookError) {
        console.error("Error al enviar webhook a Make.com:", webhookError);
        // No fallar la función si el webhook falla
      }
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
