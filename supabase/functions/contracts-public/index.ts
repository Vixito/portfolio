// Página pública de contratos: unlock por slug + contraseña y firma del cliente.
// verify_jwt=false en config.toml.
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

const sha256hex = async (s: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const now = () => new Date().toISOString();

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
  const slug = String(payload?.slug || "");

  try {
    // Estado público mínimo: existe y tiene permisos de firma.
    if (action === "status") {
      if (!slug) return json(400, { error: "slug es requerido" });
      const { data, error } = await supabase
        .from("crm_contracts")
        .select("title, status, signed_at, client_signed_at, provider_signed_at")
        .eq("slug", slug)
        .maybeSingle();
      if (error) return json(500, { error: error.message });
      if (!data) return json(404, { error: "Contrato no encontrado" });
      return json(200, {
        title: data.title,
        status: data.status,
        signed: !!data.signed_at,
        client_signed: !!data.client_signed_at,
      });
    }

    // Desbloquear: valida contraseña y devuelve el contrato completo.
    if (action === "unlock") {
      if (!slug) return json(400, { error: "slug es requerido" });
      const password = String(payload?.password || "");
      const hash = await sha256hex(password);
      const { data, error } = await supabase
        .from("crm_contracts")
        .select(contractPublicSelect)
        .eq("slug", slug)
        .maybeSingle();
      if (error) return json(500, { error: error.message });
      if (!data) return json(404, { error: "Contrato no encontrado" });
      if (data.password_hash !== hash) return json(401, { error: "Contraseña incorrecta" });
      return json(200, {
        id: data.id,
        title: data.title,
        terms: data.terms,
        currency: data.currency,
        value: data.value != null ? Number(data.value) : null,
        client_name: data.client_name,
        client_email: data.client_email,
        company: data.company?.name || null,
        status: data.status,
        client_signed_at: data.client_signed_at,
        provider_signed_at: data.provider_signed_at,
        signed_at: data.signed_at,
      });
    }

    // Firma del cliente.
    if (action === "sign") {
      const password = String(payload?.password || "");
      const signer_name = String(payload?.signer_name || "").trim();
      const client_email = String(payload?.client_email || "").trim().toLowerCase();
      if (!slug) return json(400, { error: "slug es requerido" });
      if (!signer_name) return json(400, { error: "signer_name es requerido" });
      const hash = await sha256hex(password);
      const { data: contract } = await supabase
        .from("crm_contracts")
        .select("id, password_hash, client_signed_at, provider_signed_at, client_email, status")
        .eq("slug", slug)
        .maybeSingle();
      if (!contract) return json(404, { error: "Contrato no encontrado" });
      if (contract.password_hash !== hash) return json(401, { error: "Contraseña incorrecta" });
      if (contract.client_signed_at) {
        return json(409, { error: "El cliente ya firmó este contrato" });
      }
      // Validación débil de email: debe coincidir si ya está fijado.
      if (contract.client_email && client_email && contract.client_email !== client_email) {
        return json(400, { error: "El email no coincide con el del contrato" });
      }
      const patch: Record<string, unknown> = {
        client_signer_name: signer_name,
        client_signed_at: now(),
        client_email: client_email || contract.client_email || null,
        updated_at: now(),
      };
      if (contract.provider_signed_at) {
        patch.status = "signed";
        patch.signed_at = now();
      } else if (contract.status !== "signed") {
        patch.status = "signed";
      }
      const { data, error } = await supabase
        .from("crm_contracts")
        .update(patch)
        .eq("id", contract.id)
        .select("id, title, status, signed_at, client_signed_at, provider_signed_at")
        .single();
      if (error) return json(500, { error: error.message });
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