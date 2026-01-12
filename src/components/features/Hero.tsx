import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import StatusBadge from "./StatusBadge";
import AnimationVixis from "./AnimationVixis";
import HomeSection from "./HomeSection";
import { useTranslation } from "../../lib/i18n";

gsap.registerPlugin(ScrollTrigger);

function Hero() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;

    const elements = heroRef.current.querySelectorAll(".hero-section");
    gsap.fromTo(
      elements,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  // URL de tu imagen desde S3/CloudFront
  const profileImageUrl = "https://cdn.vixis.dev/Foto+de+Perfil+2.webp";

  return (
    <section ref={heroRef} className="relative">
      {/* Sección 1: Perfil */}
      <div className="hero-section min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Lado izquierdo: Perfil */}
          <div className="space-y-6">
            <div className="flex justify-center md:justify-start">
              <img
                src={profileImageUrl}
                alt="Carlos Andrés Vicioso Lara"
                className="w-32 h-32 rounded-full object-cover border-4 border-purple shadow-lg"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 text-center md:text-left">
              {t("home.title")}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 text-center md:text-left">
              {t("home.subtitle")}
              <br />
              {t("home.specialization")}
            </p>
            <div className="flex justify-center md:justify-start">
              <StatusBadge />
            </div>
          </div>

          {/* Lado derecho: Animación pixel art */}
          <div className="hidden md:flex items-center justify-center bg-transparent">
            {/* <AnimationVixis /> */}
          </div>
        </div>
      </div>

      {/* Sección 2: Contenido principal */}
      <div className="hero-section min-h-screen flex items-center justify-center px-4">
        <HomeSection />
      </div>
    </section>
  );
}

export default Hero;
