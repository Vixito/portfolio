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

  try {
    const apiKey = Deno.env.get("PLAUSIBLE_API_KEY");
    const siteId = Deno.env.get("PLAUSIBLE_SITE_ID");

    const log = async (status: string, detail: string | null) => {
      await supabase.from("bos_sync_logs").insert({
        source: "plausible",
        status,
        detail,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      });
    };

    if (!apiKey || !siteId) {
      await log("skipped", "Faltan PLAUSIBLE_API_KEY o PLAUSIBLE_SITE_ID");
      return json(200, {
        synced: false,
        reason: "Plausible no está configurado (secrets)",
      });
    }

    // Stats API de Plausible: series diarias de los últimos 30 días.
    const url =
      `https://plausible.io/api/v1/stats/timeseries` +
      `?site_id=${encodeURIComponent(siteId)}` +
      `&period=30d` +
      `&metrics=visitors,pageviews,views_per_visit,visit_duration,bounce_rate` +
      `&date_grouping=day`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await log("error", `Plausible API ${res.status}: ${body.slice(0, 300)}`);
      await supabase
        .from("bos_connectors")
        .update({ last_error: `plausible API ${res.status}`, last_sync_at: null })
        .eq("source", "plausible");
      return json(502, { error: "Error consultando Plausible", status: res.status });
    }

    const data = await res.json();
    const results: any[] = data?.results || [];

    const rows = results.map((r) => ({
      source: "plausible",
      date: r.date,
      metrics: {
        visits: Number(r.visitors || 0),
        uniques: Number(r.visitors || 0),
        pageviews: Number(r.pageviews || 0),
        views_per_visit: r.views_per_visit != null ? Number(r.views_per_visit) : null,
        visit_duration: r.visit_duration != null ? Number(r.visit_duration) : null,
        bounce_rate:
          r.bounce_rate != null
            ? Math.round(Number(r.bounce_rate) * 100) / 100
            : null,
      },
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("bos_analytics_daily")
        .upsert(rows, { onConflict: "source,date" });
      if (error) {
        await log("error", `upsert analytics: ${error.message}`);
        return json(500, { error: `No se pudo guardar analytics: ${error.message}` });
      }
    }

    await supabase
      .from("bos_connectors")
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: null,
        config: { ...(siteId ? { site_id: siteId } : {}) },
      })
      .eq("source", "plausible");

    await log("ok", `${rows.length} días sincronizados`);

    return json(200, { synced: true, days: rows.length });
  } catch (err) {
    console.error("sync-bos-plausible error:", err);
    try {
      await supabase
        .from("bos_sync_logs")
        .insert({
          source: "plausible",
          status: "error",
          detail: err instanceof Error ? err.message : String(err),
          started_at: startedAt,
          finished_at: new Date().toISOString(),
        });
    } catch {
      // sin DB disponible; nada que hacer
    }
    return json(500, {
      error: err instanceof Error ? err.message : "Error interno",
    });
  }
});