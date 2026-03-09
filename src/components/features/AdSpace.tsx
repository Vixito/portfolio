import { useEffect, useRef } from "react";

interface AdSpaceProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para espacios publicitarios con Monetag
 */
function AdSpace({ className = "", style }: AdSpaceProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar si el script ya está cargado
    if (!document.querySelector('script[src*="monetag.com"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.cfasync = "false";
      script.src = "//thubanoa.com/1?z=8939228"; // ID de zona de ejemplo o real
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div
      ref={adRef}
      className={`bg-transparent rounded-lg flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: "250px", width: "100%", ...style }}
    >
      {/* El contenido del anuncio se inyectará aquí o será manejado por el script global */}
      <div id="monetag-ad-container"></div>
    </div>
  );
}

export default AdSpace;
