import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
} from "../_shared/checkout.ts";

// Config pública para el Transparent Checkout (SmartFields).
// NUNCA expone la Secret Key; solo la SmartFields API Key (es publishable,
// pensada para usarse en el frontend).
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  try {
    const sandbox = Deno.env.get("DLOCALGO_SANDBOX") === "true";
    const smartfieldsApiKey = sandbox
      ? Deno.env.get("DLOCALGO_SANDBOX_SF_API_KEY")
      : Deno.env.get("DLOCALGO_SF_API_KEY");

    return jsonCheckoutResponse(200, {
      sandbox,
      smartfields_api_key: smartfieldsApiKey || null,
      sdk_url: sandbox
        ? "https://checkout-sbx.dlocalgo.com/js/dlocalgo-smartfields-bundled.js"
        : "https://checkout.dlocalgo.com/js/dlocalgo-smartfields-bundled.js",
    });
  } catch (error) {
    console.error("get-dlocalgo-config error:", error);
    return jsonCheckoutResponse(500, {
      error:
        error instanceof Error ? error.message : "Error interno inesperado",
    });
  }
});