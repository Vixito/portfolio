import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  resolveCheckoutProduct,
  getCheckoutPriceUsd,
  createCheckoutInvoice,
  getNowPaymentsEnv,
} from "../_shared/checkout.ts";

// Crea una invoice de NowPayments (hosted checkout)
async function createNowPaymentsInvoice(params: {
  apiKey: string;
  sandbox: boolean;
  priceAmount: number;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: number; invoice_url: string }> {
  const baseUrl = params.sandbox
    ? "https://api.sandbox.nowpayments.io"
    : "https://api.nowpayments.io";

  const body: Record<string, unknown> = {
    price_amount: params.priceAmount,
    price_currency: "usd",
    order_id: params.orderId,
    order_description: params.orderDescription,
    ipn_callback_url: params.ipnCallbackUrl,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    is_fixed_rate: true,
    is_fee_paid_by_user: true,
  };

  // En sandbox NowPayments emula flujos reales sin dinero:
  // el parámetro "case" decide qué estado simular (finished = pago completado).
  if (params.sandbox) {
    body.case = "finished";
  }

  const res = await fetch(`${baseUrl}/v1/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Error al crear la invoice de NowPayments (${res.status}): ${text}`
    );
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sandbox: nowPaymentsSandbox, apiKey: nowPaymentsApiKey } = getNowPaymentsEnv();

    const {
      product_id,
      user_name,
      user_email,
      delivery_time,
      success_url,
      cancel_url,
    } = await req.json();

    if (!product_id) {
      return jsonCheckoutResponse(400, { error: "product_id es requerido" });
    }
    if (!nowPaymentsApiKey) {
      return jsonCheckoutResponse(500, {
        error:
          "NowPayments no está configurado (NOWPAYMENTS_API_KEY / NOWPAYMENTS_SANDBOX_API_KEY)",
      });
    }

    const product = await resolveCheckoutProduct(supabase, product_id);
    if (!product) {
      return jsonCheckoutResponse(404, { error: "Producto no encontrado" });
    }

    const settings = product.checkout_settings || {};
    const gateways = settings.gateways || ["paypal", "nowpayments"];
    if (gateways.includes("nowpayments") === false) {
      return jsonCheckoutResponse(400, {
        error: "Criptomonedas no está habilitado para este producto",
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
    if (!buyerName && !buyerEmail) {
      return jsonCheckoutResponse(400, {
        error: "user_name o user_email son requeridos",
      });
    }

    // Crear la factura local (pending) antes de la invoice de NowPayments
    const invoice = await createCheckoutInvoice(supabase, {
      product,
      amount,
      user_name: buyerName,
      user_email: buyerEmail,
      gateway: "nowpayments",
      delivery_time,
      extra_custom_fields: {},
    });

    const productPublicId = product.public_id || product.id;
    const productTitle =
      product.title_translations?.es || product.title || "Producto";

    // Inyectar el id de la factura local en la success_url para poder
    // reanudar el polling cuando NowPayments redirige al comprador.
    const fallbackSuccess = `https://vixis.dev/checkout/${productPublicId}?invoice_id={INVOICE_ID}&gateway=nowpayments`;
    const defaultSuccessUrl = (success_url || fallbackSuccess).replace(
      "{INVOICE_ID}",
      invoice.id
    );
    const defaultCancelUrl = cancel_url || `https://vixis.dev/store/${productPublicId}`;

    const npInvoice = await createNowPaymentsInvoice({
      apiKey: nowPaymentsApiKey,
      sandbox: nowPaymentsSandbox,
      priceAmount: amount,
      orderId: invoice.id,
      orderDescription: productTitle,
      ipnCallbackUrl: `${supabaseUrl}/functions/v1/nowpayments-webhook`,
      successUrl: defaultSuccessUrl,
      cancelUrl: defaultCancelUrl,
    });

    // Guardar invoice_id de NowPayments en custom_fields
    const customFields = {
      ...(invoice.custom_fields as Record<string, unknown>),
      np_invoice_id: npInvoice.id,
    };
    try {
      await supabase
        .from("invoices")
        .update({ custom_fields: customFields })
        .eq("id", invoice.id);
    } catch {
      // Ignorar errores al guardar np_invoice_id (no bloquea el checkout)
    }

    return jsonCheckoutResponse(200, {
      success: true,
      invoice_url: npInvoice.invoice_url,
      np_invoice_id: npInvoice.id,
      invoice_id: invoice.id,
      amount,
      currency: "USD",
      product: {
        title: productTitle,
        thumbnail_url: product.thumbnail_url,
      },
    });
  } catch (error) {
    console.error("Error en create-nowpayments-invoice:", error);
    return jsonCheckoutResponse(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});