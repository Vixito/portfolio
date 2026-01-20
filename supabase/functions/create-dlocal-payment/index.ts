import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Función helper para calcular HMAC-SHA256
async function calculateHmacSha256(
  secret: string,
  message: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  // Convertir ArrayBuffer a hex string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const dlocalTransKey = Deno.env.get("DLOCAL_X_TRANS_KEY")!;
    const dlocalSecretKey = Deno.env.get("DLOCAL_SECRET_KEY")!;
    const dlocalSandbox = Deno.env.get("DLOCAL_SANDBOX") === "true";

    const {
      invoice_id,
      invoice_number,
      amount,
      currency,
      country,
      payer_email,
      payer_name,
      payer_document,
      product_id,
    } = await req.json();

    if (!invoice_id && !invoice_number) {
      return new Response(
        JSON.stringify({
          error: "invoice_id or invoice_number is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!amount || !currency || !country) {
      return new Response(
        JSON.stringify({
          error: "amount, currency, and country are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let invoiceQuery = supabase.from("invoices").select("id, invoice_number, product_id");

    if (invoice_id) {
      invoiceQuery = invoiceQuery.eq("id", invoice_id);
    } else {
      invoiceQuery = invoiceQuery.eq("invoice_number", invoice_number);
    }

    const { data: invoice, error: invoiceError } = await invoiceQuery.single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construir el order_id con el formato requerido
    const productIdShort = (product_id || invoice.product_id || "").substring(0, 8);
    const invoiceNum = invoice.invoice_number;
    const orderId = `Product #${productIdShort} - Invoice #${invoiceNum} - Vixis`;

    // Construir la descripción
    const description = `Payment for Invoice #${invoiceNum}`;

    // Construir el body del pago para dLocal
    const paymentBody = {
      amount: amount,
      currency: currency,
      country: country,
      payment_method_id: "CARD", // Por defecto tarjeta, puede cambiarse según el método
      payment_method_flow: "DIRECT",
      payer: {
        name: payer_name || "Customer",
        email: payer_email || "",
        document: payer_document || "",
        user_reference: invoice.id,
      },
      order_id: orderId, // Aquí va el formato completo con Invoice ID
      description: description,
      notification_url: `${supabaseUrl}/functions/v1/dlocal-webhook`,
    };

    // Generar firma para dLocal
    const bodyJson = JSON.stringify(paymentBody);
    const xDate = new Date().toISOString();
    const signatureString = dlocalLogin + xDate + bodyJson;
    const signatureHex = await calculateHmacSha256(
      dlocalSecretKey,
      signatureString
    );

    // Endpoint de dLocal
    const dlocalEndpoint = dlocalSandbox
      ? "https://sandbox.dlocal.com/payments"
      : "https://api.dlocal.com/payments";

    // Hacer la petición a dLocal
    const dlocalResponse = await fetch(dlocalEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Date": xDate,
        "X-Login": dlocalLogin,
        "X-Trans-Key": dlocalTransKey,
        "X-Version": "2.1",
        "User-Agent": "Vixis-Portfolio/1.0",
        "Authorization": `V2-HMAC-SHA256, Signature: ${signatureHex}`,
      },
      body: bodyJson,
    });

    const dlocalData = await dlocalResponse.json();

    if (!dlocalResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to create payment in dLocal",
          details: dlocalData,
        }),
        {
          status: dlocalResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retornar la respuesta de dLocal (incluye redirect_url si es necesario)
    return new Response(
      JSON.stringify({
        success: true,
        payment: dlocalData,
        redirect_url: dlocalData.redirect_url, // Para checkout redirect
        status: dlocalData.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en create-dlocal-payment:", error);
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
