import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  getPayPalEnv,
} from "../_shared/checkout.ts";

// Expone SOLO el client_id de PayPal (es público por diseño del SDK).
// El secret nunca sale de la Edge Function.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  const { sandbox, clientId } = getPayPalEnv();
  if (!clientId) {
    return jsonCheckoutResponse(500, {
      error: "PayPal no está configurado (PAYPAL_CLIENT_ID / PAYPAL_SANDBOX_CLIENT_ID)",
    });
  }

  return jsonCheckoutResponse(200, {
    client_id: clientId,
    currency: "USD",
    sandbox,
  });
});