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

            {/* Lado derecho: Timeline serpiente */}
            <div className="hidden md:flex items-center justify-center bg-transparent">
              <SnakeTimeline />
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
