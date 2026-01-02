import { create } from "zustand";
import { getUserStatus, updateUserStatus } from "../lib/supabase-functions";

type Status = "available" | "away" | "busy";

interface StatusState {
  status: Status;
  setStatus: (status: Status) => void;
  loadStatus: () => Promise<void>;
  isLoading: boolean;
}

// Función para cargar el estado desde la base de datos
const loadStatusFromDatabase = async (): Promise<Status> => {
  try {
    const status = await getUserStatus();
    return status as Status;
  } catch (error) {
    console.error("Error al cargar status desde base de datos:", error);
    // Fallback a localStorage si falla la BD
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_status");
      if (saved && ["available", "away", "busy"].includes(saved)) {
        return saved as Status;
      }
    }
    return "busy";
  }
};

export const useStatusStore = create<StatusState>((set, get) => {
  // Cargar status inicial desde localStorage mientras se carga desde BD
  const initialStatus: Status = (() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_status");
      if (saved && ["available", "away", "busy"].includes(saved)) {
        return saved as Status;
      }
    }
    return "busy";
  })();

  return {
    status: initialStatus,
    isLoading: false,
    loadStatus: async () => {
      set({ isLoading: true });
      try {
        const status = await loadStatusFromDatabase();
        set({ status, isLoading: false });
        // Sincronizar con localStorage como backup
        if (typeof window !== "undefined") {
          localStorage.setItem("user_status", status);
        }
      } catch (error) {
        console.error("Error al cargar status:", error);
        set({ isLoading: false });
      }
    },
  setStatus: async (status: Status) => {
    set({ status });
    // Guardar en base de datos
    try {
      await updateUserStatus(status);
      // Sincronizar con localStorage como backup
      if (typeof window !== "undefined") {
        localStorage.setItem("user_status", status);
      }
      // Disparar evento para notificar cambios
      window.dispatchEvent(
        new CustomEvent("statusChanged", { detail: status })
      );
    } catch (error) {
      console.error("Error al guardar status en base de datos:", error);
      // Fallback a localStorage si falla la BD
      if (typeof window !== "undefined") {
        localStorage.setItem("user_status", status);
      }
    }
  },
}));

// Suscribirse a cambios en localStorage desde otras pestañas/ventanas
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "user_status" && e.newValue) {
      const store = useStatusStore.getState();
      if (
        store.status !== e.newValue &&
        ["available", "away", "busy"].includes(e.newValue)
      ) {
        store.setStatus(e.newValue as Status);
      }
    }
  });

  // También escuchar eventos personalizados (como CustomEvent con detail)
  window.addEventListener("statusChanged", ((e: CustomEvent<Status>) => {
    const newStatus = e.detail;
    const store = useStatusStore.getState();
    if (
      store.status !== newStatus &&
      ["available", "away", "busy"].includes(newStatus)
    ) {
      store.setStatus(newStatus);
    }
  }) as EventListener);
}
