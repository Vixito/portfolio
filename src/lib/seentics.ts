const SEENTICS_URL = import.meta.env.VITE_SEENTICS_URL as string | undefined;
const SEENTICS_SITE_ID = import.meta.env.VITE_SEENTICS_SITE_ID as string | undefined;

export function loadSeentics(): void {
  if (!SEENTICS_URL || !SEENTICS_SITE_ID) return;

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return;

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-website-id][src*="seentics"]'
  );
  if (existing) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${SEENTICS_URL.replace(/\/$/, "")}/trackers/seentics.js`;
  script.dataset.websiteId = SEENTICS_SITE_ID;
  document.head.appendChild(script);
}