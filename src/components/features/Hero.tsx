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
    if (transitionType === "default") {
      // Comportamiento por defecto: Scroll nativo con animación de entrada
      document.body.style.overflow = '';
      
      if (!heroRef.current) return;
      const elements = heroRef.current.querySelectorAll(".hero-section");
      
      const ctx = gsap.context(() => {
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
      }, heroRef);

      return () => {
        ctx.revert();
      };
    } else {
      // Comportamiento secuestrado: Transiciones de pantalla a pantalla
      document.body.style.overflow = 'hidden';
      let isAnimating = false;
      let touchStartY = 0;
      const cooldown = 1200;

      const shouldIgnoreScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        const scrollContainer = target.closest('.overflow-y-auto');
        if (scrollContainer && scrollContainer.scrollTop > 0) {
          return true; // Don't hijack if we can scroll up natively
        }
        return false;
      };

      const handleWheel = (e: WheelEvent) => {
        if (isAnimating) return;
        
        if (e.deltaY > 50) {
          setActiveSection((prev) => {
            if (prev < 1) {
              isAnimating = true;
              setTimeout(() => (isAnimating = false), cooldown);
              return 1;
            }
            return prev;
          });
        } else if (e.deltaY < -50) {
          if (shouldIgnoreScroll(e)) return;
          
          setActiveSection((prev) => {
            if (prev > 0) {
              isAnimating = true;
              setTimeout(() => (isAnimating = false), cooldown);
              return 0;
            }
            return prev;
          });
        }
      };

      const handleTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (isAnimating) return;
        const touchEndY = e.touches[0].clientY;
        const deltaY = touchStartY - touchEndY;

        if (deltaY > 50) {
          setActiveSection((prev) => {
            if (prev < 1) {
              isAnimating = true;
              setTimeout(() => (isAnimating = false), cooldown);
              return 1;
            }
            return prev;
          });
        } else if (deltaY < -50) {
          if (shouldIgnoreScroll(e)) return;

          setActiveSection((prev) => {
            if (prev > 0) {
              isAnimating = true;
              setTimeout(() => (isAnimating = false), cooldown);
              return 0;
            }
            return prev;
          });
        }
      };

      // Use passive: false ONLY if we ever plan to use preventDefault, but we don't need it.
      window.addEventListener('wheel', handleWheel, { passive: true });
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });

      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [transitionType]);

  const profileImageUrl = "https://cdn.vixis.dev/Foto+de+Perfil+2.webp";

  return (
    <section 
      ref={heroRef} 
      className={`relative w-full ${transitionType !== "default" ? "h-screen overflow-hidden" : ""}`}
    >
      <AnimatePresence>
        {heroBg === "starry_night" && (
          <motion.div
            key="starry_night"
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
      <ScrollTransitionWrapper key="section-0" transitionType={transitionType} isActive={activeSection === 0}>
        <div className={`hero-section ${transitionType !== "default" ? "absolute inset-0" : ""} min-h-screen flex items-center justify-center px-4 py-20 relative z-10`}>
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
              <p className="text-lg text-slate-800 font-medium dark:text-gray-400 dark:font-normal text-center md:text-left">
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
      <ScrollTransitionWrapper key="section-1" transitionType={transitionType} isActive={activeSection === 1}>
        <div 
          className={`hero-section ${transitionType !== "default" ? "absolute inset-0 overflow-y-auto pb-20 pt-24" : ""} min-h-screen flex flex-col items-center ${transitionType !== "default" ? "justify-start" : "justify-center"} px-4 relative z-10`}
        >
          <HomeSection />
        </div>
      </ScrollTransitionWrapper>
    </section>
  );
}

export default Hero;
