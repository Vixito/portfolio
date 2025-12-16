import { create } from "zustand";

type Status = "available" | "away" | "busy";

interface StatusState {
  status: Status;
  setStatus: (status: Status) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  status: "available",
  setStatus: (status) => set({ status }),
}));
