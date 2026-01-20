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
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      padding: 0;
    }
    td {
      padding: 0;
      margin: 0;
      vertical-align: bottom;
    }
    .bold { font-weight: 800; }
    .divider { border-bottom: 1px solid #888989; margin: 2px 0; }
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
  </style>
</head>
<body>
  <div class="invoice-label">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td colspan="2" style="text-align: center; padding: 4px 0;">
          <h1 style="margin: 4px 0; letter-spacing: 0.15px; font-weight: 800; font-size: 1.2em; text-align: center;">Invoice #${invoice.invoice_number}</h1>
        </td>
      </tr>
      <tr>
        <td colspan="2" class="divider"></td>
      </tr>
      <tr>
        <td style="padding: 4px 0; vertical-align: bottom;">
          <table style="border-collapse: collapse;">
            <tr>
              <td style="padding-right: 20px; vertical-align: bottom;">
                <a href="https://vixis.dev/studio" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
                  <img
                    src="https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp"
                    alt="Vixis Studio"
                    style="height: 20px; border-radius: 4px; display: block;"
                  >
                </a>
              </td>
              <td style="font-size: 0.9em; font-weight: 800; vertical-align: bottom;">Vixis Studio</td>
            </tr>
          </table>
        </td>
        <td style="text-align: right; font-size: 0.9em; font-weight: 400; padding: 4px 0; vertical-align: bottom;">${invoice.products && (invoice.products as any).title ? (invoice.products as any).title : ''}</td>
      </tr>
      <tr>
        <td colspan="2" class="divider"></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">
          <span style="font-weight: 800;">${invoice.user_name}</span>
        </td>
        <td style="text-align: right; padding: 4px 0;">
          <span style="font-weight: 800;">${invoice.request_type}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div class="divider-large"></div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 4px 0;">
          <div style="font-size: 0.85rem; font-weight: 800;">Amount to pay</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">
          <span style="font-size: 1.5em; font-weight: 800;">Total</span>
        </td>
        <td style="text-align: right; padding: 4px 0;">
          <span style="font-size: 2.4em; font-weight: 700;">${formatPrice(invoice.amount, invoice.currency)}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div class="divider-medium"></div>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px solid #888989;">
          <span style="font-size: 0.85rem; font-weight: 800;">Approximate delivery time</span>
        </td>
        <td style="text-align: right; padding: 4px 0; border-bottom: 1px solid #888989;">
          <span style="font-size: 0.85rem;">${invoice.delivery_time}</span>
        </td>
      </tr>
      ${
        invoice.custom_fields?.features &&
        Array.isArray(invoice.custom_fields.features) &&
        invoice.custom_fields.features.length > 0
          ? invoice.custom_fields.features
              .map(
                (feature: any) => {
                  let priceDisplay = "";
                  if (feature.type === "percentage" && feature.percentage !== undefined && feature.percentage !== null) {
                    // Mostrar porcentaje: "+30%" si es positivo, "-30%" si es negativo
                    const percentage = feature.percentage;
                    priceDisplay = percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
                  } else if (feature.price !== undefined && feature.price !== null) {
                    // Mostrar precio fijo
                    priceDisplay = formatPrice(feature.price || 0, feature.currency || invoice.currency || "USD");
                  } else {
                    priceDisplay = formatPrice(0, feature.currency || invoice.currency || "USD");
                  }
                  return `
      <tr>
        <td colspan="2" class="divider"></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">
          <span style="font-size: 0.85rem; font-weight: 800;">${feature.name || "Feature"}</span>
        </td>
        <td style="text-align: right; padding: 4px 0;">
          <span style="font-size: 0.85rem;">${priceDisplay}</span>
        </td>
      </tr>
      `;
                }
              )
              .join("")
          : ""
      }
      <tr>
        <td colspan="2">
          <div class="divider-large"></div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: center; padding: 10px 0;">
          <a
            href="${invoice.pay_now_link || "https://vixis.dev/how-to-pay-me"}"
            target="_blank"
            rel="noopener noreferrer"
            style="padding: 10px 20px; background-color: #0d0d0d; color: #03fff6 !important; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block;"
          >
            Pay Now
          </a>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div class="divider-medium"></div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="font-size: 0.6rem; padding: 5px 0 5px 8px; text-indent: -8px;">
          * In the payment note you must put:<br>
          Product #${invoice.product_id.substring(0, 8)} - Invoice #${invoice.invoice_number} - Vixis
        </td>
      </tr>
    </table>
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
