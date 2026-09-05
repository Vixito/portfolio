import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
} from "../_shared/checkout.ts";

// Expone SOLO el client_id de PayPal (es público por diseño del SDK).
// El secret nunca sale de la Edge Function.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }

  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  if (!clientId) {
    return jsonCheckoutResponse(500, {
      error: "PAYPAL_CLIENT_ID no está configurado",
    });
  }

  return jsonCheckoutResponse(200, {
    client_id: clientId,
    currency: "USD",
    sandbox: Deno.env.get("PAYPAL_SANDBOX") === "true",
  });
});