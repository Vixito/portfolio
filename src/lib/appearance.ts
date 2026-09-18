import { getAppearanceSettings } from "./supabase-functions";

const STORAGE_KEY = "appearance_settings";

type AppearanceSettings = Record<string, any>;

let cache: AppearanceSettings | null = null;
let inflight: Promise<AppearanceSettings> | null = null;

function readStorage(): AppearanceSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppearanceSettings) : null;
  } catch {
    return null;
  }
}

function persist(settings: AppearanceSettings) {
  cache = settings;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage puede estar lleno o bloqueado: no es crítico.
  }
}

// Lectura síncrona del último valor conocido. Permite pintar el fondo correcto
// desde el primer render y evitar el flash del fondo por defecto.
export function getCachedAppearance(): AppearanceSettings | null {
  return cache ?? readStorage();
}

export function getCachedBackground(key: string): string | null {
  const value = getCachedAppearance()?.[key];
  return typeof value === "string" ? value : null;
}

// Carga deduplicada: varias llamadas comparten la misma petición.
export async function loadAppearanceSettings(force = false): Promise<AppearanceSettings> {
  if (!force && cache) return cache;
  if (inflight) return inflight;

  inflight = getAppearanceSettings()
    .then((settings) => {
      persist(settings);
      return settings;
    })
    .catch(() => {
      const stored = readStorage();
      if (stored) cache = stored;
      return (cache ?? {}) as AppearanceSettings;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
