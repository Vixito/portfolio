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

const TALLY_BASE = "https://api.tally.so";

// Trae todas las páginas de un endpoint paginado de Tally.
async function fetchAllPages<T>(path: string, limit = 100): Promise<T[]> {
  const apiKey = Deno.env.get("TALLYSO_API_KEY");
  const items: T[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(`${TALLY_BASE}${path}&page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "tally-version": "2025-02-01" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Tally API ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    const chunk: T[] = data?.items ?? data?.submissions ?? [];
    items.push(...chunk);
    hasMore = !!data?.hasMore;
    page += 1;
    if (chunk.length === 0) hasMore = false;
  }
  return items;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const isName = (t: string) => /(^| )(nombre|name|titulo|title|apodo|nick)/.test(normalize(t));
const isEmail = (t: string) => /(correo|email|e[- ]?mail)/.test(normalize(t));
const isPhone = (t: string) => /(telefono|celular|tel\b|phone|whatsapp)/.test(normalize(t));
const isTopic = (t: string) =>
  /(tema|topico|cancion|song|solicitud|mensaje|mensaje|asunto|subject|comentario)/.test(normalize(t)) ||
  !isName(t) && !isEmail(t) && !isPhone(t);

// Mapea las respuestas de un form a un lead minimalista.
function mapSubmission(form: any, questions: any[], sub: any) {
  const byQuestion = new Map<string, { type: string; title: string }>();
  for (const q of questions || []) byQuestion.set(q.id, q);

  const answers: Record<string, unknown> = {};
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let topic: string | null = null;

  for (const r of (sub?.responses || []) as any[]) {
    const q = byQuestion.get(r.questionId);
    if (!q) continue;
    answers[q.title] = r.answer;
    const v = String(r?.answer ?? "").trim();
    if (!v) continue;
    if (isEmail(q.title)) email = email || v;
    else if (isPhone(q.title)) phone = phone || v;
    else if (isName(q.title)) name = name || v;
    else if (isTopic(q.title)) topic = topic || v;
  }

  return {
    source: "tally",
    name,
    email,
    phone,
    topic: topic || null,
    payload: {
      form_id: form.id,
      form_name: form.name,
      submission_id: sub.id,
      respondent_id: sub.respondentId,
      submitted_at: sub.submittedAt,
      is_completed: !!sub.isCompleted,
      answers,
    },
  };
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

  const log = async (status: string, detail: string | null) => {
    await supabase.from("bos_sync_logs").insert({
      source: "tally",
      status,
      detail,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
  };

  try {
    const apiKey = Deno.env.get("TALLYSO_API_KEY");
    if (!apiKey) {
      await log("skipped", "Falta TALLYSO_API_KEY en los secrets");
      return json(200, { synced: false, reason: "Tally no está configurado (secrets)" });
    }

    const forms = await fetchAllPages<any>("/forms?");
    let submissionsTotal = 0;
    let inserted = 0;

    // Dedupe: submission_id ya sincronizados.
    const { data: existing } = await supabase
      .from("bos_leads")
      .select("payload")
      .eq("source", "tally");
    const seen = new Set((existing || []).map((r: any) => r.payload?.submission_id));

    for (const form of forms) {
      if (form.status !== "PUBLISHED" && form.status !== "DRAFT") continue;
      if (form.numberOfSubmissions === 0) continue;

      let data: { submissions: any[]; questions: any[] };
      try {
        data = await fetchSubmissionsWithQuestions(form.id);
      } catch (err) {
        console.warn(`sync-tally: sin submissions de ${form.id}:`, err);
        continue;
      }

      for (const sub of data.submissions) {
        submissionsTotal += 1;
        if (seen.has(sub.id)) continue;
        const row = mapSubmission(form, data.questions, sub);
        if (!row.name && !row.email && !row.phone && !row.topic) continue;
        const { error } = await supabase.from("bos_leads").insert(row);
        if (error) throw error;
        seen.add(sub.id);
        inserted += 1;
      }
    }

    await supabase
      .from("bos_connectors")
      .upsert(
        {
          source: "tally",
          name: "Tally.so (Leads)",
          enabled: true,
          config: { kind: "leads", configured: true, forms: forms.length, submissions: submissionsTotal },
          last_sync_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: "source" }
      );

    await log("ok", `${submissionsTotal} submissions, ${inserted} leads nuevos`);
    return json(200, { synced: true, forms: forms.length, submissions: submissionsTotal, new_leads: inserted });
  } catch (err) {
    console.error("sync-tally error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    try {
      await supabase.from("bos_sync_logs").insert({
        source: "tally",
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
        .eq("source", "tally");
    } catch {
      // sin DB disponible; nada que hacer
    }
    return json(500, { error: detail });
  }
});

// GET con preguntas (el listado de submissions trae 'questions' junto a los datos).
async function fetchSubmissionsWithQuestions(formId: string) {
  const apiKey = Deno.env.get("TALLYSO_API_KEY");
  let page = 1;
  let hasMore = true;
  const all: any[] = [];
  let questions: any[] = [];
  while (hasMore) {
    const res = await fetch(
      `${TALLY_BASE}/forms/${formId}/submissions?page=${page}&limit=100`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, "tally-version": "2025-02-01" },
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Tally API ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data?.questions?.length) questions = data.questions;
    all.push(...(data?.submissions ?? []));
    hasMore = !!data?.hasMore;
    page += 1;
    if ((data?.submissions ?? []).length === 0) hasMore = false;
  }
  return { submissions: all, questions };
}