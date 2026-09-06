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

    // Función para extraer traducciones del producto
    function getProductTitle(product: any, productLanguage?: string): string {
      if (!product) return "";
      // Usar el idioma guardado en custom_fields.product_language, o español por defecto
      const language = productLanguage || "es";
      if (product.title_translations && typeof product.title_translations === "object") {
        const translations = product.title_translations as { es?: string; en?: string };
        return translations[language as keyof typeof translations] || product.title || "";
      }
      return product.title || "";
    }

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

    // Idioma de la factura: el mismo que usó el comprador en el checkout
    const lang = invoice.custom_fields?.product_language === "en" ? "en" : "es";

    // Textos localizados (sin Spanglish): todo en español o todo en inglés.
    // Cada caso usa sus textos propios: factura pendiente (proyecto) o
    // confirmación de pago (producto).
    const T = {
      invoiceRef: lang === "en" ? "Invoice" : "Factura",
      amountLabel: is_payment_confirmation
        ? lang === "en"
          ? "Amount paid"
          : "Cantidad pagada"
        : lang === "en"
        ? "Amount to pay"
        : "Cantidad a pagar",
      totalLabel: "Total",
      deliveryLabel:
        lang === "en"
          ? "Approximate delivery time"
          : "Tiempo aproximado de entrega",
      payNow: lang === "en" ? "Pay Now" : "Pagar ahora",
      getProduct: lang === "en" ? "Get product" : "Obtener producto",
      linkLabel: lang === "en" ? "Link" : "Enlace",
      orderIdAuto:
        lang === "en"
          ? "* Order ID (automatically included):"
          : "* ID de pedido (incluido automáticamente):",
      paymentNote:
        lang === "en"
          ? "* In the payment note you must put:"
          : "* En la nota del pago debes poner:",
      paymentReceived:
        lang === "en" ? "* Payment received:" : "* Pago recibido:",
      productRef: lang === "en" ? "Product" : "Producto",
    };

    const subject = is_payment_confirmation
      ? `${
          lang === "en" ? "Payment Confirmed" : "Pago confirmado"
        } - ${T.invoiceRef} #${invoice.invoice_number} - Vixis Studio`
      : is_update
      ? `${T.invoiceRef} #${invoice.invoice_number} ${
          lang === "en" ? "Updated" : "actualizada"
        } - Vixis Studio`
      : `${T.invoiceRef} #${invoice.invoice_number} - Vixis Studio`;

    // Generar HTML de la factura (estilo Nutrition Facts)
    // El formato de moneda siempre es "$600.00" (en-US): el es-ES con USD
    // produce "600,00 US$" que los clientes de correo rompen en "U" / "S$".
    const formatPrice = (amount: number, currency: string) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency === "USD" ? "USD" : "COP",
        minimumFractionDigits: currency === "USD" ? 2 : 0,
      }).format(amount);
    };

    // Calcular ancho dinámico del contenedor basado en el precio total
    const calculateInvoiceWidth = (priceString: string): number => {
      const baseWidth = 270; // ancho normal
      const priceLength = priceString.length;
      if (priceLength <= 10) return baseWidth; // valores cortos, no expandir
      const charWidth = 10;
      const calculatedWidth = baseWidth + (priceLength * charWidth) + 30; // +padding/márgenes
      return Math.min(Math.max(calculatedWidth, baseWidth), 600);
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
    const payLink = rawPayLink ? rawPayLink : `https://vixis.dev/pay/${invoice.id}`;

    // Detectar si se está usando el link por defecto (dLocal) o uno personalizado
    const isDefaultPayLink = !rawPayLink || rawPayLink === `https://vixis.dev/pay/${invoice.id}`;

    // Enlaces de acceso al producto (configurados en el Admin Panel):
    // para el checkout se copian desde access_links al crear la factura, así
    // que ya viajan dentro de custom_fields.delivery_links. El botón lleva
    // directo a cada enlace de acceso: el acceso ocurre en el email, sin
    // páginas intermedias.
    const accessLinks = Array.isArray(invoice.custom_fields?.delivery_links)
      ? invoice.custom_fields.delivery_links.filter(
          (l: unknown) => typeof l === "string" && l.trim().length > 0
        )
      : [];

    // Acción de confirmación de pago: UN SOLO botón que lleva al acceso del
    // producto. En HTML de email un enlace solo apunta a una URL y no hay
    // JavaScript, así que el botón abre el primer enlace de acceso. Si el
    // Admin Panel configuró varios accesos, los restantes se muestran como
    // enlaces de texto discretos debajo del botón (todos directamente en el
    // correo, sin páginas intermedias).
    let confirmationAction = "";
    if (is_payment_confirmation) {
      if (accessLinks.length > 0) {
        const primaryHref = accessLinks[0];
        const extraLinks = accessLinks.slice(1);
        const extraHTML = extraLinks.length
          ? `<br>${extraLinks
              .map(
                (l: string, idx: number) =>
                  `<a href="${l}" target="_blank" rel="noopener noreferrer" style="font-size:0.65rem; color:#1550b1; text-decoration:underline;">${T.linkLabel} ${idx + 2}</a>`
              )
              .join("&nbsp;&nbsp;·&nbsp;&nbsp;")}`
          : "";
        confirmationAction = `
          <a
            href="${primaryHref}"
            target="_blank"
            rel="noopener noreferrer"
            style="padding:10px 20px; background-color:#0d0d0d; color:#03fff6 !important; text-decoration:none; border-radius:4px; font-weight:700; display:inline-block;"
          >
            ${T.getProduct}
          </a>${extraHTML}`;
      } else {
        confirmationAction = `<span style="padding:10px 20px; background-color:#0d0d0d; color:#03fff6 !important; border-radius:4px; font-weight:700; display:inline-block;">${T.getProduct}</span>`;
      }
    }

    const productLanguage = invoice.custom_fields?.product_language as string | undefined;
    const productTitle = invoice.products
      ? getProductTitle(invoice.products as any, productLanguage)
      : '';

    // Diviseries con estilos inline: Gmail ignora las clases <style>, así que
    // se usan estilos en línea para que SIEMPRE se vean las líneas separadoras
    // y los recuadros negros del diseño "Nutrition Facts".
    const dividerRow = () =>
      `<tr><td colspan="2" style="padding:0; margin:0;"><div style="border-bottom:1px solid #888989; height:1px; line-height:0; font-size:0; margin:4px 0;">&nbsp;</div></td></tr>`;

    const invoiceHTML = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${T.invoiceRef} #${invoice.invoice_number}</title>
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700,800" rel="stylesheet">
</head>
<body style="margin:0; padding:20px; font-family:'Open Sans', Arial, sans-serif; background-color:#f5f5f5;">
  <div style="border:2px solid #000; width:${invoiceWidth}px; min-width:270px; margin:20px auto; padding:0 7px; background:#fff; word-wrap:break-word; overflow-wrap:break-word; overflow:hidden;">
    <table style="width:100%; border-collapse:collapse; margin:0; padding:0; table-layout:fixed;">
      <tr>
        <td colspan="2" style="padding:4px 0; text-align:center;">
          <h1 style="margin:4px 0; letter-spacing:0.15px; font-weight:800; font-size:1.2em; text-align:center;">${T.invoiceRef} #${invoice.invoice_number}</h1>
        </td>
      </tr>
      ${dividerRow()}
      <tr>
        <td style="padding:4px 0; vertical-align:middle;">
            <a href="https://vixis.dev/studio" target="_blank" rel="noopener noreferrer" style="text-decoration:none; display:inline-block; vertical-align:bottom;">
              <img
                src="https://cdn.vixis.dev/Vixis+Studio+-+Small+Logo.webp"
                alt="Vixis Studio"
                style="height:20px; border-radius:4px; display:inline-block; vertical-align:bottom;"
              >
            </a>
            <span style="font-size:0.9em; font-weight:800; margin-left:6px; display:inline-block; vertical-align:middle;">Vixis Studio</span>
        </td>
        <td style="text-align:right; font-size:0.9em; font-weight:400; padding:4px 0; vertical-align:bottom; word-wrap:break-word; overflow-wrap:break-word;">${productTitle}</td>
      </tr>
      ${dividerRow()}
      <tr>
        <td style="padding:4px 0;">
          <span style="font-weight:800;">${invoice.user_name}</span>
        </td>
        <td style="text-align:right; padding:4px 0;">
          <span style="font-weight:800;">${invoice.request_type}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div style="background-color:#000; height:10px; line-height:0; font-size:0; margin:4px 0;">&nbsp;</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:4px 0; word-wrap:break-word; overflow-wrap:break-word;">
          <div style="font-size:0.85rem; font-weight:800;">${T.amountLabel}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0; width:40%;">
          <span style="font-size:1.5em; font-weight:800;">${T.totalLabel}</span>
        </td>
        <td style="text-align:right; padding:4px 0; width:60%; white-space:nowrap;">
          <span style="font-size:${priceFontSize}; font-weight:700; line-height:1.1; white-space:wrap;">${formatPrice(invoice.amount, invoice.currency)}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div style="background-color:#000; height:5px; line-height:0; font-size:0; margin:4px 0;">&nbsp;</div>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0; border-bottom:1px solid #888989;">
          <span style="font-size:0.85rem; font-weight:800;">${T.deliveryLabel}</span>
        </td>
        <td style="text-align:right; padding:4px 0; border-bottom:1px solid #888989; word-wrap:break-word; overflow-wrap:break-word;">
          <span style="font-size:0.85rem;">${invoice.delivery_time}</span>
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
                    const percentage = feature.percentage;
                    priceDisplay = percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
                  } else if (feature.price !== undefined && feature.price !== null) {
                    priceDisplay = formatPrice(feature.price || 0, feature.currency || invoice.currency || "USD");
                  } else {
                    priceDisplay = formatPrice(0, feature.currency || invoice.currency || "USD");
                  }

                  // Renderizar subfeatures de este feature
                  const subfeaturesHTML = feature.subfeatures && Array.isArray(feature.subfeatures) && feature.subfeatures.length > 0
                    ? feature.subfeatures.map((subfeature: any) => {
                        let subPriceDisplay = "";
                        if (subfeature.type === "percentage" && subfeature.percentage !== undefined && subfeature.percentage !== null) {
                          const percentage = subfeature.percentage;
                          subPriceDisplay = percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
                        } else if (subfeature.price !== undefined && subfeature.price !== null) {
                          subPriceDisplay = formatPrice(subfeature.price || 0, subfeature.currency || invoice.currency || "USD");
                        } else {
                          subPriceDisplay = formatPrice(0, subfeature.currency || invoice.currency || "USD");
                        }
                        return `
      <tr>
        <td style="padding:2px 0 2px 16px;">
          <span style="font-size:0.7rem; font-weight:600;">${subfeature.name || "Subfeature"}</span>
        </td>
        <td style="text-align:right; padding:2px 0;">
          <span style="font-size:0.7rem;">${subPriceDisplay}</span>
        </td>
      </tr>
      `;
                      }).join("")
                    : "";

                  return `
      ${dividerRow()}
      <tr>
        <td style="padding:4px 0;">
          <span style="font-size:0.85rem; font-weight:800;">${feature.name || "Feature"}</span>
        </td>
        <td style="text-align:right; padding:4px 0; word-wrap:break-word; overflow-wrap:break-word;">
          <span style="font-size:0.85rem;">${priceDisplay}</span>
        </td>
      </tr>
      ${subfeaturesHTML}
      `;
                }
              )
              .join("")
          : ""
      }
      <tr>
        <td colspan="2">
          <div style="background-color:#000; height:10px; line-height:0; font-size:0; margin:4px 0;">&nbsp;</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:center; padding:10px 0;">
          ${
            is_payment_confirmation
              ? confirmationAction
              : `
          <a
            href="${payLink}"
            target="_blank"
            rel="noopener noreferrer"
            style="padding:10px 20px; background-color:#0d0d0d; color:#03fff6 !important; text-decoration:none; border-radius:4px; font-weight:700; display:inline-block;"
          >
            ${T.payNow}
          </a>`
          }
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div style="background-color:#000; height:5px; line-height:0; font-size:0; margin:4px 0;">&nbsp;</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:0.6rem; padding:5px 0 5px 8px; text-indent:-8px;">
          ${
            is_payment_confirmation
              ? `${T.paymentReceived}<br>${T.productRef} #${invoice.product_id.substring(0, 8)} - ${T.invoiceRef} #${invoice.invoice_number} - Vixis`
              : isDefaultPayLink
              ? `${T.orderIdAuto}<br>${T.productRef} #${invoice.product_id.substring(0, 8)} - ${T.invoiceRef} #${invoice.invoice_number} - Vixis`
              : `${T.paymentNote}<br>${T.productRef} #${invoice.product_id.substring(0, 8)} - ${T.invoiceRef} #${invoice.invoice_number} - Vixis`
          }
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
            subject,
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
                subject,
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
            subject,
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