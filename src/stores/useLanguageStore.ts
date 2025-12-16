import { create } from "zustand";

interface LanguageState {
  language: "es" | "en";
  setLanguage: (lang: "es" | "en") => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: "es",
  setLanguage: (lang) => set({ language: lang }),
}));
