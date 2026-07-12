import Hero from "../components/features/Hero";
import { useSEO } from "../hooks/useSEO";
import { useTranslation } from "../lib/i18n";
import HomeSection from "../components/features/HomeSection";

function Home() {
  const { t } = useTranslation();
  useSEO({
    description: t("contactSection.description"),
  });

  return (
    <div>
      <Hero />
    </div>
  );
}

export default Home;
