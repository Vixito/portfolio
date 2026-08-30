import { useEffect, useState } from "react";
import Hero from "../components/features/Hero";
import { useSEO } from "../hooks/useSEO";
import { useTranslation } from "../lib/i18n";
import ScrollTransitionWrapper from "../components/features/ScrollTransitionWrapper";
import { getAppearanceSettings } from "../lib/supabase-functions";

function Home() {
  const { t } = useTranslation();
  useSEO({
    description: t("contactSection.description"),
  });
  const [transitionType, setTransitionType] = useState<"default" | "horizontal_blinds" | "vertical_blinds" | "random_grid" | "column_grid">(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("home_scroll_transition");
      if (cached) return cached as any;
    }
    return "default";
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getAppearanceSettings();
      if (settings?.home_scroll_transition) {
        setTransitionType(settings.home_scroll_transition);
        localStorage.setItem("home_scroll_transition", settings.home_scroll_transition);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div>
      <Hero transitionType={transitionType} />
      {/* Aquí irá el resto del contenido de Home */}
    </div>
  );
}

export default Home;
