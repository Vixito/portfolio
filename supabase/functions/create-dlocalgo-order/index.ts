import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  resolveCheckoutProduct,
  getCheckoutPriceUsd,
  createCheckoutInvoice,
  getDLocalGoEnv,
} from "../_shared/checkout.ts";

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

    const {
      product_id,
      user_name,
      user_email,
      product_language,
      success_url,
      country,
      client_document_type,
      client_document,
    } = await req.json();

    if (!product_id) {
      return jsonCheckoutResponse(400, { error: "product_id es requerido" });
    }
    const userName = String(user_name || "").trim();
    const userEmail = String(user_email || "").trim();
    if (!userName || !userEmail) {
      return jsonCheckoutResponse(400, {
        error: "user_name y user_email son requeridos",
      });
    }
    // dLocal Go (Transparent Checkout) requiere el país del pagador.
    const payerCountry = String(country || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(payerCountry)) {
      return jsonCheckoutResponse(400, {
        error: "El país es requerido para el pago con tarjeta",
      });
    }
    const payerDocument = String(client_document || "").trim();
    const payerDocumentType = String(client_document_type || "").trim();

    const product = await resolveCheckoutProduct(supabase, product_id);
    if (!product) {
      return jsonCheckoutResponse(404, { error: "Producto no encontrado" });
    }

    const gateways =
      product.checkout_settings?.gateways || ["paypal", "nowpayments"];
    const cardOk =
      gateways.includes("dlocalgo") || gateways.includes("paypal");
    if (!cardOk) {
      return jsonCheckoutResponse(400, {
        error: "Pago con tarjeta no habilitado para este producto",
      });
    }

    const amount = getCheckoutPriceUsd(product);
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      return jsonCheckoutResponse(400, {
        error: "El producto no tiene precio definido",
      });
    }

    const lang = product_language === "en" ? "en" : "es";

    const invoice = await createCheckoutInvoice(supabase, {
      product,
      amount,
      user_name: userName,
      user_email: userEmail,
      gateway: "dlocalgo",
      extra_custom_fields: { product_language: lang },
    });

    const storeUrl = success_url && String(success_url).trim()
      ? String(success_url).trim()
      : `https://vixis.dev/store/${product.public_id || product.id}`;

    const successUrl = new URL(storeUrl);
    successUrl.searchParams.set("invoice_id", invoice.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const dlocalBody: Record<string, unknown> = {
      currency: "USD",
      amount,
      order_id: invoice.id,
      description: `Vixis Store - #${invoice.invoice_number}`.slice(0, 100),
      country: payerCountry,
      payer: {
        id: invoice.id,
        name: userName.slice(0, 100),
        email: userEmail.slice(0, 100),
        document: payerDocument || undefined,
        document_type: payerDocumentType || undefined,
      },
      success_url: successUrl.toString(),
      back_url: storeUrl,
      notification_url: `${supabaseUrl}/functions/v1/dlocalgo-webhook`,
      expiration_type: "DAYS",
      expiration_value: 3,
      // 3DS: el flag solo tiene efecto si está habilitado en el Dashboard
      // (Profitability → 3D Secure) para el país del pago.
      allow_3ds: true,
      // Transparent Checkout (SmartFields): se cobra el token y se confirma
      // con confirm-dlocalgo-order; el checkout hosteado sigue como fallback.
      allow_transparent: true,
    };

    let dlocalRes: Response;
    try {
      dlocalRes = await fetch(`${baseUrl}/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}:${secretKey}`,
        },
        body: JSON.stringify(dlocalBody),
      });
    } catch (networkErr) {
      await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
      console.error("Network error dLocal Go:", networkErr);
      return jsonCheckoutResponse(502, {
        error: "No se pudo contactar a dLocal, intenta de nuevo",
      });
    }

    const dlocalData = await dlocalRes.json().catch(() => ({}));

    if (!dlocalRes.ok) {
      await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
      console.error(
        `dLocal Go error ${dlocalRes.status}:`,
        JSON.stringify(dlocalData)
      );
      return jsonCheckoutResponse(
        dlocalRes.status >= 500 ? 502 : 400,
        {
          error:
            (dlocalData as any)?.error?.message ||
            "dLocal rechazó el pago, intenta de nuevo",
          details: dlocalData,
        }
      );
    }

    const paymentId = (dlocalData as any)?.id;
    const redirectUrl = (dlocalData as any)?.redirect_url;
    const checkoutToken = (dlocalData as any)?.merchant_checkout_token;

    if (!checkoutToken && !redirectUrl) {
      await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
      console.error("dLocal Go respuesta sin token ni redirect:", dlocalData);
      return jsonCheckoutResponse(502, {
        error: "dLocal no devolvió un medio de pago",
      });
    }

    await supabase
      .from("invoices")
      .update({
        custom_fields: {
          ...(invoice.custom_fields || {}),
          dlocalgo_payment_id: paymentId || null,
          dlocalgo_redirect_url: redirectUrl || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    return jsonCheckoutResponse(200, {
      success: true,
      redirect_url: redirectUrl || null,
      merchant_checkout_token: checkoutToken || null,
      invoice_id: invoice.id,
      status: (dlocalData as any)?.status || "PENDING",
      dlocalgo_payment_id: paymentId || null,
      amount,
      currency: "USD",
      product: {
        title: product.title,
        thumbnail_url: product.thumbnail_url,
      },
    });
  } catch (err) {
    console.error("create-dlocalgo-order error:", err);
    return jsonCheckoutResponse(500, {
      error:
        err instanceof Error ? err.message : "Error interno inesperado",
    });
  }
});