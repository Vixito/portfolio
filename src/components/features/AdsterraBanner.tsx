import { useEffect, useRef, useState } from "react";

interface AdsterraBannerProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para integrar Adsterra Banner
 * Este componente carga el script de Adsterra Banner de forma segura
 * y lo muestra en los espacios donde está AdSense
 *
 * Referencia: https://help-publishers.adsterra.com/en/collections/2274770-ad-units-and-code-snippets
 *
 * Para habilitar/deshabilitar, usar la variable de entorno VITE_ADSTERRA_ENABLED
 * (por defecto: false en desarrollo, true en producción si está configurada)
 */
function AdsterraBanner({ className = "", style }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [uniqueId] = useState(
    () => `adsterra-banner-${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    // Verificar si Adsterra está habilitado
    const isEnabled =
      import.meta.env.VITE_ADSTERRA_ENABLED === "true" ||
      (import.meta.env.PROD &&
        import.meta.env.VITE_ADSTERRA_ENABLED !== "false");

    if (!isEnabled || !containerRef.current) {
      return;
    }

    // Configurar las opciones de Adsterra globalmente (necesario antes de cargar el script)
    if (!(window as any).atOptions) {
      (window as any).atOptions = {
        key: "d1c3f3974459f71dfabd40e46ad89a97",
        format: "iframe",
        height: 250,
        width: 300,
        params: {},
      };
    }

    // Verificar si el script ya está cargado
    const existingScript = document.querySelector(
      'script[src*="openairtowhardworking.com/d1c3f3974459f71dfabd40e46ad89a97/invoke.js"]'
    );

    // Función para inicializar el banner cuando el contenedor esté listo
    const initBanner = () => {
      if (containerRef.current && (window as any).atOptions) {
        // El script de Adsterra necesita que el contenedor esté en el DOM
        // y que el script se ejecute para crear el iframe
        // El script buscará contenedores con el ID o data-adsterra-key
      }
    };

    if (existingScript) {
      // Si el script ya está cargado, esperar un momento y verificar si necesita reinicialización
      setTimeout(() => {
        // Si el contenedor ya tiene un iframe, no hacer nada
        if (
          containerRef.current &&
          !containerRef.current.querySelector("iframe")
        ) {
          // El script debería crear el iframe automáticamente
          // Si no lo hace, puede que necesite reinicialización
          if (import.meta.env.DEV) {
            console.debug(
              "Script de Adsterra cargado pero iframe no encontrado, esperando..."
            );
          }
        }
      }, 500);
      return;
    }

    // Crear y cargar el script de Adsterra Banner
    const script = document.createElement("script");
    script.src =
      "https://openairtowhardworking.com/d1c3f3974459f71dfabd40e46ad89a97/invoke.js";
    script.async = true;
    script.defer = true;

    // Manejar errores de carga
    script.onerror = () => {
      if (import.meta.env.DEV) {
        console.debug("Error al cargar script de Adsterra Banner");
      }
    };

    // Cuando el script se carga, esperar un momento para que el DOM esté listo
    script.onload = () => {
      // El script de Adsterra debería buscar automáticamente contenedores con el ID
      // Esperar un momento para que el script procese el DOM
      setTimeout(() => {
        if (
          containerRef.current &&
          !containerRef.current.querySelector("iframe")
        ) {
          if (import.meta.env.DEV) {
            console.debug(
              "Script de Adsterra cargado pero iframe no creado automáticamente"
            );
          }
        }
      }, 500);
    };

    // Agregar el script al head
    document.head.appendChild(script);

    // Cleanup
    return () => {
      // No remover el script para mantenerlo activo
    };
  }, [uniqueId]);

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
      className={`bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center ${className}`}
      style={{ minHeight: "250px", width: "100%", ...style }}
      id={uniqueId}
      data-adsterra-key="d1c3f3974459f71dfabd40e46ad89a97"
    >
      {/* El iframe se creará automáticamente por el script de Adsterra */}
    </div>
  );
}

// Extender Window interface para TypeScript
declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, any>;
    };
  }
}

export default AdsterraBanner;
