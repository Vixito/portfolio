import Hero from "../components/features/Hero";
import { useSEO } from "../hooks/useSEO";
import { useTranslation } from "../lib/i18n";

function Home() {
  const { t } = useTranslation();
  useSEO({
    description: t("contactSection.description"),
  });

  return (
    <div>
      <Hero />
      {/* Aquí irá el resto del contenido de Home */}
    </div>
  );
}

export default Home;
