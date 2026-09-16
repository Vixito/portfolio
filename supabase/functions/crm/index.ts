// CRM del Business Operating System: CRUD de empresas, contactos, deals,
// etapas y actividades. Todas las acciones exigen el token de admin.
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

// --- helpers ---

const md5Hex = (input: string): string => {
  // MD5 puro en JS: Deno/browser crypto.subtle no soportan MD5. Necesario
  // para el hash de Gravatar (solo acepta MD5).
  const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c));
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = new Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  }
  const bytes = new Uint8Array(new TextEncoder().encode(input));
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 8) >> 6 << 6) + 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 4294967296), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new DataView(padded.buffer);
  for (let off = 0; off < padded.length; off += 64) {
    let A = a0, B = b0, C = c0, D = d0;
    const X: number[] = [];
    for (let j = 0; j < 16; j++) X[j] = M.getUint32(off + j * 4, true);
    for (let i = 0; i < 64; i++) {
      let F: number; let g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + X[g]) | 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, s[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  const toHex = (n: number) =>
    (n >>> 0).toString(16).padStart(8, "0");
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
};

// Foto de perfil del contacto desde Gravatar (en base al email).
const gravatarUrl = (email?: string | null): string | null => {
  if (!email || !email.includes("@")) return null;
  const hash = md5Hex(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=160`;
};

// Logo de una empresa a partir de su dominio (og:image / apple-touch-icon / favicon).
const fetchCompanyLogo = async (domain?: string | null): Promise<string | null> => {
  if (!domain) return null;
  const clean = String(domain).replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase().trim();
  if (!clean) return null;
  let logo: string | null = null;
  try {
    const res = await fetch(`https://${clean}/`, {
      redirect: "follow",
      signal: AbortSignal.timeout(4000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; VixisCRM/1.0)" },
    });
    if (res.ok) {
      const html = await res.text();
      const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (og?.[1]) logo = og[1];
      if (!logo) {
        const apple = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/i);
        if (apple?.[1]) logo = apple[1];
      }
      if (!logo) {
        const icon = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i);
        if (icon?.[1]) logo = icon[1];
      }
      if (logo && logo.startsWith("//")) logo = `https:${logo}`;
      if (logo && !/^https?:/i.test(logo)) logo = `https://${clean}${logo}`;
    }
  } catch {
    // sin respuesta; se usa el fallback de Google
  }
  return logo || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=128`;
};

const now = () => new Date().toISOString();

const contactSelect = `
  *, company:crm_companies(id, name, domain, logo_url)
`;
const dealSelect = `
  *,
  contact:crm_contacts(id, first_name, last_name, email, photo_url),
  company:crm_companies(id, name, domain, logo_url),
  stage:crm_deal_stages(id, name, position, color)
`;
const activitySelect = `
  *,
  contact:crm_contacts(id, first_name, last_name, email, photo_url),
  deal:crm_deals(id, title, stage_id)
