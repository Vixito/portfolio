// CRM del Business Operating System: CRUD de empresas, contactos, deals,
// etapas y actividades. Todas las acciones exigen el token de admin.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken } from "../_shared/auth.ts";
import { getBrand, brandShell } from "../_shared/email_brand.ts";

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

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "contrato";

const uniqueSlug = async (base: string, supabase: any) => {
  const { data: existing } = await supabase.from("crm_contracts").select("slug");
  const slugs = new Set((existing || []).map((r: any) => r.slug));
  if (!slugs.has(base)) return base;
  let i = 2;
  while (slugs.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
};

const randomPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
};

const CONTRACT_TYPES = ["servicios", "consultoria", "nda", "oferta", "soporte", "licencia", "otro"];

const sha256hex = async (s: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

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

// --- Campos personalizados (estilo Notion/Twenty) ---

const FIELD_TYPES = [
  "text", "textarea", "number", "date", "select", "multi_select",
  "emails", "phones", "tags", "url", "image", "boolean",
];

// campos cuyo valor vive en una columna de la tabla (el resto va en `data`)
const PERSON_COLUMNS: Record<string, string> = {
  apellidos: "last_name",
  anios_experiencia: "experience_years",
  estado: "status",
  fecha_creacion: "created_at",
  fecha_cumpleanos: "birthdate",
  foto_perfil: "photo_url",
  genero: "gender",
  github: "github",
  linkedin: "linkedin",
  nombres: "first_name",
  notas: "notes",
  rol_trabajo: "job_title",
  tags: "tags",
  x: "x_handle",
};
const COMPANY_COLUMNS: Record<string, string> = {
  direccion: "address",
  estado: "status",
  fecha_fundacion: "founded_year",
  github: "github",
  linkedin: "linkedin",
  logotipo: "logo_url",
  nit: "nit",
  nombre: "name",
  notas: "notes",
  rango_empleados: "employee_range",
  tags: "tags",
  x: "x_handle",
};

// columnas que no son campos (se persisten tal cual desde el payload legado)
const PERSON_EXTRA_COLS = new Set([
  "source", "owner", "company_id", "lead_id", "website", "phone", "phone2", "address",
]);
const COMPANY_EXTRA_COLS = new Set([
  "domain", "industry", "website", "owner", "phone",
]);

// alias de columnas legadas -> nombres de campos
const PERSON_ALIAS: Record<string, string> = {
  first_name: "nombres",
  last_name: "apellidos",
  email: "correos_electronicos",
  phone: "telefonos",
  phone2: "telefonos",
  photo_url: "foto_perfil",
  job_title: "rol_trabajo",
  birthdate: "fecha_cumpleanos",
  gender: "genero",
  linkedin: "linkedin",
  github: "github",
  x_handle: "x",
  experience_years: "anios_experiencia",
  notes: "notas",
  tags: "tags",
  status: "estado",
};
const COMPANY_ALIAS: Record<string, string> = {
  name: "nombre",
  domain: "dominios",
  logo_url: "logotipo",
  notes: "notas",
  tags: "tags",
  founded_year: "fecha_fundacion",
  employee_range: "rango_empleados",
  nit: "nit",
  address: "direccion",
  phone: "telefonos",
  linkedin: "linkedin",
  github: "github",
  x_handle: "x",
  status: "estado",
};

// Ciclo de vida: estado -> tag automático
const PERSON_STATUS_TAG: Record<string, string> = {
  nuevo: "Nuevo",
  interesado: "Interesado/a",
  lead: "Lead",
  cliente: "Cliente",
  "ex-cliente": "Ex-cliente",
  inactivo: "Inactivo",
};
const COMPANY_STATUS_TAG: Record<string, string> = {
  nuevo: "Nuevo",
  prospecto: "Prospecto",
  cliente: "Cliente",
  "ex-cliente": "Ex-cliente",
};

const WEB_LEAD_SOURCES = ["tally", "whatsapp", "portfolio", "status", "web", "form"];

const defaultStatusForSource = (source?: string | null, entityType = "person") =>
  entityType === "company" ? "nuevo"
  : WEB_LEAD_SOURCES.includes(String(source || "").toLowerCase()) ? "lead" : "nuevo";

const fieldKey = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "campo";

const normText = (v: any, max = 2000) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.slice(0, max) || null;
};

const normNumber = (v: any) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normDate = (v: any) => {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const normArray = (v: any, max = 60) => {
  if (v == null) return null;
  const arr = Array.isArray(v) ? v : [v];
  return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))].slice(0, max);
};

