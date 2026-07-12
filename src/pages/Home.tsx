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
  const [transitionType, setTransitionType] = useState<"default" | "horizontal_blinds" | "vertical_blinds" | "random_grid" | "column_grid">("default");

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getAppearanceSettings();
      setTransitionType(settings?.home_scroll_transition || "default");
    };
    fetchSettings();
  }, []);

  return (
    <ScrollTransitionWrapper transitionType={transitionType}>
      <div>
        <Hero />
        {/* Aquí irá el resto del contenido de Home */}
      </div>
    </ScrollTransitionWrapper>
  );
}

export default Home;
