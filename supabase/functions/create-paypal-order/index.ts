import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  resolveCheckoutProduct,
  getCheckoutPriceUsd,
  createCheckoutInvoice,
} from "../_shared/checkout.ts";

// Obtiene el access token de PayPal (OAuth 2.0 client credentials)
async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  sandbox: boolean
): Promise<string> {
  const baseUrl = sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo autenticar con PayPal (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// Crea una orden PayPal compatible con donation/checkout del portfolio
async function createPayPalOrder(
  accessToken: string,
  sandbox: boolean,
  amount: number,
  currency: string,
  reference: string,
  description: string,
  brandName: string,
  cancelUrl: string
): Promise<{ id: string }> {
  const baseUrl = sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: reference,
        description,
        custom_id: reference,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: brandName,
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING",
      return_url: cancelUrl,
      cancel_url: cancelUrl,
    },
  };

  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al crear la orden de PayPal (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { id: data.id as string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_SECRET_KEY");
    const paypalSandbox = Deno.env.get("PAYPAL_SANDBOX") === "true";

    const { product_id, user_name, user_email, delivery_time, success_url } =
      await req.json();

    if (!product_id) {
      return jsonCheckoutResponse(400, { error: "product_id es requerido" });
    }
    if (!paypalClientId || !paypalClientSecret) {
      return jsonCheckoutResponse(500, {
        error: "PayPal no está configurado (PAYPAL_CLIENT_ID / PAYPAL_SECRET_KEY)",
      });
    }

    const product = await resolveCheckoutProduct(supabase, product_id);
    if (!product) {
      return jsonCheckoutResponse(404, { error: "Producto no encontrado" });
    }

    const settings = product.checkout_settings || {};
    const gateways = settings.gateways || ["paypal", "nowpayments"];
    if (gateways.includes("paypal") === false) {
      return jsonCheckoutResponse(400, {
        error: "PayPal no está habilitado para este producto",
      });
    }

    const amount = getCheckoutPriceUsd(product);
    if (amount === null || amount <= 0) {
      return jsonCheckoutResponse(400, {
        error: "El producto no tiene un precio válido",
      });
    }

    const buyerName = (user_name || "").trim();
    const buyerEmail = (user_email || "").trim();
    if (!buyerName || !buyerEmail) {
      return jsonCheckoutResponse(400, {
        error: "user_name y user_email son requeridos",
      });
    }

    // Crear la factura local (pending) antes de crear la orden de PayPal
    const invoice = await createCheckoutInvoice(supabase, {
      product,
      amount,
      user_name: buyerName,
      user_email: buyerEmail,
      gateway: "paypal",
      delivery_time,
      extra_custom_fields: {},
    });

    const productTitle =
      product.title_translations?.es || product.title || "Producto";

    const cancelUrl =
      typeof success_url === "string" && success_url
        ? success_url
        : `https://vixis.dev/store/${product.public_id || product.id}`;

    let order: { id: string };
    try {
      const accessToken = await getPayPalAccessToken(
        paypalClientId,
        paypalClientSecret,
        paypalSandbox
      );
      order = await createPayPalOrder(
        accessToken,
        paypalSandbox,
        amount,
        "USD",
        invoice.id,
        productTitle,
        "Vixis Studio",
        cancelUrl
      );
    } catch (createError) {
      // Si falla PayPal, cancelar la factura local para no dejar basura
      try {
        await supabase
          .from("invoices")
          .update({ status: "cancelled" })
          .eq("id", invoice.id);
      } catch {
        // Ignorar errores al cancelar
      }
      throw createError;
    }

    // Guardar el order_id de PayPal en custom_fields
    const customFields = {
      ...(invoice.custom_fields as Record<string, unknown>),
      paypal_order_id: order.id,
    };
    try {
      await supabase
        .from("invoices")
        .update({ custom_fields: customFields })
        .eq("id", invoice.id);
    } catch {
      // Ignorar errores al guardar el order_id (no bloquea el checkout)
    }

    return jsonCheckoutResponse(200, {
      success: true,
      paypal_order_id: order.id,
      invoice_id: invoice.id,
      amount,
      currency: "USD",
      product: {
        title: productTitle,
        thumbnail_url: product.thumbnail_url,
      },
    });
  } catch (error) {
    console.error("Error en create-paypal-order:", error);
    return jsonCheckoutResponse(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});