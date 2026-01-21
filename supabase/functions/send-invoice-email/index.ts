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
    const { invoice_id, is_update, is_payment_confirmation } = await req.json();

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
        products (id, title, title_translations, description, full_description)
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

    // Calcular ancho dinámico del contenedor basado en el precio total
    const calculateInvoiceWidth = (priceString: string): number => {
      // Ancho base mínimo más cómodo para valores grandes
      const baseWidth = 320;
      // Cada carácter ocupa ~10px con font-size grande
      const charWidth = 10;
      const priceLength = priceString.length;
      const calculatedWidth = baseWidth + (priceLength * charWidth) + 40; // +padding/márgenes
      // Limitar entre 320px y 720px (para que no desborde el viewport)
      return Math.min(Math.max(calculatedWidth, baseWidth), 720);
    };

    // Calcular font-size dinámico para el precio total
    const calculatePriceFontSize = (priceLength: number): string => {
      if (priceLength > 18) return "1.6em";
      if (priceLength > 14) return "1.9em";
      if (priceLength > 10) return "2.2em";
      return "2.4em";
    };

    const totalPriceString = formatPrice(invoice.amount, invoice.currency);
    const invoiceWidth = calculateInvoiceWidth(totalPriceString);
    const priceFontSize = calculatePriceFontSize(totalPriceString.length);

    // Sanitizar enlace de pago (fallback a /pay/:id y evitar how-to-pay-me)
    const rawPayLink = (invoice.pay_now_link || "").trim();
    const payLink =
      rawPayLink && !rawPayLink.includes("how-to-pay-me")
        ? rawPayLink
        : `https://vixis.dev/pay/${invoice.id}`;

    // Si es confirmación de pago, generar HTML diferente
    if (is_payment_confirmation) {
      const confirmationHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed - Invoice #${invoice.invoice_number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="https://vixis.dev/studio" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 10px;">
        <img src="https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp" alt="Vixis Studio" style="height: 32px; width: auto; vertical-align: middle;">
        <span style="font-size: 22px; font-weight: 800; color: #331d83; margin: 0; padding: 0;">Vixis Studio</span>
      </a>
    </div>
    
    <h1 style="color: #331d83; text-align: center; margin-bottom: 20px;">✅ Payment Confirmed</h1>
    
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      Dear ${invoice.user_name || "Customer"},
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      We have successfully received your payment for <strong>Invoice #${invoice.invoice_number}</strong>.
    </p>
    
    <div style="background-color: #f9f9f9; border-left: 4px solid #2093c4; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Invoice Number:</strong> ${invoice.invoice_number}<br>
        <strong>Amount Paid:</strong> ${formatPrice(invoice.amount, invoice.currency)}<br>
        <strong>Product:</strong> ${getProductTitle(invoice.products, invoice.custom_fields?.product_language)}<br>
        <strong>Payment Date:</strong> ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      We will begin working on your request and will keep you updated on the progress.
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      If you have any questions, please don't hesitate to contact us.
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
      Best regards,<br>
      <strong>Vixis Studio</strong>
    </p>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <a href="https://vixis.dev" style="color: #2093c4; text-decoration: none;">Visit our website</a>
    </div>
  </div>
</body>
</html>
      `;

      // Enviar email de confirmación
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
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
              subject: `Payment Confirmed - Invoice #${invoice.invoice_number} - Vixis Studio`,
              html: confirmationHTML,
            }),
          });

          if (resendResponse.ok) {
            return new Response(
              JSON.stringify({
                success: true,
                message: "Payment confirmation email sent successfully",
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            const errorText = await resendResponse.text();
            console.error("Resend API error:", errorText);
            return new Response(
              JSON.stringify({
                error: "Failed to send confirmation email",
                details: errorText,
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } catch (emailError) {
          console.error("Error al enviar email de confirmación:", emailError);
          return new Response(
            JSON.stringify({
              error: "Failed to send confirmation email",
              message: emailError instanceof Error ? emailError.message : "Unknown error",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else {
        return new Response(
          JSON.stringify({
            error: "RESEND_API_KEY not configured",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Función para extraer traducciones del producto
    const getProductTitle = (product: any, productLanguage?: string) => {
      if (!product) return '';
      // Usar el idioma guardado en custom_fields.product_language, o español por defecto
      const language = productLanguage || "es";
      if (product.title_translations && typeof product.title_translations === 'object') {
        const translations = product.title_translations as { es?: string; en?: string };
        return translations[language as keyof typeof translations] || product.title || '';
      }
      return product.title || '';
    };

    const productLanguage = invoice.custom_fields?.product_language as string | undefined;
    const productTitle = invoice.products 
      ? getProductTitle(invoice.products as any, productLanguage)
      : '';

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
      width: ${invoiceWidth}px;
      min-width: 320px;
      max-width: min(90vw, ${invoiceWidth}px);
      margin: 20px auto;
      padding: 0 10px;
      background: white;
      word-wrap: break-word;
      overflow-wrap: break-word;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      padding: 0;
      table-layout: fixed;
    }
    td {
      padding: 0;
      margin: 0;
      vertical-align: bottom;
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-width: 0;
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
    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
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
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="vertical-align: bottom; padding-right: 10px;">
                <a href="https://vixis.dev/studio" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                  <img
                    src="https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp"
                    alt="Vixis Studio"
                    style="height: 20px; width: auto; border-radius: 4px; display: block;"
                  >
                  <span style="font-size: 0.95em; font-weight: 800; color: #000; margin: 0; padding: 0;">Vixis Studio</span>
                </a>
              </td>
              <td style="font-size: 0.9em; font-weight: 400; vertical-align: bottom; text-align: right;">${productTitle}</td>
            </tr>
          </table>
        </td>
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
        <td colspan="2" style="padding: 4px 0; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="font-size: 0.85rem; font-weight: 800;">Amount to pay</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 0; width: 40%;">
          <span style="font-size: 1.5em; font-weight: 800;">Total</span>
        </td>
        <td style="text-align: right; padding: 4px 0; width: 60%; white-space: nowrap;">
          <span style="font-size: ${priceFontSize}; font-weight: 700; line-height: 1.1; white-space: nowrap; display: inline-block;">${formatPrice(invoice.amount, invoice.currency)}</span>
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
        <td style="text-align: right; padding: 4px 0; border-bottom: 1px solid #888989; word-wrap: break-word; overflow-wrap: break-word;">
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
        <td style="text-align: right; padding: 4px 0; word-wrap: break-word; overflow-wrap: break-word;">
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
            href="${payLink}"
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
      ${is_payment_confirmation ? '' : `
      <tr>
        <td colspan="2" style="font-size: 0.6rem; padding: 5px 0 5px 8px; text-indent: -8px;">
          * Order ID (automatically included):<br>
          Product #${invoice.product_id.substring(0, 8)} - Invoice #${invoice.invoice_number} - Vixis
        </td>
      </tr>
      `}
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
            subject: is_payment_confirmation
              ? `Payment Confirmed - Invoice #${invoice.invoice_number} - Vixis Studio`
              : is_update 
              ? `Invoice #${invoice.invoice_number} Updated - Vixis Studio`
              : `Invoice #${invoice.invoice_number} - Vixis Studio`,
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
                subject: is_payment_confirmation
              ? `Payment Confirmed - Invoice #${invoice.invoice_number} - Vixis Studio`
              : is_update 
              ? `Invoice #${invoice.invoice_number} Updated - Vixis Studio`
              : `Invoice #${invoice.invoice_number} - Vixis Studio`,
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
            subject: is_payment_confirmation
              ? `Payment Confirmed - Invoice #${invoice.invoice_number} - Vixis Studio`
              : is_update 
              ? `Invoice #${invoice.invoice_number} Updated - Vixis Studio`
              : `Invoice #${invoice.invoice_number} - Vixis Studio`,
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
