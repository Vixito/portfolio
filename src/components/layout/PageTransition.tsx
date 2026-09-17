import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";

interface PageTransitionProps {
  children: React.ReactNode;
}

function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Animación de entrada
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          // Limpiar estilos inline al terminar: un transform residual
          // convierte este div en containing block y rompe los `fixed`
          // (overlays como Loading o modales no cubrirían el viewport).
          clearProps: "transform,opacity",
        }
      );
    }
  }, [location.pathname]);

  useEffect(() => {
    setDisplayChildren(children);
  }, [children, location.pathname]);

  return (
    <div ref={contentRef} className="w-full">
      {displayChildren}
    </div>
  );
}

export default PageTransition;
