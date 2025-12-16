import { useEffect, useRef } from "react";
import { gsap } from "gsap";

function HeroFooter() {
  const vixisTextRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!vixisTextRef.current) return;

    gsap.fromTo(
      vixisTextRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
    );
  }, []);

  // Mostrar años solo si currentYear > 2025
  const yearText = currentYear > 2025 ? `2025 - ${currentYear}` : "2025";

  return (
    <footer className="w-full">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
        {/* Izquierda: Developed by y años */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">Developed by...</p>
          <p className="text-sm text-gray-600">{yearText}</p>
        </div>

        {/* Derecha: Vixis gigante */}
        <div
          ref={vixisTextRef}
          className="text-7xl md:text-8xl lg:text-9xl font-extrabold text-purple leading-none"
          style={{
            fontFamily: "'Nunito', sans-serif",
            letterSpacing: "-0.05em",
          }}
        >
          Vixis
        </div>
      </div>
    </footer>
  );
}

export default HeroFooter;
