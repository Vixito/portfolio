import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface LanguageState {
  language: "es" | "en";
  setLanguage: (lang: "es" | "en") => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "es",
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
