import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  getCheckoutInvoiceWithProduct,
  deliverCheckoutOrder,
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
    throw new Error(`No se pudo autenticar con PayPal (${res.status})`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// Captura una orden PayPal que el comprador ya aprobó
async function capturePayPalOrder(
  accessToken: string,
  sandbox: boolean,
  orderId: string
): Promise<any> {
  const baseUrl = sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al capturar la orden de PayPal (${res.status}): ${text}`);
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

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_SECRET_KEY");
    const paypalSandbox = Deno.env.get("PAYPAL_SANDBOX") === "true";

    const { paypal_order_id, invoice_id } = await req.json();

    if (!paypal_order_id) {
      return jsonCheckoutResponse(400, { error: "paypal_order_id es requerido" });
    }
    if (!paypalClientId || !paypalClientSecret) {
      return jsonCheckoutResponse(500, {
        error: "PayPal no está configurado (PAYPAL_CLIENT_ID / PAYPAL_SECRET_KEY)",
      });
    }

    let invoice: any = null;
    if (invoice_id) {
      invoice = await getCheckoutInvoiceWithProduct(supabase, invoice_id);
    }

    // Idempotencia: si la factura ya está pagada, devolver la entrega
    if (
      invoice &&
      (invoice.status === "paid" || invoice.status === "completed")
    ) {
      return jsonCheckoutResponse(200, {
        success: true,
        already_processed: true,
        ...(await deliverCheckoutOrder(supabase, {
          invoice,
          gateway: "paypal",
          transactionId: invoice.transaction_id,
          paidAt: invoice.paid_at,
        }) as Record<string, unknown>),
      });
    }

    // Capturar la orden solo con credenciales server-side
    const accessToken = await getPayPalAccessToken(
      paypalClientId,
      paypalClientSecret,
      paypalSandbox
    );
    const captureResult = await capturePayPalOrder(
      accessToken,
      paypalSandbox,
      paypal_order_id
    );

    const capture = Array.isArray(captureResult.purchase_units)
      ? captureResult.purchase_units[0]?.payments?.captures?.[0]
      : null;

    if (!capture || capture.status !== "COMPLETED") {
      return jsonCheckoutResponse(400, {
        error: "El pago de PayPal no fue completado",
        status: capture?.status || captureResult.status,
      });
    }

    // Si no tenemos factura (fallback), buscarla por custom_id/order id
    if (!invoice) {
      invoice = await getCheckoutInvoiceWithProduct(
        supabase,
        captureResult.purchase_units?.[0]?.reference_id ||
          captureResult.purchase_units?.[0]?.custom_id
      );
    }

    if (!invoice) {
      return jsonCheckoutResponse(404, { error: "Factura no encontrada" });
    }

    const delivery = await deliverCheckoutOrder(supabase, {
      invoice,
      gateway: "paypal",
      transactionId: capture.id,
      paidAt: capture.create_time || new Date().toISOString(),
    });

    return jsonCheckoutResponse(200, {
      success: true,
      ...(delivery as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Error en capture-paypal-order:", error);
    return jsonCheckoutResponse(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});