// Beacon público de visitantes del portfolio (sin auth).
// El sitio envía { session_id, page, referrer }; el server añade IP + user-agent.
// Además registra "interesados": { type: "interest", source, name?, email?, phone?, topic? }
// que se guardan en bos_leads (form de /status, clics en whatsapp/email).
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

// País vía Cloudflare (best-effort, puede no venir).
const getCountry = (req: Request): string | null => {
  const c = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country");
  return c && c !== "XX" && c !== "T1" ? c.slice(0, 8) : null;
};

// Parser ligero de user-agent (sin dependencias).
const parseUa = (ua: string): { browser: string; os: string; device: string } => {
  const u = ua.toLowerCase();
  let browser = "—";
  if (u.includes("edg/")) browser = "Edge";
  else if (u.includes("opr/") || u.includes("opera")) browser = "Opera";
  else if (u.includes("firefox")) browser = "Firefox";
  else if (u.includes("chrome") && !u.includes("edg")) browser = "Chrome";
  else if (u.includes("safari") && !u.includes("chrome")) browser = "Safari";
  else if (u.includes("msie") || u.includes("trident")) browser = "IE";
  let os = "—";
  if (u.includes("windows")) os = "Windows";
  else if (u.includes("iphone") || u.includes("ipad")) os = "iOS";
  else if (u.includes("mac os")) os = "macOS";
  else if (u.includes("android")) os = "Android";
  else if (u.includes("linux")) os = "Linux";
  let device = "desktop";
  if (/ipad|tablet/i.test(ua)) device = "tablet";
  else if (/mobile|android|iphone/i.test(ua)) device = "mobile";
  return { browser, os, device };
};

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.slice(0, 200);
  } catch {
    return null;
  }
};

const utmOf = (url: string): Record<string, string | null> => {
  try {
    const q = new URL(url).searchParams;
    const g = (k: string) => q.get(k)?.slice(0, 120) || null;
    return { utm_source: g("utm_source"), utm_medium: g("utm_medium"), utm_campaign: g("utm_campaign") };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
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

  // No registrar el propio admin.
  if (DENY_TARGETS.some((t) => page.startsWith(`/${t}`)) || (payload?.host || "").includes("admin.")) {
    return json(200, { ok: true, skipped: "admin" });
  }

  // Rate limit por IP: anti-bots que inflan visitas o leads.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if (payload?.type === "interest") {
    const { count: leadsHour } = await supabase
      .from("bos_leads")
      .select("id", { count: "exact", head: true })
      .filter("payload->>ip", "eq", ip)
      .gte("created_at", hourAgo);
    if ((leadsHour || 0) >= 10) {
      return json(429, { error: "Demasiadas solicitudes. Inténtalo más tarde." });
    }
  } else {
    const { count: visitsHour } = await supabase
      .from("portfolio_visitors")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", hourAgo);
    if ((visitsHour || 0) >= 200) {
      return json(429, { error: "Demasiadas solicitudes. Inténtalo más tarde." });
    }
  }

  // ============ INTERESADOS (leads calientes) ============
  if (payload?.type === "interest") {
    const source = String(payload?.source || "").slice(0, 60);
    const allowed = ["status_form", "whatsapp_click", "email_click", "schedule_click"];
    if (!allowed.includes(source)) {
      return json(400, { error: "source no permitido" });
    }
    const name = String(payload?.name || "").slice(0, 200) || null;
    const email = String(payload?.email || "").slice(0, 200).toLowerCase() || null;
    const phone = String(payload?.phone || "").slice(0, 60) || null;
    const topic = String(payload?.topic || "").slice(0, 500) || null;
    const pageUrl = String(payload?.page_url || "").slice(0, 500) || null;
    const parsedUa = parseUa(ua);
    const utms = pageUrl ? utmOf(pageUrl) : { utm_source: null, utm_medium: null, utm_campaign: null };

    try {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      let dupQuery = supabase
        .from("bos_leads")
        .select("id")
        .eq("source", source)
        .gte("created_at", startOfDay.toISOString())
        .limit(1);
      dupQuery = email
        ? dupQuery.eq("email", email)
        : dupQuery.eq("session_id", session_id);
      const { data: dup } = await dupQuery;
      if (dup && dup.length > 0) {
        return json(200, { ok: true, deduped: true });
      }

      const { error } = await supabase.from("bos_leads").insert({
        source,
        name,
        email,
        phone,
        topic,
        session_id,
        page_url: pageUrl,
        referrer_domain: referrer ? hostOf(referrer) : null,
        country: getCountry(req),
        device: parsedUa.device,
        browser: parsedUa.browser,
        os: parsedUa.os,
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        payload: {
          page: page || null,
          referrer: referrer || null,
          ip,
          user_agent: ua,
        },
      });
      if (error) {
        console.error("track-visitor interest error:", error);
        return json(500, { error: error.message });
      }
      return json(200, { ok: true });
    } catch (err) {
      console.error("track-visitor interest error:", err);
      return json(500, {
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  // El beacon de visitas sí exige página.
  if (!page || page === "/track-visitor") {
    return json(200, { ok: true, skipped: "sin página" });
  }

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