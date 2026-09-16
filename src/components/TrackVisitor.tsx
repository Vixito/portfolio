import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SID_KEY = "vixis_visitor_sid";

function getSessionId(): string {
  try {
    const existing = localStorage.getItem(SID_KEY);
    if (existing) return existing;
    const sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(SID_KEY, sid);
    return sid;
  } catch {
    return "anon";
  }
}

// Beacon ligero de visitantes: una fila por sesión + página + día en
// portfolio_visitors (server-side añade IP y user-agent).
export default function TrackVisitor() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // No trackear el panel admin.
    if (window.location.hostname.startsWith("admin.")) return;

    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      fetch(`${url}/functions/v1/track-visitor`, {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: getSessionId(),
          page: pathname,
          referrer: document.referrer || null,
          host: window.location.hostname,
        }),
        keepalive: true,
      }).catch(() => {
        // best-effort: no bloquear la navegación si falla el beacon
      });
    } catch {
      // ignore
    }
  }, [pathname]);

  return null;
}