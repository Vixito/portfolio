// Beacon público de visitantes del portfolio (sin auth).
// El sitio envía { session_id, page, referrer }; el server añade IP + user-agent.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// IP real detrás de Cloudflare/Traefik.
const getClientIp = (req: Request): string => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
};

const DENY_TARGETS = ["admin", "login"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const page = String(payload?.page || "").slice(0, 200);
  if (!page || page === "/track-visitor") {
    return json(200, { ok: true, skipped: "sin página" });
  }
  // No registrar el propio admin.
  if (DENY_TARGETS.some((t) => page.startsWith(`/${t}`)) || (payload?.host || "").includes("admin.")) {
    return json(200, { ok: true, skipped: "admin" });
  }

  const ip = getClientIp(req);
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);
  let session_id = String(payload?.session_id || "").slice(0, 120);
  if (!session_id) {
    // Fallback anónimo basado en IP (si el cliente no manda session_id).
    session_id = `ip:${ip}`;
  }
  const referrer = String(payload?.referrer || "").slice(0, 300) || null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Dedupe: la misma sesión + misma página + mismo día.
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: existing } = await supabase
      .from("portfolio_visitors")
      .select("id")
      .eq("session_id", session_id)
      .eq("page", page)
      .gte("created_at", startOfDay.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return json(200, { ok: true, deduped: true });
    }

    const { error } = await supabase.from("portfolio_visitors").insert({
      session_id,
      page,
      referrer,
      user_agent: ua,
      ip,
    });
    if (error) {
      console.error("track-visitor error:", error);
      return json(500, { error: error.message });
    }
    return json(200, { ok: true });
  } catch (err) {
    console.error("track-visitor error:", err);
    return json(500, {
      error: err instanceof Error ? err.message : "Error desconocido",
    });
  }
});