import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import ScrollableCardStack from "./ScrollableCardStack";
import RadioPlayer from "./RadioPlayer";
import ContactSection from "./ContactSection";
import LatestPostCard from "./LatestPostCard";
import ExperienceCard from "./ExperienceCard";
import AdSpace from "./AdSpace";
import { useTranslation } from "../../lib/i18n";

function HomeSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  useEffect(() => {
    if (!sectionRef.current) return;

    const cards = sectionRef.current.querySelectorAll(".home-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      }
    );
  }, []);

  return (
    <div
      ref={sectionRef}
      className="w-full min-h-screen flex items-center justify-center px-4 py-20"
    >
      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Último Post */}
        <div className="home-card">
          <LatestPostCard />
        </div>

        {/* Experiencia */}
        <div className="home-card">
          <ExperienceCard />
        </div>

        {/* Proyectos con Scrollable Card Stack */}
        <div className="home-card">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t("homeSection.projects")}
              </h2>
            </div>
            <ScrollableCardStack />
          </div>
        </div>

        {/* Radio */}
        <div className="home-card">
          <RadioPlayer />
        </div>

        {/* Contactar */}
        <div className="home-card">
          <ContactSection />
        </div>

        {/* Anuncio al lado de Contactar */}
        <div className="home-card md:col-span-2 lg:col-span-1">
          <AdSpace className="h-full" />
        </div>
      </div>
    </div>
  );
}

export default HomeSection;
