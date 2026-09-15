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

const DAY = 86_400_000;

// Devuelve {startInclusive, endExclusive} para los últimos n días (UTC).
const lastNDays = (n: number): { start: string; end: string } => {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (n - 1) * DAY);
  return { start: start.toISOString(), end: end.toISOString() };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Exigir un token de admin válido (login server-side).
    const adminUser = await verifyAdminToken(req);
    if (!adminUser) {
      return json(401, { error: "Unauthorized" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ---------- INGRESOS (desde invoices) ----------
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select(
        `id, invoice_number, amount, currency, paid_at, created_at, status,
         custom_fields, user_name, transaction_id, products (title)`
      );

    if (invError) {
      console.error("get-bos-dashboard invoices error:", invError);
    }

    const paid = (invoices || []).filter(
      (i: any) => i.status === "paid" || i.status === "completed"
    );
    const pending = (invoices || []).filter((i: any) => i.status === "pending");

    const inWindow = (iso: string, start: string): boolean =>
      !!iso && new Date(iso).getTime() >= new Date(start).getTime();

    const period = (n: number) => {
      const { start } = lastNDays(n);
      const rows = paid.filter((i: any) => inWindow(i.paid_at, start));
      const sum = rows.reduce((acc: number, i: any) => acc + Number(i.amount || 0), 0);
      return {
        orders: rows.length,
        sum: Math.round(sum * 100) / 100,
        avg:
          rows.length > 0 ? Math.round((sum / rows.length) * 100) / 100 : 0,
      };
    };

    // Serie diaria de los últimos 30 días (incluye días sin ventas).
    const { start: start30, end: end30 } = lastNDays(30);
    const byDay = new Map<number, number>();
    for (const i of paid) {
      if (!inWindow(i.paid_at, start30)) continue;
      const day = new Date(i.paid_at).setUTCHours(0, 0, 0, 0);
      byDay.set(day, (byDay.get(day) || 0) + Number(i.amount || 0));
    }
    const revenue_daily: { date: string; amount: number }[] = [];
    for (let t = new Date(start30).getTime(); t <= new Date(end30).getTime(); t += DAY) {
      const key = new Date(t).setUTCHours(0, 0, 0, 0);
      revenue_daily.push({
        date: new Date(t).toISOString().slice(0, 10),
        amount: Math.round((byDay.get(key) || 0) * 100) / 100,
      });
    }

    // Distribución por pasarela (últimos 90 días).
    const { start: start90 } = lastNDays(90);
    const gatewayAgg = new Map<string, { sum: number; orders: number }>();
    for (const i of paid) {
      if (!inWindow(i.paid_at, start90)) continue;
      const gate = (i.custom_fields as any)?.gateway || "desconocido";
      const cur = gatewayAgg.get(gate) || { sum: 0, orders: 0 };
      cur.sum += Number(i.amount || 0);
      cur.orders += 1;
      gatewayAgg.set(gate, cur);
    }
    const by_gateway = Array.from(gatewayAgg.entries()).map(([gateway, v]) => ({
      gateway,
      sum: Math.round(v.sum * 100) / 100,
      orders: v.orders,
    }));

    const recent = paid
      .slice()
      .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
      .slice(0, 10)
      .map((i: any) => ({
        id: i.id,
        invoice_number: i.invoice_number || null,
        amount: i.amount,
        currency: i.currency || "USD",
        user_name: i.user_name,
        transaction_id: i.transaction_id,
        gateway: (i.custom_fields as any)?.gateway || null,
        product_title: i.products?.title || null,
        paid_at: i.paid_at,
      }));

    const pendingSum = pending.reduce(
      (acc: number, i: any) => acc + Number(i.amount || 0),
      0
    );

    // ---------- TRÁFICO (bos_analytics_daily) ----------
    const { data: analytics, error: anaError } = await supabase
      .from("bos_analytics_daily")
      .select("source, date, metrics")
      .order("date", { ascending: true })
      .gte("date", new Date(start30).toISOString().slice(0, 10));

    if (anaError) {
      console.error("get-bos-dashboard analytics error:", anaError);
    }

    const trafficDaily = (analytics || []).map((a: any) => ({
      date: a.date,
      source: a.source,
      visits: Number(a.metrics?.visits || 0),
      pageviews: Number(a.metrics?.pageviews || 0),
      uniques: Number(a.metrics?.uniques || 0),
      bounce_rate: a.metrics?.bounce_rate ?? null,
    }));

    const trafficTotals = trafficDaily.reduce(
      (acc, row) => {
        acc.visits += row.visits;
        acc.pageviews += row.pageviews;
        acc.uniques += row.uniques;
        return acc;
      },
      { visits: 0, pageviews: 0, uniques: 0 }
    );

    // ---------- LEADS (bos_leads) ----------
    const { data: leads, error: leadsError } = await supabase
      .from("bos_leads")
      .select("id, source, name, email, topic, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (leadsError) {
      console.error("get-bos-dashboard leads error:", leadsError);
    }

    const leadBySource = new Map<string, number>();
    for (const l of leads || []) {
      leadBySource.set(l.source, (leadBySource.get(l.source) || 0) + 1);
    }

    // ---------- CONECTORES ----------
    const { data: connectors, error: connError } = await supabase
      .from("bos_connectors")
      .select("*")
      .order("source", { ascending: true });

    if (connError) {
      console.error("get-bos-dashboard connectors error:", connError);
    }

    const analyticsSources = ["ga4"];
    const paymentSources = ["nowpayments", "dlocalgo", "dlocal"];

    const isAnalyticsSource = (source: string) => analyticsSources.includes(source);

    const analyticsConfigured = (source: string) =>
      source === "ga4"
        ? !!Deno.env.get("GA4_SERVICE_ACCOUNT_JSON") && !!Deno.env.get("GA4_PROPERTY_ID")
        : false;

    const connectorStatus = (connectors || []).map((c: any) => {
      const hasTraffic = trafficDaily.some((t) => t.source === c.source);
      return {
        source: c.source,
        name: c.name,
        enabled: c.enabled,
        last_sync_at: c.last_sync_at,
        last_error: c.last_error,
        configured: isAnalyticsSource(c.source)
          ? analyticsConfigured(c.source)
          : paymentSources.includes(c.source)
            ? true
            : !!(c.last_sync_at || c.config?.configured),
        has_data: isAnalyticsSource(c.source)
          ? hasTraffic
          : paymentSources.includes(c.source)
            ? true
            : !!c.last_sync_at,
      };
    });

    return json(200, {
      generated_at: new Date().toISOString(),
      revenue: {
        lifetime: {
          sum: Math.round(
            paid.reduce((acc: number, i: any) => acc + Number(i.amount || 0), 0) * 100
          ) / 100,
          orders: paid.length,
        },
        periods: {
          "7d": period(7),
          "30d": period(30),
          "90d": period(90),
        },
        pending: { sum: Math.round(pendingSum * 100) / 100, orders: pending.length },
        by_gateway: by_gateway,
        daily: revenue_daily,
        recent,
      },
      traffic: {
        totals: trafficTotals,
        daily: trafficDaily.filter((t) => t.date >= new Date(start30).toISOString().slice(0, 10)),
      },
      leads: {
        total: (leads || []).length,
        by_source: Array.from(leadBySource.entries()).map(([source, count]) => ({
          source,
          count,
        })),
        recent: (leads || []).slice(0, 8),
      },
      connectors: connectorStatus,
    });
  } catch (err) {
    console.error("get-bos-dashboard error:", err);
    return json(500, {
      error: err instanceof Error ? err.message : "Error interno",
    });
  }
});