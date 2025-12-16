import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useLanguageStore } from "../../stores/useLanguageStore";

// Store global para manejar qué dropdown está abierto
let globalDropdownState: { type: string | null; close: () => void } | null =
  null;

export function setGlobalDropdown(type: string | null, closeFn: () => void) {
  if (globalDropdownState && globalDropdownState.type !== type) {
    globalDropdownState.close();
  }
  globalDropdownState = type ? { type, close: closeFn } : null;
}

function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const globoRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useLanguageStore();

  useEffect(() => {
    if (globoRef.current) {
      // Rotación horizontal (eje Y) en lugar de rotación Z
      gsap.to(globoRef.current, {
        rotationY: 360,
        repeat: -1,
        duration: 3,
        ease: "none",
        transformOrigin: "center center",
      });
    }
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Animación del dropdown
  useEffect(() => {
    if (dropdownRef.current) {
      if (isOpen) {
        setGlobalDropdown("language", handleClose);
        dropdownRef.current.style.display = "block";
        gsap.fromTo(
          dropdownRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
        );
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          if (dropdownRef.current) {
            dropdownRef.current.style.display = "none";
          }
          setIsOpen(false);
          setGlobalDropdown(null, () => {});
        },
      });
    } else {
      setIsOpen(false);
      setGlobalDropdown(null, () => {});
    }
  };

  const handleLanguageChange = (lang: "es" | "en") => {
    setLanguage(lang);
    handleClose();
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  // Prevenir doble click
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggle();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer"
        aria-label="Seleccionar idioma"
      >
        <div
          ref={globoRef}
          className="text-xl"
          style={{ transformStyle: "preserve-3d" }}
        >
          🌐
        </div>
        <span className="text-sm font-medium text-purple">
          {language === "es" ? "Español" : "English"}
        </span>
      </button>

      <div
        ref={dropdownRef}
        style={{ display: "none" }}
        className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl overflow-hidden min-w-[140px] z-50"
      >
        <button
          onClick={() => handleLanguageChange("es")}
          className={`w-full px-4 py-2 text-left hover:bg-purple/10 transition-colors cursor-pointer ${
            language === "es"
              ? "bg-purple/20 text-purple font-semibold"
              : "text-gray-700"
          }`}
        >
          Español
        </button>
        <button
          onClick={() => handleLanguageChange("en")}
          className={`w-full px-4 py-2 text-left hover:bg-purple/10 transition-colors cursor-pointer ${
            language === "en"
              ? "bg-purple/20 text-purple font-semibold"
              : "text-gray-700"
          }`}
        >
          English
        </button>
      </div>
    </div>
  );
}

export default LanguageSelector;
