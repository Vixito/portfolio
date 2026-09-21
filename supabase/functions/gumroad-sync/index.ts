import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken } from "../_shared/auth.ts";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
  reconcileGumroadSale,
} from "../_shared/checkout.ts";
import {
  getGumroadEnv,
  gumroadGetUser,
  gumroadListProducts,
  gumroadListSales,
} from "../_shared/gumroad.ts";

const corsHeaders = {
  ...corsCheckoutHeaders,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Backfill y estado de Gumroad para el BOS. Solo admin (token de _shared/auth).
// - status: verifica el token contra /v2/user + cuenta productos.
// - sync: recorre ventas (paginación page_key, tope de seguridad) y concilia.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminUser = await verifyAdminToken(req);
  if (!adminUser) {
    return json(401, { error: "Unauthorized" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const action = payload?.action;
  const { accessToken } = getGumroadEnv();
  if (!accessToken) {
    return json(500, { error: "GUMROAD_ACCESS_TOKEN no configurado" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const startedAt = new Date().toISOString();

  async function touchConnector(patch: Record<string, unknown>) {
    try {
      await supabase.from("bos_connectors").upsert(
        {
          source: "gumroad",
          name: "Gumroad (Ventas)",
          enabled: true,
          ...patch,
        },
        { onConflict: "source" }
      );
    } catch {
      // sin DB disponible; nada que hacer
    }
  }

  async function logError(detail: string) {
    try {
      await supabase.from("bos_sync_logs").insert({
        source: "gumroad",
        status: "error",
        detail,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      });
    } catch {
      // sin DB disponible; nada que hacer
    }
    await touchConnector({ last_error: detail.slice(0, 300), last_sync_at: null });
  }

  try {
    if (action === "status") {
      const user = await gumroadGetUser();
      const products = await gumroadListProducts().catch(() => []);
      return json(200, {
        connected: true,
        account: user?.email || user?.name || null,
        products: products.length,
      });
    }

    if (action === "sync") {
      const params: Record<string, string> = {};
      for (const k of ["after", "before", "email", "product_id"]) {
        if (payload?.[k]) params[k] = String(payload[k]);
      }
      let synced = 0;
      let created = 0;
      let delivered = 0;
      let skipped = 0;
      const warnings: string[] = [];
      let pageKey: string | null = null;
      let pages = 0;
      const MAX_PAGES = 10;

      do {
        const { sales, next_page_key } = await gumroadListSales(
          pageKey ? { ...params, page_key: pageKey } : params
        );
        for (const sale of sales) {
          synced += 1;
          try {
            const r = (await reconcileGumroadSale(supabase, sale)) as Record<string, unknown>;
            if (r.created) created += 1;
            if ((r as any).paid) delivered += 1;
            if ((r as any).warning) {
              skipped += 1;
              if (warnings.length < 10) {
                warnings.push(`sale ${sale?.id}: ${String((r as any).warning)}`);
              }
            }
          } catch (e) {
            skipped += 1;
            const msg = e instanceof Error ? e.message : String(e);
            if (warnings.length < 10) warnings.push(`sale ${sale?.id}: ${msg}`);
          }
        }
        pageKey = next_page_key;
        pages += 1;
      } while (pageKey && pages < MAX_PAGES);

      await touchConnector({
        config: { kind: "payments", configured: true, sales: synced, new_invoices: created },
        last_sync_at: new Date().toISOString(),
        last_error: null,
      });

      return json(200, { synced, created, delivered, skipped, warnings });
    }

    return json(400, { error: "Acción inválida (status|sync)" });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("gumroad-sync error:", detail);
    await logError(detail);
    return json(500, { error: detail });
  }
});