const cleanDomain = (d: string) =>
  String(d)
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim() || null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Normaliza el valor crudo de un campo según su tipo.
function normalizeFieldValue(field: any, raw: any) {
  if (raw === undefined || raw === null) return null;
  switch (field.type) {
    case "number": return normNumber(raw);
    case "date": return normDate(raw);
    case "multi_select":
    case "emails":
    case "phones":
    case "tags": return normArray(raw);
    case "boolean": return raw === true || raw === "true" || raw === 1;
    case "select": {
      const opts = Array.isArray(field.options) ? field.options.map(String) : [];
      const v = normText(raw, 120);
      if (!v) return null;
      return opts.length && !opts.includes(v) ? null : v;
    }
    default: return normText(raw);
  }
}

function normalizeExtra(name: string, raw: any) {
  if (raw == null) return null;
  if (name === "company_id" || name === "lead_id") {
    const s = String(raw).trim();
    return UUID_RE.test(s) ? s : null;
  }
  if (name === "source") return String(raw).trim().slice(0, 40) || null;
  if (name === "tags") return normArray(raw);
  return String(raw).trim().slice(0, 400) || null;
}

async function loadFields(supabase: any, entityType: string): Promise<Map<string, any>> {
  const { data } = await supabase
    .from("crm_fields")
    .select("*")
    .eq("entity_type", entityType);
  return new Map((data || []).map((f: any) => [f.name, f]));
}

// Mezcla payload legado (columnas) con valores por nombre de campo.
// Alias reasignan columnas legadas a nombres de campos; varios a un
// mismo campo (ej. phone + phone2 -> telefonos) se concatenan.
function resolveValues(legacy: Record<string, any>, rawValues: Record<string, any>, alias: Record<string, string>) {
  const src = { ...(legacy || {}), ...(rawValues || {}) };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) continue;
    const key = alias[k] || k;
    if (key in out && Array.isArray(out[key]) && Array.isArray(v)) {
      out[key] = [...(out[key] as any[]), ...v];
    } else if (key in out && Array.isArray(out[key]) && !Array.isArray(v)) {
      out[key].push(String(v));
    } else {
      out[key] = v;
    }
  }
  return out;
}

// Separa valores de campos en { columns, data, providedData }.
function fieldsToRow(fields: Map<string, any>, entityType: string, values: Record<string, any>) {
  const colMap = entityType === "company" ? COMPANY_COLUMNS : PERSON_COLUMNS;
  const extra = entityType === "company" ? COMPANY_EXTRA_COLS : PERSON_EXTRA_COLS;
  const columns: Record<string, any> = {};
  const data: Record<string, any> = {};
  const providedData: string[] = [];
  for (const [name, raw] of Object.entries(values || {})) {
    if (raw === undefined) continue;
    const field = fields.get(name);
    if (field) {
      const v = normalizeFieldValue(field, raw);
      if (field.storage === "column" && colMap[name]) columns[colMap[name]] = v;
      else if (field.storage === "data") {
        providedData.push(name);
        if (v === null) delete data[name];
        else data[name] = v;
      }
    } else if (extra.has(name)) {
      const v = normalizeExtra(name, raw);
      if (v !== null) columns[name] = v;
      else if (name === "source") columns.source = null;
    }
  }
  return { columns, data, providedData };
}

