// Página pública de contratos: unlock por slug + contraseña, OTP por email
// anti-bots, firma del cliente y auditoría. verify_jwt=false en config.toml.
//
// Flujo seguro:
//   1. unlock (slug + password) → datos del contrato (sin firmar nada)
//   2. send-code (slug + password) → código de 6 dígitos al email del cliente
//   3. verify-code (slug + password + code) → sign_token de un solo uso
//   4. sign (slug + password + sign_token + nombre + email) → firma
// Rate limit: 5 fallos por slug+IP cada 15 min → 429.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CODE_TTL_MS = 15 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_EVENTS = ["unlock_fail", "code_fail", "sign_fail", "pdf_denied"];

const sha256hex = async (s: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const now = () => new Date().toISOString();

const nowMs = (ms: number) => new Date(Date.now() + ms).toISOString();

const getIp = (req: Request): string => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 80);
  return (req.headers.get("x-real-ip") || "unknown").slice(0, 80);
};

const getUa = (req: Request): string =>
  (req.headers.get("user-agent") || "").slice(0, 300);

const genCode = (): string => {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return String(100000 + (Number(b[0]) % 900000));
};

const genToken = (): string => {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
};

const maskEmail = (email: string): string => {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const head = user.slice(0, 1);
  return `${head}***@${domain}`;
};

const logEvent = async (
  supabase: any,
  contract_id: string | null,
  slug: string,
  event: string,
  req: Request
) => {
  try {
    await supabase.from("crm_contract_events").insert({
      contract_id,
      slug,
      event,
      ip: getIp(req),
      user_agent: getUa(req),
    });
  } catch {
    /* auditoría best-effort */
  }
};

const isRateLimited = async (
  supabase: any,
  slug: string,
  ip: string
): Promise<boolean> => {
  const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("crm_contract_events")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
    .eq("ip", ip)
    .in("event", FAIL_EVENTS)
    .gte("created_at", since);
  return (count || 0) >= MAX_FAILS;
};