`;

// --- server ---

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const adminUser = await verifyAdminToken(req);
  if (!adminUser) return json(401, { error: "Unauthorized" });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const action = payload?.action;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (action) {
      // ============ EMPRESAS ============
      case "companies-list": {
        const { data, error } = await supabase
          .from("crm_companies")
          .select("*")
          .order("name", { ascending: true });
        if (error) return json(500, { error: error.message });
        const { data: contacts } = await supabase.from("crm_contacts").select("company_id, id");
        const { data: deals } = await supabase.from("crm_deals").select("company_id, id");
        const countOf = (rows: any[] | null, key: string, id: string) =>
          (rows || []).filter((r) => r[key] === id).length;
        return json(200, (data || []).map((c: any) => ({
          ...c,
          contact_count: countOf(contacts, "company_id", c.id),
          deal_count: countOf(deals, "company_id", c.id),
        })));
      }

      case "companies-create": {
        const company = payload?.company;
        if (!company?.name) return json(400, { error: "company.name es requerido" });
        const logo_url =
          company.logo_url ||
          (await fetchCompanyLogo(company.domain || null));
        const { data, error } = await supabase
          .from("crm_companies")
          .insert({ name: company.name, domain: company.domain || null, industry: company.industry || null, notes: company.notes || null, logo_url })
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "companies-update": {
        const id = payload?.id;
        const updates = payload?.updates || {};
        if (!id) return json(400, { error: "id es requerido" });
        const clean: any = {};
        for (const k of ["name", "domain", "industry", "notes"]) {
          if (k in updates) clean[k] = updates[k];
        }
        if ("logo_url" in updates) clean.logo_url = updates.logo_url;
        else if ("domain" in updates && updates.domain) {
          clean.logo_url = await fetchCompanyLogo(updates.domain);
        }
        const { data, error } = await supabase
          .from("crm_companies")
          .update({ ...clean, updated_at: now() })
          .eq("id", id)
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      // ============ CONTACTOS ============
      case "contacts-list": {
        let query = supabase.from("crm_contacts").select(contactSelect).order("created_at", { ascending: false });
        if (payload?.company_id) query = query.eq("company_id", payload.company_id);
        if (payload?.search) {
          const s = `%${String(payload.search).toLowerCase()}%`;
          query = query.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`);
        }
        const { data, error } = await query;
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "contacts-create": {
        const c = payload?.contact;
        if (!c?.first_name) return json(400, { error: "contact.first_name es requerido" });
        const photo_url = c.photo_url || gravatarUrl(c.email || null);
        const lead_id = c.lead_id || null;
        const { data, error } = await supabase
          .from("crm_contacts")
          .insert({
            company_id: c.company_id || null,
            first_name: c.first_name,
            last_name: c.last_name || null,
            email: c.email || null,
            phone: c.phone || null,
            photo_url,
            source: c.source || "manual",
            lead_id,
            tags: Array.isArray(c.tags) ? c.tags : (c.tags ? [String(c.tags)] : []),
            notes: c.notes || null,
          })
          .select(contactSelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "contacts-update": {
        const id = payload?.id;
        const updates = payload?.updates || {};
        if (!id) return json(400, { error: "id es requerido" });
        const clean: any = {};
        for (const k of ["company_id", "first_name", "last_name", "email", "phone", "source", "lead_id", "tags", "notes"]) {
          if (k in updates) clean[k] = updates[k];
        }
        if ("photo_url" in updates) clean.photo_url = updates.photo_url;
        else if ("email" in updates) clean.photo_url = gravatarUrl(updates.email || null);
        const { data, error } = await supabase
          .from("crm_contacts")
          .update({ ...clean, updated_at: now() })
          .eq("id", id)
          .select(contactSelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      // ============ ETAPAS ============
      case "stages-list": {
        const { data, error } = await supabase
          .from("crm_deal_stages")
          .select("*")
          .order("position", { ascending: true });
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      // ============ DEALS ============
      case "deals-list": {
        let query = supabase.from("crm_deals").select(dealSelect).order("created_at", { ascending: false });
        if (payload?.stage_id) query = query.eq("stage_id", payload.stage_id);
        if (payload?.contact_id) query = query.eq("contact_id", payload.contact_id);
        const { data, error } = await query;
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "deals-create": {
        const d = payload?.deal;
        if (!d?.title) return json(400, { error: "deal.title es requerido" });
        let stage_id = d.stage_id || null;
        if (!stage_id) {
          const { data: firstStage } = await supabase
            .from("crm_deal_stages")
            .select("id")
            .order("position", { ascending: true })
            .limit(1)
            .single();
          stage_id = firstStage?.id || null;
        }
        const { data, error } = await supabase
          .from("crm_deals")
          .insert({
            title: d.title,
            contact_id: d.contact_id || null,
            company_id: d.company_id || null,
            stage_id,
            value: d.value ?? 0,
            currency: d.currency || "COP",
            probability: d.probability ?? 10,
            expected_close_date: d.expected_close_date || null,
            notes: d.notes || null,
          })
          .select(dealSelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "deals-update": {
        const id = payload?.id;
        const updates = payload?.updates || {};
        if (!id) return json(400, { error: "id es requerido" });
        const clean: any = {};
        for (const k of ["title", "contact_id", "company_id", "stage_id", "value", "currency", "probability", "expected_close_date", "notes"]) {
          if (k in updates) clean[k] = updates[k];
        }
        const { data, error } = await supabase
          .from("crm_deals")
          .update({ ...clean, updated_at: now() })
          .eq("id", id)
          .select(dealSelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      // ============ ACTIVIDADES ============
      case "activities-list": {
        let query = supabase.from("crm_activities").select(activitySelect).order("created_at", { ascending: false });
        if (payload?.contact_id) query = query.eq("contact_id", payload.contact_id);
        if (payload?.deal_id) query = query.eq("deal_id", payload.deal_id);
        const { data, error } = await query;
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "activities-create": {
        const a = payload?.activity;
        if (!a?.subject) return json(400, { error: "activity.subject es requerido" });
        const { data, error } = await supabase
          .from("crm_activities")
          .insert({
            contact_id: a.contact_id || null,
            deal_id: a.deal_id || null,
            type: a.type || "note",
            subject: a.subject,
            body: a.body || null,
            due_date: a.due_date || null,
            done: !!a.done,
          })
          .select(activitySelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "activities-update": {
        const id = payload?.id;
        const updates = payload?.updates || {};
        if (!id) return json(400, { error: "id es requerido" });
        const clean: any = {};
        for (const k of ["contact_id", "deal_id", "type", "subject", "body", "due_date", "done"]) {
          if (k in updates) clean[k] = updates[k];
        }
        const { data, error } = await supabase
          .from("crm_activities")
          .update(clean)
          .eq("id", id)
          .select(activitySelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

// ============ LEADS Y CONVERSIÓN ============
      case "leads-list": {
        const { data, error } = await supabase
          .from("bos_leads")
          .select("id, source, name, email, phone, topic, converted_at, created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) return json(500, { error: error.message });
        const total = (data || []).length;
        const converted = (data || []).filter((l: any) => !!l.converted_at).length;
        return json(200, { total, converted, items: data || [] });
      }

      case "contacts-convert-lead": {
        const leadId = payload?.lead_id;
        if (!leadId) return json(400, { error: "lead_id es requerido" });
        const { data: lead, error: leadErr } = await supabase
          .from("bos_leads")
          .select("*")
          .eq("id", leadId)
          .single();
        if (leadErr || !lead) return json(404, { error: "Lead no encontrado" });
        if (lead.converted_at) {
          const { data: existing } = await supabase
            .from("crm_contacts")
            .select(contactSelect)
            .eq("lead_id", leadId)
            .single();
          return json(200, { already: true, contact: existing });
        }
        const parts = (lead.name || "").split(/\s+/);
        const firstName = parts[0] || "Sin nombre";
        const lastName = parts.slice(1).join(" ") || null;
        const { data: contact, error: cErr } = await supabase
          .from("crm_contacts")
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: lead.email || null,
            phone: lead.phone || null,
            photo_url: gravatarUrl(lead.email || null),
            source: lead.source || "manual",
            lead_id: leadId,
            tags: [lead.source || "unknown"],
            notes: lead.topic || null,
          })
          .select(contactSelect)
          .single();
        if (cErr) return json(500, { error: cErr.message });
        await supabase
          .from("bos_leads")
          .update({ converted_at: now() })
          .eq("id", leadId);
        return json(200, { already: false, contact });
      }

      // ============ VISITANTES ============
      case "visitors-list": {
        const { data, error } = await supabase
          .from("portfolio_visitors")
          .select("id, session_id, page, referrer, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return json(500, { error: error.message });
        const { count: total } = await supabase
          .from("portfolio_visitors")
          .select("id", { count: "exact", head: true });
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const { count: today } = await supabase
          .from("portfolio_visitors")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfDay.toISOString());
        return json(200, {
          total: total || 0,
          today: today || 0,
          recent: data || [],
        });
      }

      // ============ PLANTILLAS DE EMAIL ============
      case "email-templates-list": {
        const { data, error } = await supabase
          .from("crm_email_templates")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) return json(500, { error: error.message });
        return json(200, { items: data || [] });
      }

      case "email-templates-create": {
        const name = String(payload.name || "").trim();
        const subject = String(payload.subject || "").trim();
        const tplBody = String(payload.body || "");
        if (!name || !subject || !tplBody) {
          return json(400, { error: "name, subject y body son obligatorios" });
        }
        const { data, error } = await supabase
          .from("crm_email_templates")
          .insert({
            name,
            subject,
            body: tplBody,
            is_active: payload.is_active !== false,
          })
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, { template: data });
      }

      case "email-templates-update": {
        const id = String(payload.id || "");
        if (!id) return json(400, { error: "id es obligatorio" });
        const patch: Record<string, unknown> = {};
        if (payload.name !== undefined) patch.name = String(payload.name).trim();
        if (payload.subject !== undefined) patch.subject = String(payload.subject).trim();
        if (payload.body !== undefined) patch.body = String(payload.body);
        if (payload.is_active !== undefined) patch.is_active = !!payload.is_active;
        patch.updated_at = now();
        const { data, error } = await supabase
          .from("crm_email_templates")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, { template: data });
      }

      case "email-templates-delete": {
        const id = String(payload.id || "");
        const { error } = await supabase
          .from("crm_email_templates")
          .delete()
          .eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

      // ============ LOG DE EMAILS ============
      case "emails-list": {
        const { data, error } = await supabase
          .from("crm_email_log")
          .select("*, contact:crm_contacts ( first_name, last_name, email )")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return json(500, { error: error.message });
        return json(200, { items: data || [] });
      }

      // ============ ENVÍO DE EMAIL ============
      case "emails-send": {
        const contactId = String(payload.contact_id || "");
        const templateId = String(payload.template_id || "");
        if (!contactId || !templateId) {
          return json(400, {
            error: "contact_id y template_id son obligatorios",
          });
        }

        const { data: contact, error: cErr } = await supabase
          .from("crm_contacts")
          .select("*, company:crm_companies(name)")
          .eq("id", contactId)
          .maybeSingle();
        if (cErr) return json(500, { error: cErr.message });
        if (!contact) return json(404, { error: "Contacto no encontrado" });

        const { data: template, error: tErr } = await supabase
          .from("crm_email_templates")
          .select("*")
          .eq("id", templateId)
          .maybeSingle();
        if (tErr) return json(500, { error: tErr.message });
        if (!template) return json(404, { error: "Plantilla no encontrada" });

        let deal: Record<string, unknown> | null = null;
        if (payload.deal_id) {
          const { data: d } = await supabase
            .from("crm_deals")
            .select("*")
            .eq("id", String(payload.deal_id))
            .maybeSingle();
          deal = d;
        }

        const vars: Record<string, string> = {
          "contact.first_name": contact.first_name || "",
          "contact.last_name": contact.last_name || "",
          "contact.full_name":
            `${contact.first_name || ""} ${contact.last_name || ""}`.trim(),
          "contact.email": contact.email || "",
          "company.name": (contact?.company as any)?.name || "",
          "deal.title": (deal?.title as string) || "",
          "deal.value":
            deal?.value != null
              ? new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: String(deal.currency || "EUR"),
                }).format(Number(deal.value))
              : "",
          "template.name": template.name,
        };
        if (payload.extra && typeof payload.extra === "object") {
          for (const [k, v] of Object.entries(payload.extra)) {
            vars[String(k)] = String(v ?? "");
          }
        }

        const render = (tplText: string) =>
          tplText.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) =>
            vars[k] !== undefined ? vars[k] : `{{${k}}}`
          );

        const subject = render(template.subject);
        const text = render(template.body);
        const esc = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const html = text
          .split(/\n{2,}/)
          .map((p) => `<p style="margin:0 0 12px;">${esc(p).replace(/\n/g, "<br>")}</p>`)
          .join("");

        const resendKey = Deno.env.get("RESEND_API_KEY");
        const from = Deno.env.get("EMAIL_FROM");
        const toEmail = contact.email;
        let status = "error";
        let errorMsg = "";
        let sentAt: string | null = null;

        if (!resendKey || !from || !toEmail) {
          errorMsg = !resendKey || !from
            ? "Falta configurar RESEND_API_KEY / EMAIL_FROM"
            : "El contacto no tiene email";
        } else {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ from, to: [toEmail], subject, text, html }),
          });
          if (res.ok) {
            status = "sent";
            sentAt = now();
          } else {
            errorMsg = `${res.status} ${(await res.text()).slice(0, 300)}`;
          }
        }

        const { data: logRow, error: logErr } = await supabase
          .from("crm_email_log")
          .insert({
            contact_id: contactId,
            deal_id: payload.deal_id || null,
            template_id: templateId,
            from_email: from || null,
            to_email: toEmail,
            subject,
            body: text,
            placeholders: vars,
            provider: "resend",
            status,
            error: errorMsg || null,
            sent_at: sentAt,
          })
          .select()
          .single();
        if (logErr) return json(500, { error: logErr.message });

        if (status !== "sent") {
          return json(400, { error: errorMsg, log: logRow });
        }
        return json(200, { ok: true, sent_at: sentAt, email: logRow });
      }

      default:
        return json(400, { error: `Acción desconocida: ${action}` });
    }
  } catch (error) {
    console.error("Error en crm:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});