import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { useTranslation } from "../lib/i18n";
import { SafeHTML } from "../utils/parseHTML";

function About() {
  const { t } = useTranslation();
  const aboutImageUrl = "https://cdn.vixis.dev/Foto+de+Perfil+2.webp";

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Lado izquierdo: Texto */}
          <div className="space-y-4 md:space-y-6 order-2 md:order-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {t("about.title")}
            </h1>
            <div className="space-y-3 md:space-y-4 text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              <p><SafeHTML html={t("about.description1")} /></p>
              <p><SafeHTML html={t("about.description2")} /></p>
              <p><SafeHTML html={t("about.description3")} /></p>
            </div>
            <div className="pt-2 md:pt-4">
              <Link to="/socials" className="cursor-pointer">
                <Button
                  variant="outline"
                  className="cursor-pointer text-sm md:text-base"
                >
                  {t("about.followSocials")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Lado derecho: Foto */}
          <div className="flex justify-center md:justify-end order-1 md:order-2">
            <img
              src={aboutImageUrl}
              alt={t("about.title")}
              className="w-full max-w-xs md:max-w-md aspect-square rounded-full shadow-lg object-cover border-4 md:border-8 lg:border-10 border-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
