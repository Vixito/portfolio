import { create } from "zustand";

type Status = "available" | "away" | "busy";

interface StatusState {
  status: Status;
  setStatus: (status: Status) => void;
}

// Función para cargar el estado desde localStorage
const loadStatusFromStorage = (): Status => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("user_status");
    if (saved && ["available", "away", "busy"].includes(saved)) {
      return saved as Status;
    }
  }
  return "busy";
};

export const useStatusStore = create<StatusState>((set, get) => ({
  status: loadStatusFromStorage(),
  setStatus: (status: Status) => {
    set({ status });
    // Guardar en localStorage inmediatamente para persistencia
    if (typeof window !== "undefined") {
      localStorage.setItem("user_status", status);
      // Disparar evento para notificar cambios
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "user_status",
          newValue: status,
        })
      );
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

  // También escuchar eventos personalizados
  window.addEventListener("statusChanged", () => {
    const store = useStatusStore.getState();
    const saved = localStorage.getItem("user_status");
    if (
      saved &&
      ["available", "away", "busy"].includes(saved) &&
      store.status !== saved
    ) {
      store.setStatus(saved as Status);
    }
  });
}