const contractPublicSelect = `*, company:crm_companies(id, name, logo_url)`;

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
  const action = String(payload?.action || "");
  const slug = String(payload?.slug || "").slice(0, 200);
  const password = String(payload?.password || "");
  const ip = getIp(req);

  try {
    // Estado público mínimo.
    if (action === "status") {
      if (!slug) return json(400, { error: "slug es requerido" });
      const { data, error } = await supabase
        .from("crm_contracts")
        .select("title, status, signed_at, client_signed_at, provider_signed_at, client_email")
        .eq("slug", slug)
        .maybeSingle();
      if (error) return json(500, { error: error.message });
      if (!data) return json(200, { exists: false });
      return json(200, {
        exists: true,
        title: data.title,
        status: data.status,
        signed: !!data.signed_at,
        client_signed: !!data.client_signed_at,
        otp: !!data.client_email,
      });
    }

    if (!slug) return json(400, { error: "slug es requerido" });

    const { data: contract, error: cErr } = await supabase
      .from("crm_contracts")
      .select(contractPublicSelect)
      .eq("slug", slug)
      .maybeSingle();
    if (cErr) return json(500, { error: cErr.message });
    if (!contract) return json(404, { error: "Contrato no encontrado" });

    // Rate limit previo a cualquier validación con secreto.
    if (await isRateLimited(supabase, slug, ip)) {
      await logEvent(supabase, contract.id, slug, "rate_limited", req);
      return json(429, { error: "Demasiados intentos. Espera 15 minutos." });
    }

    const hash = await sha256hex(password);
    if (contract.password_hash !== hash) {
      await logEvent(supabase, contract.id, slug, "unlock_fail", req);
      return json(401, { error: "Contraseña incorrecta" });
    }

    // Desbloquear: valida contraseña y devuelve el contrato (ES+EN).
    if (action === "unlock") {
      await logEvent(supabase, contract.id, slug, "unlock_ok", req);
      return json(200, {
        id: contract.id,
        title: contract.title,
        title_en: contract.title_en || null,
        terms: contract.terms,
        terms_en: contract.terms_en || null,
        currency: contract.currency,
        value: contract.value != null ? Number(contract.value) : null,
        client_name: contract.client_name,
        client_email: contract.client_email,
        email_masked: contract.client_email ? maskEmail(contract.client_email) : null,
        company: contract.company?.name || null,
        status: contract.status,
        otp: !!contract.client_email,
        client_signed_at: contract.client_signed_at,
        provider_signed_at: contract.provider_signed_at,
        signed_at: contract.signed_at,
      });
    }

    // Enviar código OTP al email del cliente.
    if (action === "send-code") {
      if (!contract.client_email) {
        return json(400, {
          error: "Este contrato no tiene email de cliente. Pídelo al administrador.",
        });
      }
      if (contract.client_signed_at) {
        return json(409, { error: "El cliente ya firmó este contrato" });
      }
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const from = Deno.env.get("EMAIL_FROM");
      if (!resendKey || !from) {
        return json(400, { error: "Envío de códigos no configurado" });
      }
      const code = genCode();
      await supabase
        .from("crm_contract_codes")
        .delete()
        .eq("contract_id", contract.id)
        .is("used_at", null);
      const { error: insErr } = await supabase.from("crm_contract_codes").insert({
        contract_id: contract.id,
        code_hash: await sha256hex(code),
        expires_at: nowMs(CODE_TTL_MS),
      });
      if (insErr) return json(500, { error: insErr.message });

      const subject = `Tu código de firma: ${code} / Your signature code: ${code}`;
      const text =
        `Hola,\n\nTu código para firmar el contrato «${contract.title}» es: ${code}\n` +
        `Caduca en 15 minutos. Si no lo pediste, ignora este mensaje.\n\n` +
        `— Vixis Studio\n\n` +
        `Hello,\n\nYour code to sign the contract "${contract.title_en || contract.title}" is: ${code}\n` +
        `It expires in 15 minutes. If you did not request it, ignore this message.`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [contract.client_email], subject, text }),
      });
      if (!res.ok) {
        await logEvent(supabase, contract.id, slug, "code_fail", req);
        return json(502, { error: "No se pudo enviar el código. Inténtalo de nuevo." });
      }
      await logEvent(supabase, contract.id, slug, "code_sent", req);
      return json(200, { ok: true, email_masked: maskEmail(contract.client_email) });
    }

    // Verificar código → token de firma de un solo uso.
    if (action === "verify-code") {
      const code = String(payload?.code || "").replace(/\D/g, "").slice(0, 6);
      if (code.length !== 6) return json(400, { error: "Código inválido" });
      const { data: row } = await supabase
        .from("crm_contract_codes")
        .select("*")
        .eq("contract_id", contract.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row || new Date(row.expires_at).getTime() < Date.now()) {
        await logEvent(supabase, contract.id, slug, "code_fail", req);
        return json(401, { error: "Código caducado. Pide uno nuevo." });
      }
      if ((row.attempts || 0) >= MAX_FAILS) {
        await logEvent(supabase, contract.id, slug, "code_fail", req);
        return json(429, { error: "Demasiados intentos. Pide un código nuevo." });
      }
      if ((await sha256hex(code)) !== row.code_hash) {
        await supabase
          .from("crm_contract_codes")
          .update({ attempts: (row.attempts || 0) + 1 })
          .eq("id", row.id);
        await logEvent(supabase, contract.id, slug, "code_fail", req);
        return json(401, { error: "Código incorrecto" });
      }
      const signToken = genToken();
      await supabase
        .from("crm_contract_codes")
        .update({
          sign_token_hash: await sha256hex(signToken),
          sign_token_expires_at: nowMs(TOKEN_TTL_MS),
        })
        .eq("id", row.id);
      await logEvent(supabase, contract.id, slug, "code_ok", req);
      return json(200, { ok: true, sign_token: signToken, expires_in: 900 });
    }

    // Firma del cliente (exige token de un solo uso + email coincidente).
    if (action === "sign") {
      const signToken = String(payload?.sign_token || "");
      const signer_name = String(payload?.signer_name || "").trim().slice(0, 80);
      const client_email = String(payload?.client_email || "").trim().toLowerCase().slice(0, 200);
      if (!signer_name || signer_name.length < 3) {
        return json(400, { error: "Escribe tu nombre completo para firmar" });
      }
      if (contract.client_signed_at) {
        return json(409, { error: "El cliente ya firmó este contrato" });
      }
      if (!contract.client_email) {
        return json(400, {
          error: "Este contrato no tiene email de cliente. Pídelo al administrador.",
        });
      }
      if (!client_email || client_email !== String(contract.client_email).toLowerCase()) {
        await logEvent(supabase, contract.id, slug, "sign_fail", req);
        return json(400, { error: "El email no coincide con el del contrato" });
      }
      if (!signToken) {
        await logEvent(supabase, contract.id, slug, "sign_fail", req);
        return json(401, { error: "Falta el token de verificación. Verifica el código primero." });
      }
      const { data: row } = await supabase
        .from("crm_contract_codes")
        .select("*")
        .eq("contract_id", contract.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tokenOk =
        row &&
        row.sign_token_hash &&
        row.sign_token_expires_at &&
        new Date(row.sign_token_expires_at).getTime() >= Date.now() &&
        (await sha256hex(signToken)) === row.sign_token_hash;
      if (!tokenOk) {
        await logEvent(supabase, contract.id, slug, "sign_fail", req);
        return json(401, { error: "Verificación caducada. Verifica el código de nuevo." });
      }

      const patch: Record<string, unknown> = {
        client_signer_name: signer_name,
        client_signed_at: now(),
        updated_at: now(),
      };
      if (contract.provider_signed_at) {
        patch.status = "signed";
        patch.signed_at = now();
      }
      const { data, error } = await supabase
        .from("crm_contracts")
        .update(patch)
        .eq("id", contract.id)
        .select("id, title, status, signed_at, client_signed_at, provider_signed_at")
        .single();
      if (error) return json(500, { error: error.message });
      await supabase
        .from("crm_contract_codes")
        .update({ used_at: now() })
        .eq("id", row.id);
      await logEvent(supabase, contract.id, slug, "sign_ok", req);
      return json(200, data);
    }

    return json(400, { error: `Acción desconocida: ${action}` });
  } catch (error) {
    console.error("Error en contracts-public:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});