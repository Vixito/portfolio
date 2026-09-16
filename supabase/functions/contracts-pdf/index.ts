// PDF de un contrato firmado. Requiere slug + contraseña (como el unlock).
// Devuelve application/pdf. verify_jwt=false en config.toml.
// Rate limit: 5 fallos por slug+IP cada 15 min → 429. Todo acceso se audita.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

const sha256hex = async (s: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const getIp = (req: Request): string => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 80);
  return (req.headers.get("x-real-ip") || "unknown").slice(0, 80);
};

const money = (v: number | null, cur: string, lang: string) =>
  v == null
    ? "—"
    : new Intl.NumberFormat(lang === "en" ? "en-US" : "es-ES", {
        style: "currency",
        currency: cur || (lang === "en" ? "USD" : "EUR"),
      }).format(v);

const wrapText = (text: string, max: number): string[] => {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    let line = rawLine;
    while (line.length > max) {
      let cut = line.lastIndexOf(" ", max);
      if (cut <= 0) cut = max;
      out.push(line.slice(0, cut));
      line = line.slice(cut).trimStart();
    }
    out.push(line);
  }
  return out;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    /* body vacío */
  }

  const slug = String(payload?.slug || "");
  const password = String(payload?.password || "");
  const lang = String(payload?.lang || "es").toLowerCase() === "en" ? "en" : "es";
  if (!slug) return json(400, { error: "slug es requerido" });
  const ip = getIp(req);

  const logEvent = async (
    contract_id: string | null,
    event: string
  ) => {
    try {
      await supabase.from("crm_contract_events").insert({
        contract_id,
        slug,
        event,
        ip,
        user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
      });
    } catch {
      /* best-effort */
    }
  };

  try {
    const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
    const { count: fails } = await supabase
      .from("crm_contract_events")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug)
      .eq("ip", ip)
      .in("event", ["unlock_fail", "code_fail", "sign_fail", "pdf_denied"])
      .gte("created_at", since);
    if ((fails || 0) >= MAX_FAILS) {
      return json(429, { error: "Demasiados intentos. Espera 15 minutos." });
    }

    const hash = await sha256hex(password);
    const { data: c, error } = await supabase
      .from("crm_contracts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!c) return json(404, { error: "Contrato no encontrado" });
    if (c.password_hash !== hash) {
      await logEvent(c.id, "pdf_denied");
      return json(401, { error: "Contraseña incorrecta" });
    }
    if (!c.signed_at) {
      await logEvent(c.id, "pdf_denied");
      return json(400, { error: "El contrato aún no está firmado por ambas partes" });
    }

    const useEn = lang === "en" && (c.title_en || c.terms_en);
    const L = useEn
      ? {
          heading: "SERVICE AGREEMENT",
          contract: "Contract",
          client: "Client",
          email: "Email",
          amount: "Amount",
          terms: "TERMS",
          signatures: "SIGNATURES",
          pending: "pending",
          provider: "Provider",
          signedOn: "signed on",
          note: "(electronic signature accepted by both parties)",
          dateFmt: "en-US",
        }
      : {
          heading: "CONTRATO DE SERVICIOS",
          contract: "Contrato",
          client: "Cliente",
          email: "Email",
          amount: "Importe",
          terms: "CONDICIONES",
          signatures: "FIRMAS",
          pending: "pendiente",
          provider: "Proveedor",
          signedOn: "firmado el",
          note: "(firma electrónica aceptada por ambas partes)",
          dateFmt: "es-ES",
        };
    const title = (useEn && c.title_en ? c.title_en : c.title) as string;
    const terms = (useEn && c.terms_en ? c.terms_en : c.terms) as string;
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString(L.dateFmt, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const page = doc.addPage([595.28, 841.89]); // A4
    const margin = 56;
    let y = 780;
    const line = (text: string, size = 11, opts?: { bold?: boolean; gap?: number }) => {
      if (y < 60) return;
      page.drawText(text, {
        x: margin,
        y,
        size,
        font: opts?.bold ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= opts?.gap ?? 16;
    };

    line(L.heading, 20, { bold: true, gap: 6 });
    line(c.signed_at ? fmtDate(c.signed_at) : "", 10, { gap: 20 });

    line(`${L.contract}: ${title}`, 13, { bold: true, gap: 10 });
    line(`${L.client}: ${c.client_name || "—"}`, 11);
    line(`${L.email}: ${c.client_email || "—"}`, 11);
    if (c.value != null) line(`${L.amount}: ${money(Number(c.value), c.currency, lang)}`, 11);
    line("", 11, { gap: 10 });

    line(L.terms, 12, { bold: true, gap: 8 });
    const paragraphs = wrapText(terms || "", 86);
    for (const p of paragraphs) {
      if (p.trim() === "") {
        y -= 8;
        continue;
      }
      line(p, 11, { gap: 14 });
    }
    y -= 24;

    line(L.signatures, 12, { bold: true, gap: 8 });
    const giverLine = `${L.provider}: ${c.provider_signer_name || "—"}` +
      (c.provider_signed_at ? ` — ${L.signedOn} ${fmtDate(c.provider_signed_at)}` : ` (${L.pending})`);
    const clientLine = `${L.client}: ${c.client_signer_name || c.client_name || "—"}` +
      (c.client_signed_at ? ` — ${L.signedOn} ${fmtDate(c.client_signed_at)}` : ` (${L.pending})`);
    line(giverLine, 11, { gap: 16 });
    line(clientLine, 11, { gap: 6 });
    line(L.note, 9, { gap: 0 });

    await logEvent(c.id, "pdf_ok");
    const bytes = await doc.save();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}.pdf"`,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error en contracts-pdf:", error);
    return json(500, { error: error instanceof Error ? error.message : "Error desconocido" });
  }
});