// Ciclo de vida: la fuente de verdad son los TAGS (el Estado es derivado y
// no editable en UI). `estado` explícito solo se honra en llamadores legados.
// - Creación (isNew): si trae tag de ciclo se respeta; si no, default por
//   origen + tag (comportamiento original).
// - Actualización: si cambia el set de tags de ciclo, el Estado sigue al
//   último agregado (vacío => limpieza); si no cambia, no se toca nada.
function syncStatusTags(entityType: string, values: Record<string, any>, existingTags: string[] | null, existingStatus: string | null, isNew = false) {
  const tagMap = entityType === "company" ? COMPANY_STATUS_TAG : PERSON_STATUS_TAG;
  const cycleTags = new Set(Object.values(tagMap));
  const statusOfTag: Record<string, string> = {};
  for (const [st, tg] of Object.entries(tagMap)) statusOfTag[tg] = st;
  const asArray = (t: any): string[] =>
    Array.isArray(t) ? t.map(String) : t != null ? [String(t)] : [...(existingTags || [])];
  const stripCycle = (arr: string[]): string[] => arr.filter((t) => !cycleTags.has(t));
  const sameSet = (a: string[], b: string[]): boolean =>
    a.length === b.length && a.every((t) => b.includes(t));

  // Estado explícito (legado): manda como antes.
  if (values.estado !== undefined) {
    if (values.estado === null) {
      return { status: null, tags: stripCycle(asArray(values.tags)) };
    }
    const provided = String(values.estado);
    if (tagMap[provided] && (isNew || provided !== (existingStatus ?? null))) {
      const tags = stripCycle(asArray(values.tags));
      const lifeTag = tagMap[provided];
      if (lifeTag && !tags.includes(lifeTag)) tags.push(lifeTag);
      return { status: provided, tags };
    }
    if (isNew) {
      const status = defaultStatusForSource(values.source ?? null, entityType);
      const tags = stripCycle(asArray(values.tags));
      const lifeTag = tagMap[status];
      if (lifeTag && !tags.includes(lifeTag)) tags.push(lifeTag);
      return { status, tags };
    }
    return { status: existingStatus ?? null, tags: asArray(values.tags) };
  }

  const incoming = values.tags !== undefined ? asArray(values.tags) : [...(existingTags || [])];
  const incomingCycle = incoming.filter((t) => cycleTags.has(t));
  const existingCycle = (existingTags || []).map(String).filter((t) => cycleTags.has(t));

  if (isNew) {
    const picked = incomingCycle.length ? incomingCycle[incomingCycle.length - 1] : null;
    const status = (picked && statusOfTag[picked]) || defaultStatusForSource(values.source ?? null, entityType);
    const tags = stripCycle(incoming);
    const lifeTag = tagMap[status];
    if (lifeTag && !tags.includes(lifeTag)) tags.push(lifeTag);
    return { status, tags };
  }

  if (!sameSet(incomingCycle, existingCycle)) {
    const added = incomingCycle.filter((t) => !existingCycle.includes(t));
    const picked = added.length ? added[added.length - 1] : null;
    const status = picked ? statusOfTag[picked] ?? null : null;
    const tags = stripCycle(incoming);
    if (status) {
      const lifeTag = tagMap[status];
      if (lifeTag && !tags.includes(lifeTag)) tags.push(lifeTag);
    }
    return { status, tags };
  }
  return { status: existingStatus ?? null, tags: incoming };
}

