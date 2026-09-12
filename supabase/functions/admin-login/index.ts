import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createAdminToken,
  verifyPassword,
  getClientIp,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_FAILED_ATTEMPTS = 5; // máx 5 intentos fallidos por IP en 15 min

// Login del Admin Panel: valida credenciales server-side (nunca viven en el
// bundle del frontend), con rate limiting por IP y entrega un JWT de 24h.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ip = getClientIp(req);

  try {
    // Rate limiting: ¿cuántos intentos fallidos en la ventana?
    const { count, error: countError } = await supabase
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("succeeded", false)
      .gte("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());

    if (countError) {
      return json(500, { error: `Error al verificar intentos: ${countError.message}` });
    }
    if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
      return json(429, {
        error: "Demasiados intentos fallidos. Espera 15 minutos.",
      });
    }

    const expectedUser = Deno.env.get("ADMIN_USERNAME");
    const expectedHash = Deno.env.get("ADMIN_PASSWORD_HASH");
    if (!expectedUser || !expectedHash) {
      return json(500, {
        error: "Credenciales de admin no configuradas (ADMIN_USERNAME / ADMIN_PASSWORD_HASH)",
      });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: "JSON inválido" });
    }

    const { username, password } = payload ?? {};
    const valid =
      typeof username === "string" &&
      typeof password === "string" &&
      username === expectedUser &&
      (await verifyPassword(password, expectedHash));

    await supabase.from("admin_login_attempts").insert({
      ip,
      username: String(username ?? ""),
      succeeded: valid,
    });

    if (!valid) {
      return json(401, { error: "Usuario o contraseña incorrectos" });
    }

    const token = await createAdminToken(username);
    return json(200, {
      token,
      role: "admin",
      expires_in: 24 * 60 * 60,
    });
  } catch (error) {
    console.error("Error en admin-login:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});