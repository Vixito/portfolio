import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const b64url = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const base64ToBytes = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/\s+/g, "")), (c) => c.charCodeAt(0));

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

// Token OAuth2 a partir del JSON de la cuenta de servicio (JWT RS256 → token exchange).
const getAccessToken = async (sa: ServiceAccount): Promise<string> => {
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);

  const enc = (o: object) =>
    b64url(new TextEncoder().encode(JSON.stringify(o)));
  const header = enc({ alg: "RS256", typ: "JWT" });
  const claims = enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  });
  const input = `${header}.${claims}`;

  const pem = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    base64ToBytes(pem).buffer as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(input)
  );
  const jwt = `${input}.${b64url(sig)}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OAuth token ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.access_token as string;
};

const runReport = async (
  propertyId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<any[]> => {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "viewsPerSession" },
        ],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GA4 Data API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.rows || [];
};

// Últimos n días (UUUCI) con fechas inclusive (YYYY-MM-DD).
const lastNDays = (n: number): { startDate: string; endDate: string } => {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (n - 1) * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const adminUser = await verifyAdminToken(req);
  if (!adminUser) {
    return json(401, { error: "Unauthorized" });
  }

  const startedAt = new Date().toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const log = async (status: string, detail: string | null) => {
    await supabase.from("bos_sync_logs").insert({
      source: "ga4",
      status,
      detail,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
  };

  try {
    const saJson = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON");
    const propertyId = Deno.env.get("GA4_PROPERTY_ID");

    if (!saJson || !propertyId) {
      await log("skipped", "Faltan GA4_SERVICE_ACCOUNT_JSON o GA4_PROPERTY_ID");
      return json(200, {
        synced: false,
        reason: "GA4 no está configurado (secrets)",
      });
    }

    let sa: ServiceAccount;
    try {
      sa = JSON.parse(saJson);
    } catch {
      await log("skipped", "GA4_SERVICE_ACCOUNT_JSON no es JSON válido");
      return json(200, { synced: false, reason: "GA4_SERVICE_ACCOUNT_JSON inválido" });
    }

    const accessToken = await getAccessToken(sa);
    const { startDate, endDate } = lastNDays(30);
    const rows = await runReport(propertyId, accessToken, startDate, endDate);

    const toNum = (v: string | undefined, fallback = 0): number =>
      v != null && v !== "" ? Number(v) : fallback;

    const days = rows.map((r: any) => ({
      source: "ga4",
      date: r.dimensionValues?.[0]?.value,
      metrics: {
        visits: toNum(r.metricValues?.[0]?.value),
        uniques: toNum(r.metricValues?.[1]?.value),
        pageviews: toNum(r.metricValues?.[2]?.value),
        views_per_visit: toNum(r.metricValues?.[5]?.value, NaN),
        visit_duration: toNum(r.metricValues?.[4]?.value, NaN),
        bounce_rate: toNum(r.metricValues?.[3]?.value, NaN),
      },
    }));

    if (days.some((d: any) => !d.date)) {
      await log("error", "GA4 devolvió filas sin fecha");
      return json(502, { error: "GA4 devolvió filas sin fecha" });
    }

    if (days.length > 0) {
      const { error } = await supabase
        .from("bos_analytics_daily")
        .upsert(days, { onConflict: "source,date" });
      if (error) {
        await log("error", `upsert analytics: ${error.message}`);
        return json(500, { error: `No se pudo guardar analytics: ${error.message}` });
      }
    }

    await supabase
      .from("bos_connectors")
      .upsert(
        {
          source: "ga4",
          name: "Google Analytics 4",
          enabled: true,
          config: { kind: "analytics", property_id: propertyId },
          last_sync_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: "source" }
      );

    await log("ok", `${days.length} días sincronizados`);

    return json(200, { synced: true, days: days.length });
  } catch (err) {
    console.error("sync-ga4 error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    try {
      await supabase
        .from("bos_sync_logs")
        .insert({
          source: "ga4",
          status: "error",
          detail,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
        });
    } catch {
      // sin DB disponible; nada que hacer
    }
    try {
      await supabase
        .from("bos_connectors")
        .update({ last_error: detail.slice(0, 300), last_sync_at: null })
        .eq("source", "ga4");
    } catch {
      // sin DB disponible; nada que hacer
    }
    return json(500, { error: detail });
  }
});