import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsCheckoutHeaders,
  jsonCheckoutResponse,
} from "../_shared/checkout.ts";

/**
 * Webhook de Cal.com (Settings → Developer → Webhooks), SIN necesidad de API key:
 * BOOKING_CREATED → lead en bos_leads, BOOKING_RESCHEDULED → actualiza,
 * BOOKING_CANCELLED → anota. Verificación doble: ?key= en la URL (convención
 * de la casa) + HMAC-SHA256 del body contra x-cal-signature-256 con el mismo
 * secreto (CALCOM_WEBHOOK_SECRET). At-least-once: dedupe por booking uid.
 */
async function verifyCalSignature(
  secret: string,
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  if (!secret || !signature || !rawBody) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(rawBody)
    );
    const hex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) {
      diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error("Error verificando firma Cal.com:", err);
    return false;
  }
}

function attendeeOf(payload: any) {
  const attendees = Array.isArray(payload?.attendees) ? payload.attendees : [];
  return attendees[0] || {};
}

function responsesOf(payload: any): Record<string, any> {
  return payload?.responses && typeof payload.responses === "object"
    ? payload.responses
    : {};
}

function responseValue(responses: Record<string, any>, key: string): string {
  const r = responses[key];
  if (r == null) return "";
  if (typeof r === "object") return String(r.value ?? "");
  return String(r);
}

function topicFor(payload: any): string {
  const title = String(payload?.eventTitle || payload?.title || "Reserva").slice(0, 120);
  const start = payload?.startTime ? new Date(String(payload.startTime)) : null;
  const when =
    start && !Number.isNaN(start.getTime())
      ? start.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
      : "";
  const notes = String(payload?.additionalNotes || "").trim().slice(0, 200);
  return [title, when, notes].filter(Boolean).join(" · ");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsCheckoutHeaders });
  }
  if (req.method !== "POST") {
    return jsonCheckoutResponse(405, { error: "Método no permitido" });
  }

  try {
    const secret = Deno.env.get("CALCOM_WEBHOOK_SECRET") || "";
    if (!secret) {
      console.error("CALCOM_WEBHOOK_SECRET no configurado");
      return jsonCheckoutResponse(500, { error: "Webhook secret no configurado" });
    }
    const url = new URL(req.url);
    if ((url.searchParams.get("key") || "") !== secret) {
      return jsonCheckoutResponse(401, { error: "No autorizado" });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-cal-signature-256") || "";
    if (!(await verifyCalSignature(secret, rawBody, signature))) {
      console.error("Firma de Cal.com inválida");
      return jsonCheckoutResponse(401, { error: "Firma inválida" });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonCheckoutResponse(400, { error: "JSON inválido" });
    }

    const trigger = String(body?.triggerEvent || "");
    const p = body?.payload && typeof body.payload === "object" ? body.payload : {};
    const uid = String(p.uid || "");
    if (!uid) {
      // Ping de prueba del dashboard (sin reserva real): ack sin procesar.
      return jsonCheckoutResponse(200, { ok: true, test: true });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const findLead = async () => {
      const { data } = await supabase
        .from("bos_leads")
        .select("id, payload")
        .eq("source", "calcom")
        .eq("payload->>booking_uid", uid)
        .maybeSingle();
      return data || null;
    };

    const touchConnector = async (patch: Record<string, unknown> = {}) => {
      try {
        await supabase.from("bos_connectors").upsert(
          {
            source: "calcom",
            name: "Cal.com (Agenda)",
            enabled: true,
            config: { kind: "leads", configured: true },
            last_sync_at: new Date().toISOString(),
            last_error: null,
            ...patch,
          },
          { onConflict: "source" }
        );
      } catch {
        // sin DB disponible; nada que hacer
      }
    };

    if (trigger === "BOOKING_CREATED") {
      const existing = await findLead();
      if (existing) {
        return jsonCheckoutResponse(200, { ok: true, duplicate: true });
      }
      const att = attendeeOf(p);
      const responses = responsesOf(p);
      const email =
        String(att.email || responseValue(responses, "email") || "").trim().toLowerCase() || null;
      const name =
        String(att.name || responseValue(responses, "name") || "").trim().slice(0, 120) || null;
      const phone =
        String(att.phoneNumber || responseValue(responses, "attendeePhoneNumber") || "").trim() ||
        null;
      const { error } = await supabase.from("bos_leads").insert({
        source: "calcom",
        name,
        email,
        phone,
        topic: topicFor(p),
        payload: {
          booking_uid: uid,
          booking_id: p.bookingId ?? null,
          event_type_id: p.eventTypeId ?? null,
          event_title: p.eventTitle || null,
          start_time: p.startTime || null,
          end_time: p.endTime || null,
          time_zone: att.timeZone || null,
          location: typeof p.location === "string" ? p.location : null,
          status: p.status || "ACCEPTED",
        },
      });
      if (error) throw new Error(error.message);
      await touchConnector();
      return jsonCheckoutResponse(200, { ok: true, created: true });
    }

    if (trigger === "BOOKING_RESCHEDULED" || trigger === "BOOKING_CANCELLED") {
      const existing = await findLead();
      if (!existing) {
        return jsonCheckoutResponse(200, { ok: true, ignored: true });
      }
      const prevPayload =
        existing.payload && typeof existing.payload === "object" ? existing.payload : {};
      const merged = {
        ...prevPayload,
        start_time: p.startTime ?? prevPayload.start_time ?? null,
        end_time: p.endTime ?? prevPayload.end_time ?? null,
        status: p.status || (trigger === "BOOKING_CANCELLED" ? "CANCELLED" : prevPayload.status || null),
        ...(trigger === "BOOKING_CANCELLED"
          ? { cancelled_at: new Date().toISOString() }
          : {}),
      };
      const { error } = await supabase
        .from("bos_leads")
        .update({
          topic:
            trigger === "BOOKING_CANCELLED"
              ? `${topicFor(p)} (cancelada)`
              : topicFor(p),
          payload: merged,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      await touchConnector();
      return jsonCheckoutResponse(200, { ok: true, updated: trigger });
    }

    return jsonCheckoutResponse(200, { ok: true, ignored: trigger || "unknown" });
  } catch (err) {
    console.error("calcom-webhook error:", err);
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("bos_sync_logs").insert({
        source: "calcom",
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });
    } catch {
      // sin DB disponible; nada que hacer
    }
    return jsonCheckoutResponse(500, {
      error: err instanceof Error ? err.message : "Error interno inesperado",
    });
  }
});
