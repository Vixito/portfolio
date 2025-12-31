import { useEffect, useRef } from "react";

interface AdSpaceProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para espacios publicitarios monetarios con Google AdSense
 */
function AdSpace({ className = "", style }: AdSpaceProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cargar script de AdSense si no está cargado
    if (!document.querySelector('script[src*="adsbygoogle"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8441115988276309";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    // Inicializar AdSense cuando el script esté listo
    const initAdSense = () => {
      if (window.adsbygoogle && adRef.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          console.error("Error inicializando AdSense:", e);
        }
      }
    };

    // Esperar a que el script esté cargado
    if (window.adsbygoogle) {
      initAdSense();
    } else {
      const checkInterval = setInterval(() => {
        if (window.adsbygoogle) {
          initAdSense();
          clearInterval(checkInterval);
        }
      }, 100);

      // Limpiar después de 5 segundos si no se carga
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  }, []);

  return (
    <div
      ref={adRef}
      className={`bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center ${className}`}
      style={{ minHeight: "250px", ...style }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client="ca-pub-8441115988276309"
        data-ad-slot=""
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}

// Extender Window interface para TypeScript
declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export default AdSpace;
