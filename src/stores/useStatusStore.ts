import { create } from "zustand";

type Status = "available" | "away" | "busy";

interface StatusState {
  status: Status;
  setStatus: (status: Status) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  status: "busy",
  setStatus: (status) => set({ status }),
}));
