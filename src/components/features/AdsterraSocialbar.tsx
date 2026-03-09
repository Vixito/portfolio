import { useEffect } from "react";

/**
 * Componente para cargar el script global de Monetag (Multi-Tag)
 * El script principal está en index.html, este componente 
 * actúa como salvaguarda en caso de que necesite cargarse dinámicamente.
 */
function AdsterraSocialbar() {
  useEffect(() => {
    // Verificar si el script ya existe para evitar duplicados
    if (!document.querySelector('script[src*="quge5.com"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.cfasync = "false";
      script.src = "https://quge5.com/88/tag.min.js";
      script.dataset.zone = "217851";
      document.head.appendChild(script);
    }
  }, []);

  return null;
}

export default AdsterraSocialbar;
