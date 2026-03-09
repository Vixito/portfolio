import { useEffect } from "react";

/**
 * Componente para integrar Monetag Multi-Tag 
 * Se encarga de cargar el script global que maneja Social Bar, Popunder, etc.
 */
function AdsterraSocialbar() {
  useEffect(() => {
    // Evitar duplicados
    if (!document.querySelector('script[src*="monetag.com"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.cfasync = "false";
      script.src = "//thubanoa.com/1?z=8939228"; // ID de zona global de Monetag
      document.head.appendChild(script);
    }
  }, []);

  return null;
}

export default AdsterraSocialbar;