// Mantiene columnas legadas sincronizadas con los arrays de `data`.
function backfillColumns(entityType: string, columns: Record<string, any>, data: Record<string, any>) {
  if (entityType === "person") {
    const emails = Array.isArray(data.correos_electronicos) ? data.correos_electronicos : [];
    if (emails.length && columns.email === undefined) columns.email = normText(emails[0], 200);
    const tels = Array.isArray(data.telefonos) ? data.telefonos : [];
    if (tels.length) {
      if (columns.phone === undefined && tels[0] != null) columns.phone = normText(tels[0], 60);
      if (tels.length > 1 && tels[1] != null && columns.phone2 === undefined) columns.phone2 = normText(tels[1], 60);
    }
  } else {
    const doms = Array.isArray(data.dominios) ? data.dominios : [];
    if (doms.length && columns.domain === undefined) columns.domain = cleanDomain(String(doms[0]));
    const tels = Array.isArray(data.telefonos) ? data.telefonos : [];
    if (tels.length && columns.phone === undefined && tels[0] != null) columns.phone = normText(tels[0], 60);
  }
}

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
        const fields = await loadFields(supabase, "company");
        const values = resolveValues(payload?.company || {}, payload?.fields || {}, COMPANY_ALIAS);
        const { columns, data } = fieldsToRow(fields, "company", values);
        if (columns.name == null) return json(400, { error: "el campo Nombre es requerido" });
        const st = syncStatusTags("company", values, null, null, true);
        columns.status = st.status;
        columns.tags = st.tags;
        backfillColumns("company", columns, data);
        if (!("logo_url" in columns) && columns.domain) {
          columns.logo_url = await fetchCompanyLogo(columns.domain);
        }
        const { data: created, error } = await supabase
          .from("crm_companies")
          .insert({ ...columns, data })
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        const { data: contacts } = await supabase.from("crm_contacts").select("company_id, id");
        const { data: deals } = await supabase.from("crm_deals").select("company_id, id");
        const countOf = (rows: any[] | null, key: string, id: string) =>
          (rows || []).filter((r) => r[key] === id).length;
        return json(200, {
          ...created,
          contact_count: countOf(contacts, "company_id", created.id),
          deal_count: countOf(deals, "company_id", created.id),
        });
      }

      case "companies-update": {
        const id = payload?.id;
        if (!id) return json(400, { error: "id es requerido" });
        const fields = await loadFields(supabase, "company");
        const values = resolveValues(payload?.updates || {}, payload?.fields || {}, COMPANY_ALIAS);
        if (!Object.keys(values).length) return json(400, { error: "sin cambios" });
        const { data: existing } = await supabase
          .from("crm_companies")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (!existing) return json(404, { error: "Empresa no encontrada" });
        const { columns, data, providedData } = fieldsToRow(fields, "company", values);
        const finalData = { ...(existing.data || {}) };
        for (const k of providedData) {
          if (k in data) finalData[k] = data[k];
          else delete finalData[k];
        }
        backfillColumns("company", columns, finalData);
        const st = syncStatusTags("company", values, existing.tags || [], existing.status);
        const clean: any = { ...columns, status: st.status, tags: st.tags, data: finalData, updated_at: now() };
        if (clean.name == null) delete clean.name;
        if (clean.domain === undefined) delete clean.domain;
        if (clean.company_id === undefined) delete clean.company_id;
        if (!("logo_url" in columns) && clean.domain && clean.domain !== String(existing.domain || "")) {
          clean.logo_url = await fetchCompanyLogo(clean.domain);
        }
        const { data: updated, error } = await supabase
          .from("crm_companies")
          .update(clean)
          .eq("id", id)
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, updated);
      }

      case "companies-delete": {
        const id = String(payload?.id || "");
        if (!id) return json(400, { error: "id es requerido" });
        const { error } = await supabase.from("crm_companies").delete().eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
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
        const fields = await loadFields(supabase, "person");
        const values = resolveValues(payload?.contact || {}, payload?.fields || {}, PERSON_ALIAS);
        const { columns, data } = fieldsToRow(fields, "person", values);
        if (columns.first_name == null) return json(400, { error: "el campo Nombres es requerido" });
        const st = syncStatusTags("person", values, null, null, true);
        columns.status = st.status;
        columns.tags = st.tags;
        backfillColumns("person", columns, data);
        if (!("photo_url" in columns) && columns.email) {
          columns.photo_url = gravatarUrl(columns.email);
        }
        const { data: created, error } = await supabase
          .from("crm_contacts")
          .insert({ ...columns, data })
          .select(contactSelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, created);
      }

      case "contacts-update": {
        const id = payload?.id;
        if (!id) return json(400, { error: "id es requerido" });
        const fields = await loadFields(supabase, "person");
        const values = resolveValues(payload?.updates || {}, payload?.fields || {}, PERSON_ALIAS);
        if (!Object.keys(values).length) return json(400, { error: "sin cambios" });
        const { data: existing } = await supabase
          .from("crm_contacts")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (!existing) return json(404, { error: "Contacto no encontrado" });
        const { columns, data, providedData } = fieldsToRow(fields, "person", values);
        const finalData = { ...(existing.data || {}) };
        for (const k of providedData) {
          if (k in data) finalData[k] = data[k];
          else delete finalData[k];
        }
        backfillColumns("person", columns, finalData);
        const st = syncStatusTags("person", values, existing.tags || [], existing.status);
        const clean: any = { ...columns, status: st.status, tags: st.tags, data: finalData, updated_at: now() };
        if (clean.first_name == null) delete clean.first_name;
        if (clean.company_id === undefined) delete clean.company_id;
        if (clean.lead_id === undefined) delete clean.lead_id;
        if (!("photo_url" in columns) && "email" in clean &&
            String(clean.email || "").toLowerCase() !== String(existing.email || "").toLowerCase() && clean.email) {
          clean.photo_url = gravatarUrl(clean.email);
        }
        const { data: updated, error } = await supabase
          .from("crm_contacts")
          .update(clean)
          .eq("id", id)
          .select(contactSelect)
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, updated);
      }

      case "contacts-delete": {
        const id = String(payload?.id || "");
        if (!id) return json(400, { error: "id es requerido" });
        const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

      // ============ CAMPOS PERSONALIZADOS ============
      case "fields-list": {
        const entityType = payload?.entity_type;
        if (entityType && !["person", "company"].includes(entityType)) {
          return json(400, { error: "entity_type inválido (person|company)" });
        }
        let q = supabase.from("crm_fields").select("*").order("entity_type").order("position", { ascending: true });
        if (entityType) q = q.eq("entity_type", entityType);
        const { data, error } = await q;
        if (error) return json(500, { error: error.message });
        return json(200, { fields: data || [] });
      }

      case "fields-create": {
        const entityType = payload?.entity_type;
        if (!["person", "company"].includes(entityType)) {
          return json(400, { error: "entity_type es requerido (person|company)" });
        }
        const label = normText(payload?.label, 120);
        if (!label) return json(400, { error: "label es requerido" });
        const name = payload?.name ? fieldKey(payload.name) : fieldKey(label);
        const type = FIELD_TYPES.includes(payload?.type) ? payload.type : "text";
        const icon = normText(payload?.icon, 40);
        let options: string[] = [];
        if (type === "select" || type === "multi_select") {
          if (Array.isArray(payload?.options)) {
            options = payload.options.map(String).filter(Boolean).slice(0, 100);
          }
        }
        const { data: found } = await supabase
          .from("crm_fields")
          .select("id")
          .eq("entity_type", entityType)
          .eq("name", name)
          .maybeSingle();
        if (found) return json(409, { error: "Ya existe un campo con ese nombre" });
        const { data: maxPos } = await supabase
          .from("crm_fields")
          .select("position")
          .eq("entity_type", entityType)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data, error } = await supabase
          .from("crm_fields")
          .insert({
            entity_type: entityType,
            name,
            label,
            label_en: normText(payload?.label_en, 120),
            type,
            icon,
            options,
            storage: "data",
            position: (maxPos?.position ?? 0) + 10,
            is_system: false,
            is_visible: payload?.is_visible === false ? false : true,
            description: normText(payload?.description, 500),
          })
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "fields-update": {
        const id = payload?.id;
        if (!id) return json(400, { error: "id es requerido" });
        const { data: field, error: fErr } = await supabase
          .from("crm_fields")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (fErr) return json(500, { error: fErr.message });
        if (!field) return json(404, { error: "Campo no encontrado" });
        const patch: Record<string, any> = { updated_at: now() };
        if (payload?.label !== undefined) patch.label = normText(payload.label, 120);
        if (payload?.label_en !== undefined) patch.label_en = normText(payload.label_en, 120);
        if (payload?.icon !== undefined) patch.icon = normText(payload.icon, 40);
        if (payload?.description !== undefined) patch.description = normText(payload.description, 500);
        if (payload?.is_visible !== undefined) patch.is_visible = !!payload.is_visible;
        if (payload?.position !== undefined && Number.isFinite(Number(payload.position))) {
          patch.position = Number(payload.position);
        }
        if (payload?.settings !== undefined && payload.settings && typeof payload.settings === "object") {
          patch.settings = payload.settings;
        }
        if (!field.is_system) {
          if (!["person", "company"].includes(field.entity_type)) field.entity_type = "person";
          const table = field.entity_type === "company" ? "crm_companies" : "crm_contacts";
          if (payload?.name !== undefined) {
            const newName = fieldKey(payload.name);
            const hasNameChange = newName && newName !== field.name;
            if (hasNameChange && field.storage === "data") {
              const { data: dup } = await supabase
                .from("crm_fields")
                .select("id")
                .eq("entity_type", field.entity_type)
                .eq("name", newName)
                .maybeSingle();
              if (dup) return json(409, { error: "Ya existe un campo con ese nombre" });
              patch.name = newName;
              const { data: rows } = await supabase.from(table).select("id, data");
              for (const r of rows || []) {
                if (r.data && Object.prototype.hasOwnProperty.call(r.data, field.name)) {
                  const d = { ...r.data };
                  d[newName] = d[field.name];
                  delete d[field.name];
                  await supabase.from(table).update({ data: d }).eq("id", r.id);
                }
              }
            } else if (hasNameChange) {
              const { data: dup } = await supabase
                .from("crm_fields")
                .select("id")
                .eq("entity_type", field.entity_type)
                .eq("name", newName)
                .maybeSingle();
              if (dup) return json(409, { error: "Ya existe un campo con ese nombre" });
              patch.name = newName;
            }
          }
          if (payload?.type !== undefined) {
            const t = FIELD_TYPES.includes(payload.type) ? payload.type : "text";
            if (t !== field.type) {
              if (t === "select" || t === "multi_select") {
                if (!Array.isArray(payload?.options)) return json(400, { error: "options es requerido para campos de selección" });
                patch.options = payload.options.map(String).filter(Boolean).slice(0, 100);
              } else if (!Array.isArray(payload?.options)) {
                patch.options = [];
              }
              patch.type = t;
            }
          }
        }
        if (payload?.options !== undefined && Array.isArray(payload.options) && field.type !== "select" && field.type !== "multi_select") {
          return json(400, { error: "options solo aplica a campos de selección" });
        }
        const { data, error } = await supabase.from("crm_fields").update(patch).eq("id", id).select().single();
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "fields-delete": {
        const id = payload?.id;
        if (!id) return json(400, { error: "id es requerido" });
        const { data: field, error: fErr } = await supabase
          .from("crm_fields")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (fErr) return json(500, { error: fErr.message });
        if (!field) return json(404, { error: "Campo no encontrado" });
        if (field.is_system) return json(400, { error: "Los campos de sistema no se pueden eliminar" });
        await supabase.from("crm_fields").delete().eq("id", id);
        if (field.storage === "data") {
          const table = field.entity_type === "company" ? "crm_companies" : "crm_contacts";
          const { data: rows } = await supabase.from(table).select("id, data");
          for (const r of rows || []) {
            if (r.data && Object.prototype.hasOwnProperty.call(r.data, field.name)) {
              const d = { ...r.data };
              delete d[field.name];
              await supabase.from(table).update({ data: d }).eq("id", r.id);
            }
          }
        }
        return json(200, { ok: true });
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

      case "deals-delete": {
        const id = String(payload?.id || "");
        if (!id) return json(400, { error: "id es requerido" });
        const { error } = await supabase.from("crm_deals").delete().eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
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

      case "activities-delete": {
        const id = String(payload?.id || "");
        if (!id) return json(400, { error: "id es requerido" });
        const { error } = await supabase.from("crm_activities").delete().eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

// ============ LEADS Y CONVERSIÓN ============
      case "leads-list": {
        const { data, error } = await supabase
          .from("bos_leads")
          .select("id, source, name, email, phone, topic, converted_at, created_at, country, device, browser, os, page_url, referrer_domain, utm_source, utm_medium, utm_campaign")
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
        const enrichBits = [
          lead.source || null,
          lead.country || null,
          [lead.device, lead.browser].filter(Boolean).join("/") || null,
          lead.page_url || null,
          lead.utm_source ? `utm:${lead.utm_source}` : null,
        ].filter(Boolean);
        const enrichedNotes = [
          lead.topic || null,
          enrichBits.length > 0 ? `[${enrichBits.join(" · ")}]` : null,
        ].filter(Boolean).join("\n");
        const fields = await loadFields(supabase, "person");
        const values: Record<string, any> = {
          nombres: firstName,
          apellidos: lastName,
          source: lead.source || "manual",
          tags: [lead.source || "unknown"],
          notas: enrichedNotes || null,
        };
        if (lead.email) values.correos_electronicos = [lead.email];
        if (lead.phone) values.telefonos = [lead.phone];
        const { columns, data } = fieldsToRow(fields, "person", values);
        const st = syncStatusTags("person", values, null, null, true);
        columns.status = st.status;
        columns.tags = st.tags;
        columns.lead_id = leadId;
        backfillColumns("person", columns, data);
        if (!("photo_url" in columns) && columns.email) {
          columns.photo_url = gravatarUrl(columns.email);
        }
        const { data: contact, error: cErr } = await supabase
          .from("crm_contacts")
          .insert({ ...columns, data })
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

      // ============ CONTRATOS ============
      case "contracts-list": {
        const { data, error } = await supabase
          .from("crm_contracts")
          .select(
            "*, contact:crm_contacts(id, first_name, last_name, email), company:crm_companies(id, name)"
          )
          .order("created_at", { ascending: false });
        if (error) return json(500, { error: error.message });
        // Intentos fallidos últimas 24h (seguridad del link público).
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: fails } = await supabase
          .from("crm_contract_events")
          .select("slug")
          .in("event", ["unlock_fail", "code_fail", "sign_fail", "pdf_denied"])
          .gte("created_at", dayAgo);
        const failCount: Record<string, number> = {};
        for (const f of fails || []) {
          failCount[f.slug] = (failCount[f.slug] || 0) + 1;
        }
        const body = (data || []).map((c: any) => ({
          ...c,
          password_hash: undefined,
          failed_24h: failCount[c.slug] || 0,
        }));
        return json(200, body);
      }

      case "contracts-create": {
        const c = payload?.contract;
        if (!c?.title || !c?.terms) {
          return json(400, { error: "contract.title y contract.terms son requeridos" });
        }
        const title = String(c.title).trim();
        const baseSlug = slugify(title);
        const slug = await uniqueSlug(baseSlug, supabase);
        const password = randomPassword();
        const contactsRes = await supabase
          .from("crm_contacts")
          .select("first_name, last_name, email")
          .eq("id", String(c.contact_id || ""))
          .maybeSingle();
        const info = contactsRes.data as any;
        const { data, error } = await supabase
          .from("crm_contracts")
          .insert({
            title,
            title_en: c.title_en ? String(c.title_en).trim().slice(0, 300) : null,
            slug,
            contract_type: CONTRACT_TYPES.includes(String(c.contract_type || "")) ? String(c.contract_type) : "servicios",
            contact_id: c.contact_id || null,
            company_id: c.company_id || null,
            currency: c.currency || "EUR",
            value: c.value != null ? c.value : null,
            terms: String(c.terms),
            terms_en: c.terms_en ? String(c.terms_en) : null,
            password_hash: await sha256hex(password),
            status: "sent",
            client_name: c.client_name || (info ? `${info.first_name || ""} ${info.last_name || ""}`.trim() : null) || null,
            client_email: c.client_email || info?.email || null,
          })
          .select()
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, { contract: data, password });
      }

      case "contracts-update": {
        const id = String(payload?.id || "");
        if (!id) return json(400, { error: "id es requerido" });
        const u = payload?.updates || {};
        const clean: Record<string, unknown> = { updated_at: now() };
        for (const k of ["title", "terms", "currency", "status", "title_en", "terms_en"]) {
          if (k in u) clean[k] = u[k] == null ? null : String(u[k]);
        }
        if ("contract_type" in u && CONTRACT_TYPES.includes(String(u.contract_type || ""))) {
          clean.contract_type = String(u.contract_type);
        }
        if ("value" in u && u.value != null) clean.value = u.value;
        if ("contact_id" in u) clean.contact_id = u.contact_id || null;
        if ("company_id" in u) clean.company_id = u.company_id || null;
        if ("client_name" in u) clean.client_name = u.client_name || null;
        if ("client_email" in u) clean.client_email = u.client_email || null;
        if ("password" in u && u.password) clean.password_hash = await sha256hex(String(u.password));
        const { data, error } = await supabase
          .from("crm_contracts")
          .update(clean)
          .eq("id", id)
          .select("*, contact:crm_contacts(id, first_name, last_name, email), company:crm_companies(id, name)")
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, { ...data, password_hash: undefined });
      }

      case "contracts-delete": {
        const id = String(payload?.id || "");
        const { error } = await supabase.from("crm_contracts").delete().eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

      case "contracts-sign-provider": {
        const id = String(payload?.id || "");
        const name = String(payload?.signer_name || "").trim();
        if (!id || !name) return json(400, { error: "id y signer_name son requeridos" });
        const { data: cur } = await supabase
          .from("crm_contracts")
          .select("provider_signed_at, client_signed_at")
          .eq("id", id)
          .maybeSingle();
        if (!cur) return json(404, { error: "Contrato no encontrado" });
        const patch: Record<string, unknown> = {
          provider_signer_name: name,
          provider_signed_at: now(),
          updated_at: now(),
        };
        if (cur.client_signed_at) {
          patch.status = "signed";
          patch.signed_at = now();
        }
        const { data, error } = await supabase
          .from("crm_contracts")
          .update(patch)
          .eq("id", id)
          .select("*, contact:crm_contacts(id, first_name, last_name, email), company:crm_companies(id, name)")
          .single();
        if (error) return json(500, { error: error.message });
        return json(200, { ...data, password_hash: undefined });
      }

      // ============ IMPORTACIÓN MASIVA (CSV) ============
      case "contacts-import": {
        const rows = Array.isArray(payload?.contacts) ? payload.contacts : [];
        if (rows.length === 0) return json(400, { error: "contacts vacío" });
        if (rows.length > 500) return json(400, { error: "máximo 500 filas por importación" });

        const nameFromEmail = (email: string) =>
          (email || "")
            .split("@")[0]
            .replace(/[._\-+]+/g, " ")
            .replace(/\d+/g, "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        const fields = await loadFields(supabase, "person");
        const clean: any[] = [];
        let skipped = 0;
        for (const c of rows) {
          const email = c?.email ? String(c.email).trim().toLowerCase().slice(0, 200) : "";
          const phone = c?.phone ? String(c.phone).trim().slice(0, 60) : "";
          const values: Record<string, any> = resolveValues(c || {}, {}, PERSON_ALIAS);
          if (!values.source) values.source = "import";
          let first = normText(values.nombres, 120) || "";
          if (!first && email) first = nameFromEmail(email);
          if (!first && !email && !phone) {
            skipped++;
            continue;
          }
          if (!first) first = "Sin nombre";
          values.nombres = first;
          if (email) values.correos_electronicos = [email];
          else if (values.correos_electronicos == null) delete values.correos_electronicos;
          const { columns, data } = fieldsToRow(fields, "person", values);
          const st = syncStatusTags("person", values, null, null, true);
          columns.status = st.status;
          columns.tags = st.tags;
          backfillColumns("person", columns, data);
          if (!("photo_url" in columns) && columns.email) columns.photo_url = gravatarUrl(columns.email);
          clean.push({ ...columns, data });
        }

        const nameKey = (first: string | null, last: string | null) =>
          `${(first || "").toLowerCase()}|${(last || "").toLowerCase()}`;

        const emails = [...new Set(clean.map((c) => c.email).filter(Boolean))];
        const firsts = [...new Set(clean.map((c) => c.first_name).filter(Boolean))];
        const dbEmails = new Set<string>();
        const dbNames = new Set<string>();

        if (emails.length > 0) {
          const { data } = await supabase
            .from("crm_contacts")
            .select("email")
            .in("email", emails);
          (data || []).forEach((r: any) => {
            if (r.email) dbEmails.add(String(r.email).toLowerCase());
          });
        }
        if (firsts.length > 0) {
          const { data } = await supabase
            .from("crm_contacts")
            .select("first_name, last_name")
            .in("first_name", firsts);
          (data || []).forEach((r: any) =>
            dbNames.add(nameKey(r.first_name, r.last_name || ""))
          );
        }

        const seenEmails = new Set<string>();
        const seenNames = new Set<string>();
        const toInsert: any[] = [];
        let duplicates = 0;
        for (const c of clean) {
          const key = nameKey(c.first_name, c.last_name || "");
          if (c.email && (seenEmails.has(c.email) || dbEmails.has(c.email))) {
            duplicates++;
            continue;
          }
          if (seenNames.has(key) || dbNames.has(key)) {
            duplicates++;
            continue;
          }
          if (c.email) seenEmails.add(c.email);
          seenNames.add(key);
          toInsert.push(c);
        }

        let inserted = 0;
        if (toInsert.length > 0) {
          const { error } = await supabase.from("crm_contacts").insert(toInsert);
          if (error) return json(500, { error: error.message });
          inserted = toInsert.length;
        }
        return json(200, { inserted, skipped, duplicates });
      }

      case "companies-import": {
        const rows = Array.isArray(payload?.companies) ? payload.companies : [];
        if (rows.length === 0) return json(400, { error: "companies vacío" });
        if (rows.length > 500) return json(400, { error: "máximo 500 filas por importación" });
        const fields = await loadFields(supabase, "company");
        const clean: any[] = [];
        let skipped = 0;
        for (const c of rows) {
          const name = normText(c?.name, 200);
          if (!name) {
            skipped++;
            continue;
          }
          const values: Record<string, any> = resolveValues(c || {}, {}, COMPANY_ALIAS);
          values.nombre = name;
          if (!values.source) values.source = "import";
          const { columns, data } = fieldsToRow(fields, "company", values);
          const st = syncStatusTags("company", values, null, null, true);
          columns.status = st.status;
          columns.tags = st.tags;
          backfillColumns("company", columns, data);
          if (!("logo_url" in columns)) columns.logo_url = null;
          clean.push({ ...columns, data });
        }

        const names = [...new Set(clean.map((c) => c.name.toLowerCase()))];
        const domains = [
          ...new Set(clean.map((c) => c.domain).filter(Boolean) as string[]),
        ];
        const dbNames = new Set<string>();
        const dbDomains = new Set<string>();
        if (names.length > 0) {
          const { data } = await supabase
            .from("crm_companies")
            .select("name")
            .in("name", clean.map((c) => c.name).filter(Boolean).map(String));
          (data || []).forEach((r: any) => {
            if (r.name) dbNames.add(String(r.name).toLowerCase());
          });
        }
        if (domains.length > 0) {
          const { data } = await supabase
            .from("crm_companies")
            .select("domain")
            .in("domain", domains);
          (data || []).forEach((r: any) => {
            if (r.domain) dbDomains.add(String(r.domain).toLowerCase());
          });
        }

        const seenNames = new Set<string>();
        const seenDomains = new Set<string>();
        const toInsert: any[] = [];
        let duplicates = 0;
        for (const c of clean) {
          const nm = c.name.toLowerCase();
          const dm = (c.domain || "").toLowerCase();
          if (seenNames.has(nm) || dbNames.has(nm)) {
            duplicates++;
            continue;
          }
          if (dm && (seenDomains.has(dm) || dbDomains.has(dm))) {
            duplicates++;
            continue;
          }
          seenNames.add(nm);
          if (dm) seenDomains.add(dm);
          toInsert.push(c);
        }

        let inserted = 0;
        if (toInsert.length > 0) {
          const { error } = await supabase.from("crm_companies").insert(toInsert);
          if (error) return json(500, { error: error.message });
          inserted = toInsert.length;
        }
        return json(200, { inserted, skipped, duplicates });
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
            subject_en: payload.subject_en ? String(payload.subject_en).trim() : null,
            body: tplBody,
            body_en: payload.body_en ? String(payload.body_en) : null,
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
        if (payload.subject_en !== undefined) patch.subject_en = payload.subject_en ? String(payload.subject_en).trim() : null;
        if (payload.body !== undefined) patch.body = String(payload.body);
        if (payload.body_en !== undefined) patch.body_en = payload.body_en ? String(payload.body_en) : null;
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

        const lang = String(payload.lang || "es").toLowerCase() === "en" ? "en" : "es";
        const subjectSrc = lang === "en" && template.subject_en ? template.subject_en : template.subject;
        const bodySrc = lang === "en" && template.body_en ? template.body_en : template.body;
        const subject = render(subjectSrc);
        const text = render(bodySrc);
        const esc = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const bodyHtml = text
          .split(/\n{2,}/)
          .map((p) => `<p style="margin:0 0 12px;">${esc(p).replace(/\n/g, "<br>")}</p>`)
          .join("");
        const brand = await getBrand(supabase);
        const html = brandShell({ brand, lang, title: subject, bodyHtml });

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