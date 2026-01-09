import { useEffect, useRef } from "react";

interface AdsterraSocialbarProps {
  position?: "left" | "right";
  className?: string;
}

/**
 * Componente para integrar Adsterra Socialbar
 * Este componente carga el script de Adsterra Socialbar de forma segura
 * y lo muestra en los lados de la página
 *
 * Referencia: https://help-publishers.adsterra.com/en/collections/2274770-ad-units-and-code-snippets
 *
 * Para habilitar/deshabilitar, usar la variable de entorno VITE_ADSTERRA_ENABLED
 * (por defecto: false en desarrollo, true en producción si está configurada)
 */
function AdsterraSocialbar({
  position = "left",
  className = "",
}: AdsterraSocialbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar si Adsterra está habilitado
    const isEnabled =
      import.meta.env.VITE_ADSTERRA_ENABLED === "true" ||
      (import.meta.env.PROD &&
        import.meta.env.VITE_ADSTERRA_ENABLED !== "false");

    if (!isEnabled) {
      if (import.meta.env.DEV) {
        console.debug("Adsterra está deshabilitado");
      }
      return;
    }

    // Verificar si el script ya está cargado
    const existingScript = document.querySelector(
      'script[src*="openairtowhardworking.com/55/44/9a"]'
    );

    if (existingScript) {
      // El script ya está cargado, no hacer nada más
      return;
    }

    // Crear y cargar el script de Adsterra Socialbar
    const script = document.createElement("script");
    script.src =
      "https://openairtowhardworking.com/55/44/9a/55449a94b322a1e14ef468e1d94c0f24.js";
    script.async = true;
    script.defer = true;

    // Manejar errores de carga
    script.onerror = () => {
      if (import.meta.env.DEV) {
        console.debug("Error al cargar script de Adsterra Socialbar");
      }
    };

    // Agregar el script al head
    document.head.appendChild(script);

    // Cleanup: no remover el script al desmontar porque puede estar en uso
    return () => {
      // No hacer cleanup para mantener el script activo
    };
  }, []);

  // Verificar si Adsterra está habilitado antes de renderizar
  const isEnabled =
    import.meta.env.VITE_ADSTERRA_ENABLED === "true" ||
    (import.meta.env.PROD && import.meta.env.VITE_ADSTERRA_ENABLED !== "false");

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed ${
        position === "left" ? "left-0" : "right-0"
      } top-0 h-full z-30 ${className}`}
      style={
        {
          // El Socialbar se activa automáticamente cuando el script está cargado
          // Este contenedor solo actúa como referencia
        }
      }
    />
  );
}

export default AdsterraSocialbar;
