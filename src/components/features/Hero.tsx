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

  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    // Deshabilitar scroll nativo en body
    document.body.style.overflow = 'hidden';

    let isAnimating = false;
    let touchStartY = 0;
    const cooldown = 1200;

    const handleWheel = (e: WheelEvent) => {
      if (isAnimating) return;

      if (e.deltaY > 50 && activeSection < 1) {
        isAnimating = true;
        setActiveSection(1);
        setTimeout(() => (isAnimating = false), cooldown);
      } else if (e.deltaY < -50 && activeSection > 0) {
        isAnimating = true;
        setActiveSection(0);
        setTimeout(() => (isAnimating = false), cooldown);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isAnimating) return;
      const touchEndY = e.touches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      if (deltaY > 50 && activeSection < 1) {
        isAnimating = true;
        setActiveSection(1);
        setTimeout(() => (isAnimating = false), cooldown);
      } else if (deltaY < -50 && activeSection > 0) {
        isAnimating = true;
        setActiveSection(0);
        setTimeout(() => (isAnimating = false), cooldown);
      }
    };

    // Usar passive: false para poder prevenir el default si fuera necesario,
    // pero aquí solo escuchamos para cambiar el estado.
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activeSection]);

  const profileImageUrl = "https://cdn.vixis.dev/Foto+de+Perfil+2.webp";

  return (
    <section ref={heroRef} className="relative w-full h-screen overflow-hidden">
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
      <ScrollTransitionWrapper transitionType={transitionType} isActive={activeSection === 0}>
        <div className="hero-section absolute inset-0 min-h-screen flex items-center justify-center px-4 py-20 relative z-10">
          <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Lado izquierdo: Perfil */}
            <div className="space-y-6">
              <div className="flex justify-center md:justify-start">
                <img
                  src={profileImageUrl}
                  alt="Carlos Andrés Vicioso Lara"
                  className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-[#8c52ff] shadow-[0_0_20px_rgba(140,82,255,0.3)] object-cover bg-[#1A1A1A]"
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 text-center md:text-left font-montserrat tracking-tight">
                {t("home.title")}
              </h1>
              <p className="mt-4 text-xl md:text-2xl text-gray-600 dark:text-gray-400 text-center md:text-left">
                {t("home.subtitle")}
                <br />
                {t("home.specialization")}
              </p>
              <div className="pt-4 flex justify-center md:justify-start">
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
      <ScrollTransitionWrapper transitionType={transitionType} isActive={activeSection === 1}>
        <div className="hero-section absolute inset-0 min-h-screen flex items-center justify-center px-4 relative z-10">
          <HomeSection />
        </div>
      </ScrollTransitionWrapper>
    </section>
  );
}

export default Hero;
