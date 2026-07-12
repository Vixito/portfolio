import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import SnakeTimeline from "./SnakeTimeline";
import HomeSection from "./HomeSection";
import { useTranslation } from "../../lib/i18n";
import CanvasBackground from "./CanvasBackground";
import ScrollTransitionWrapper from "./ScrollTransitionWrapper";
import { getAppearanceSettings } from "../../lib/supabase-functions";
import { useThemeStore } from "../../stores/useThemeStore";

gsap.registerPlugin(ScrollTrigger);

function Hero({ transitionType }: { transitionType?: any }) {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroBg, setHeroBg] = useState("default");
  
  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getAppearanceSettings();
      setHeroBg(settings?.hero_background || "default");
    };
    fetchSettings();

    const channel = new BroadcastChannel('appearance_updates');
    channel.onmessage = (event) => {
      if (event.data === 'updated') {
        fetchSettings();
      }
    };

    return () => {
      channel.close();
    };
  }, []);

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

  const profileImageUrl = "https://cdn.vixis.dev/Foto+de+Perfil+2.webp";

  return (
    <section ref={heroRef} className="relative">
      <AnimatePresence>
        {heroBg === "starry_night" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-0"
          >
            <CanvasBackground mode={theme as 'light' | 'dark'} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sección 1: Perfil */}
      <ScrollTransitionWrapper transitionType={transitionType}>
        <div className="hero-section min-h-screen flex items-center justify-center px-4 py-20 relative z-10">
          <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Lado izquierdo: Perfil */}
            <div className="space-y-6">
              <div className="flex justify-center md:justify-start">
                <img
                  src={profileImageUrl}
                  alt={t("hero.imageAlt")}
                  className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-[#8c52ff] shadow-[0_0_20px_rgba(140,82,255,0.3)] object-cover bg-[#1A1A1A]"
                />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-bold font-montserrat tracking-tight">
                  <span className="block">{t("hero.nameLine1")}</span>
                  <span className="block mt-2">{t("hero.nameLine2")}</span>
                </h1>
                <p className="mt-4 text-xl md:text-2xl text-gray-300">
                  {t("hero.title")}
                  <br />
                  {t("hero.subtitle")}
                </p>
              </div>
              <div className="pt-4">
                <StatusBadge />
              </div>
            </div>

            {/* Lado derecho: Timeline */}
            <div className="hidden md:flex justify-center items-center h-full">
              <div className="w-full max-w-md">
                <SnakeTimeline />
              </div>
            </div>
          </div>
        </div>
      </ScrollTransitionWrapper>

      {/* Sección 2: Contenido principal */}
      <ScrollTransitionWrapper transitionType={transitionType}>
        <div className="hero-section min-h-screen flex items-center justify-center px-4 relative z-10">
          <HomeSection />
        </div>
      </ScrollTransitionWrapper>
    </section>
  );
}

export default Hero;
