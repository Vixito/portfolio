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

export const useStatusStore = create<StatusState>((set) => ({
  status: loadStatusFromStorage(),
  setStatus: (status: Status) => {
    set({ status });
    // Guardar en localStorage inmediatamente para persistencia
    if (typeof window !== "undefined") {
      localStorage.setItem("user_status", status);
    }
  },
}));
