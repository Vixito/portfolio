// OAuth con Google (People API) para traer contactos al CRM.
// Acciones admin (requieren token): status, start, sync, disconnect.
// Acción pública: callback (redirect de Google), validada con `state` firmado.
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

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (input: string | Uint8Array): string => {
  const bytes = typeof input === "string" ? enc.encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlDecode = (input: string): string => {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return dec.decode(bytes);
};

const stateSecret = (): string => {
  const secret = Deno.env.get("JWT_ADMIN_SECRET");
  if (!secret) throw new Error("JWT_ADMIN_SECRET no configurada");
  return secret;
};

const hmac = async (data: string): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(stateSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
};

const signState = async (payload: Record<string, unknown>): Promise<string> => {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(await hmac(body));
  return `${body}.${sig}`;
};

const verifyState = async (
  state: string
): Promise<Record<string, any> | null> => {
  const [body, sig] = (state || "").split(".");
  if (!body || !sig) return null;
  try {
    const expected = b64url(await hmac(body));
    if (expected !== sig) return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (!payload.t || Date.now() - Number(payload.t) > 10 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
};

const GOOGLE_SCOPE = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "openid",
  "email",
].join(" ");

const googleClientId = () => Deno.env.get("GOOGLE_CLIENT_ID") || "";
const googleClientSecret = () => Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const supabaseUrl = () => Deno.env.get("SUPABASE_URL") || "";
const redirectUri = () =>
  `${supabaseUrl()}/functions/v1/crm-oauth?action=callback`;

const serviceClient = () =>
  createClient(
    supabaseUrl(),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

const nameFromEmail = (email: string): string =>
  (email || "")
    .split("@")[0]
    .replace(/[._\-+]+/g, " ")
    .replace(/\d+/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const nameKey = (first: string, last: string): string =>
  `${(first || "").toLowerCase()}|${(last || "").toLowerCase()}`;

async function refreshAccessToken(row: any): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    refresh_token: row.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

async function getValidAccessToken(
  supabase: any,
  row: any
): Promise<string | null> {
  const notExpired =
    row.token_expires_at &&
    new Date(row.token_expires_at).getTime() - Date.now() > 60 * 1000;
  if (row.access_token && notExpired) return row.access_token;
  if (!row.refresh_token) return null;
  const token = await refreshAccessToken(row);
  if (!token) return null;
  await supabase
    .from("crm_integrations")
    .update({
      access_token: token,
      token_expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  return token;
}

async function fetchAllContacts(supabase: any) {
  const all: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("crm_contacts")
      .select("id, first_name, last_name, email, external_id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

const mapGooglePerson = (person: any) => {
  const name = person.names?.[0] || {};
  const email = person.emailAddresses?.[0]?.value || "";
  const phone = person.phoneNumbers?.[0]?.value || "";
  const org = person.organizations?.[0] || {};
  let first = (name.givenName || "").trim();
  let last = (name.familyName || "").trim();
  if (!first && name.displayName) {
    const parts = String(name.displayName).trim().split(/\s+/);
    first = parts.slice(0, -1).join(" ") || parts[0] || "";
    last = parts.length > 1 ? parts[parts.length - 1] : last;
  }
  if (!first && email) first = nameFromEmail(email);

  const urls: string[] = (person.urls || [])
    .map((u: any) => u.value)
    .filter(Boolean);
  const website = urls.find((u) => !/linkedin|github|twitter|x\.com/i.test(u)) || "";
  const linkedin = urls.find((u) => /linkedin/i.test(u)) || "";
  const github = urls.find((u) => /github/i.test(u)) || "";
  const xHandle = urls.find((u) => /twitter|x\.com/i.test(u)) || "";

  const bday = person.birthdays?.find((b: any) => b.date)?.date;
  const birthdate = bday
    ? `${bday.year || "1900"}-${String(bday.month).padStart(2, "0")}-${String(
        bday.day
      ).padStart(2, "0")}`
    : "";

  return {
    external_source: "google",
    external_id: person.resourceName || "",
    first_name: first,
    last_name: last,
    email,
    phone,
    phone2: person.phoneNumbers?.[1]?.value || "",
    job_title: org.title || "",
    company_name: org.name || "",
    website,
    linkedin,
    github,
    x_handle: xHandle,
    address: person.addresses?.[0]?.formattedValue || "",
    birthdate: birthdate.startsWith("1900") ? "" : birthdate,
    notes: person.biographies?.[0]?.value || "",
    photo_url: person.photos?.[0]?.url || "",
    source: "google",
    tags: [],
  };
};

async function runSync(supabase: any, row: any) {
  const token = await getValidAccessToken(supabase, row);
  if (!token) throw new Error("No se pudo renovar el token de Google");

  const people: any[] = [];
  let pageToken = "";
  do {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set(
      "personFields",
      "names,emailAddresses,phoneNumbers,organizations,urls,addresses,biographies,birthdays,photos"
    );
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`People API ${res.status}: ${err.slice(0, 300)}`);
    }
    const data = await res.json();
    people.push(...(data.connections || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  const existing = await fetchAllContacts(supabase);
  const byExternal = new Map<string, any>();
  const byEmail = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const c of existing) {
    if (c.external_id) byExternal.set(c.external_id, c);
    if (c.email) byEmail.set(String(c.email).toLowerCase(), c);
    byName.set(nameKey(c.first_name, c.last_name || ""), c);
  }

  const companyCache = new Map<string, string>();
  const { data: companies } = await supabase
    .from("crm_companies")
    .select("id, name");
  (companies || []).forEach((c: any) =>
    companyCache.set(String(c.name || "").toLowerCase(), c.id)
  );

  let inserted = 0;
  let linked = 0;
  let skipped = 0;

  for (const person of people) {
    const rec = mapGooglePerson(person);
    if (!rec.first_name && !rec.email && !rec.phone) {
      skipped++;
      continue;
    }
    if (!rec.first_name) rec.first_name = "Sin nombre";

    const match =
      (rec.external_id && byExternal.get(rec.external_id)) ||
      (rec.email && byEmail.get(rec.email.toLowerCase())) ||
      byName.get(nameKey(rec.first_name, rec.last_name));

    if (match) {
      if (rec.external_id && !match.external_id) {
        await supabase
          .from("crm_contacts")
          .update({ external_source: "google", external_id: rec.external_id })
          .eq("id", match.id);
      }
      linked++;
      continue;
    }

    let companyId: string | null = null;
    if (rec.company_name) {
      const key = rec.company_name.toLowerCase();
      companyId = companyCache.get(key) || null;
      if (!companyId) {
        const { data: nc } = await supabase
          .from("crm_companies")
          .insert({ name: rec.company_name })
          .select("id")
          .single();
        if (nc?.id) {
          companyId = nc.id;
          companyCache.set(key, nc.id);
        }
      }
    }

    const { error } = await supabase.from("crm_contacts").insert({
      company_id: companyId,
      first_name: String(rec.first_name).slice(0, 120),
      last_name: rec.last_name ? String(rec.last_name).slice(0, 120) : null,
      email: rec.email ? rec.email.toLowerCase().slice(0, 200) : null,
      phone: rec.phone ? rec.phone.slice(0, 60) : null,
      phone2: rec.phone2 ? rec.phone2.slice(0, 60) : null,
      photo_url: rec.photo_url || null,
      source: "google",
      external_source: "google",
      external_id: rec.external_id || null,
      job_title: rec.job_title ? rec.job_title.slice(0, 150) : null,
      website: rec.website ? rec.website.slice(0, 300) : null,
      linkedin: rec.linkedin ? rec.linkedin.slice(0, 300) : null,
      github: rec.github ? rec.github.slice(0, 300) : null,
      x_handle: rec.x_handle ? rec.x_handle.slice(0, 120) : null,
      address: rec.address ? rec.address.slice(0, 300) : null,
      birthdate: rec.birthdate || null,
      notes: rec.notes ? rec.notes.slice(0, 2000) : null,
    });
    if (error) {
      skipped++;
      continue;
    }
    inserted++;
  }

  const result = { inserted, linked, skipped, total: people.length };
  await supabase
    .from("crm_integrations")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_result: result,
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let bodyJson: any = {};
  if (req.method === "POST") {
    try {
      bodyJson = await req.clone().json();
    } catch {
      bodyJson = {};
    }
  }
  const action = url.searchParams.get("action") || bodyJson.action || "";

  try {
    // -------- Callback público de Google --------
    if (action === "callback") {
      const code = url.searchParams.get("code") || "";
      const state = url.searchParams.get("state") || "";
      const error = url.searchParams.get("error");
      const payload = await verifyState(state);

      if (!payload) {
        return new Response("Estado OAuth inválido o expirado.", { status: 400 });
      }
      const back = (payload.o as string) || "/admin";

      if (error || !code) {
        return Response.redirect(`${back}/admin?google=error`, 302);
      }

      const body = new URLSearchParams({
        code,
        client_id: googleClientId(),
        client_secret: googleClientSecret(),
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      });
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return new Response(`Error al intercambiar el código: ${err}`, {
          status: 400,
        });
      }
      const tokens = await tokenRes.json();

      let accountEmail = "";
      try {
        const infoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        if (infoRes.ok) accountEmail = (await infoRes.json()).email || "";
      } catch {
        /* opcional */
      }

      const supabase = serviceClient();
      await supabase.from("crm_integrations").upsert(
        {
          provider: "google",
          account_email: accountEmail,
          access_token: tokens.access_token || null,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          scopes: (tokens.scope || "").split(" ").filter(Boolean),
          status: "connected",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider" }
      );

      return Response.redirect(`${back}/admin?google=connected`, 302);
    }

    // -------- Acciones admin --------
    const admin = await verifyAdminToken(req);
    if (!admin) return json(401, { error: "No autorizado" });

    const supabase = serviceClient();

    if (action === "status") {
      const { data } = await supabase
        .from("crm_integrations")
        .select(
          "provider, account_email, status, last_sync_at, last_sync_result, scopes, token_expires_at"
        )
        .eq("provider", "google")
        .maybeSingle();
      return json(200, {
        google: data || null,
        configured: Boolean(googleClientId() && googleClientSecret()),
        redirect_uri: redirectUri(),
      });
    }

    if (action === "start") {
      if (!googleClientId() || !googleClientSecret()) {
        return json(400, {
          error:
            "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en los secretos de Supabase.",
        });
      }
      const origin = req.headers.get("origin") || "https://vixis.dev";
      const state = await signState({ o: origin, t: Date.now() });
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", googleClientId());
      authUrl.searchParams.set("redirect_uri", redirectUri());
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", GOOGLE_SCOPE);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("include_granted_scopes", "true");
      authUrl.searchParams.set("state", state);
      return json(200, { url: authUrl.toString() });
    }

    if (action === "sync") {
      const { data: row } = await supabase
        .from("crm_integrations")
        .select("*")
        .eq("provider", "google")
        .maybeSingle();
      if (!row || (!row.refresh_token && !row.access_token)) {
        return json(400, { error: "Google no está conectado" });
      }
      const result = await runSync(supabase, row);
      return json(200, { result });
    }

    if (action === "disconnect") {
      await supabase
        .from("crm_integrations")
        .delete()
        .eq("provider", "google");
      return json(200, { ok: true });
    }

    return json(400, { error: "Acción no reconocida" });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : "Error inesperado",
    });
  }
});
