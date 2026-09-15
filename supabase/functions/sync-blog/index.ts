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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Cuenta los posts recientes de Dev.to (API pública / Forem).
async function fetchDevToCount(): Promise<{ posts: number; error?: string }> {
  const username = Deno.env.get("DEVTO_USERNAME");
  if (!username) return { posts: 0, error: "Falta DEVTO_USERNAME en secrets" };
  const url = `https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=30`;
  const res = await fetch(url);
  if (!res.ok) return { posts: 0, error: `Dev.to API ${res.status}` };
  const data = await res.json();
  return { posts: Array.isArray(data) ? data.length : 0 };
}

// Cuenta los posts de Medium vía RSS público.
async function fetchMediumCount(): Promise<{ posts: number; error?: string }> {
  const username = Deno.env.get("MEDIUM_USERNAME");
  if (!username) return { posts: 0, error: "Falta MEDIUM_USERNAME en secrets" };
  const url = `https://medium.com/feed/@${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok) return { posts: 0, error: `Medium RSS ${res.status}` };
  const xml = await res.text();
  const matches = xml.match(/<item[\s>]/g);
  return { posts: matches ? matches.length : 0 };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const adminUser = await verifyAdminToken(req);
  if (!adminUser) return json(401, { error: "Unauthorized" });

  const startedAt = new Date().toISOString();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const log = async (source: string, status: string, detail: string | null) => {
    await supabase.from("bos_sync_logs").insert({
      source,
      status,
      detail,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
  };

  const upsertConnector = async (
    source: string,
    name: string,
    config: Record<string, unknown>,
    lastError?: string | null
  ) => {
    await supabase.from("bos_connectors").upsert(
      {
        source,
        name,
        enabled: true,
        config: { kind: "blog", configured: true, ...config },
        last_sync_at: lastError ? null : new Date().toISOString(),
        last_error: lastError ? lastError.slice(0, 300) : null,
      },
      { onConflict: "source" }
    );
  };

  try {
    const [devto, medium] = await Promise.all([
      fetchDevToCount().catch((e) => ({ posts: 0, error: String(e) })),
      fetchMediumCount().catch((e) => ({ posts: 0, error: String(e) })),
    ]);

    await upsertConnector(
      "devto",
      "Dev.to",
      { posts_recent: devto.posts, username: Deno.env.get("DEVTO_USERNAME") },
      devto.error
    );
    await log("devto", devto.error ? "error" : "ok", devto.error || `${devto.posts} posts recientes`);

    await upsertConnector(
      "medium",
      "Medium",
      { posts_recent: medium.posts, username: Deno.env.get("MEDIUM_USERNAME") },
      medium.error
    );
    await log("medium", medium.error ? "error" : "ok", medium.error || `${medium.posts} posts recientes`);

    return json(200, {
      synced: true,
      devto: { posts: devto.posts, error: devto.error || null },
      medium: { posts: medium.posts, error: medium.error || null },
    });
  } catch (err) {
    console.error("sync-blog error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    for (const source of ["devto", "medium"]) {
      await supabase.from("bos_sync_logs").insert({
        source,
        status: "error",
        detail,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      });
    }
    return json(500, { error: detail });
  }
});