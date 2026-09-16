// PDF de un contrato firmado. Requiere slug + contraseña (como el unlock).
// Devuelve application/pdf. verify_jwt=false en config.toml.
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

const sha256hex = async (s: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const money = (v: number | null, cur: string) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("es-ES", { style: "currency", currency: cur || "EUR" }).format(v);

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
  if (!slug) return json(400, { error: "slug es requerido" });

  try {
    const hash = await sha256hex(password);
    const { data: c, error } = await supabase
      .from("crm_contracts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!c) return json(404, { error: "Contrato no encontrado" });
    if (c.password_hash !== hash) return json(401, { error: "Contraseña incorrecta" });
    if (!c.signed_at) return json(400, { error: "El contrato aún no está firmado por ambas partes" });

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

    const dt = c.signed_at ? new Date(c.signed_at) : null;
    line("CONTRATO DE SERVICIOS", 20, { bold: true, gap: 6 });
    line(dt ? dt.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "", 10, { gap: 20 });

    line(`Contrato: ${c.title}`, 13, { bold: true, gap: 10 });
    line(`Cliente: ${c.client_name || "—"}`, 11);
    line(`Email: ${c.client_email || "—"}`, 11);
    if (c.value != null) line(`Importe: ${money(Number(c.value), c.currency)}`, 11);
    line("", 11, { gap: 10 });

    line("CONDICIONES", 12, { bold: true, gap: 8 });
    const paragraphs = wrapText(c.terms || "", 86);
    for (const p of paragraphs) {
      if (p.trim() === "") {
        y -= 8;
        continue;
      }
      line(p, 11, { gap: 14 });
    }
    y -= 24;

    line("FIRMAS", 12, { bold: true, gap: 8 });
    const giverLine = `Proveedor: ${c.provider_signer_name || "—"}` +
      (c.provider_signed_at ? ` — firmado el ${new Date(c.provider_signed_at).toLocaleDateString("es-ES")}` : " (pendiente)");
    const clientLine = `Cliente: ${c.client_signer_name || c.client_name || "—"}` +
      (c.client_signed_at ? ` — firmado el ${new Date(c.client_signed_at).toLocaleDateString("es-ES")}` : " (pendiente)");
    line(giverLine, 11, { gap: 16 });
    line(clientLine, 11, { gap: 6 });
    line("(p.ej. firma electrónica aceptada por ambas partes)", 9, { gap: 0 });

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