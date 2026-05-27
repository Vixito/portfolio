import { useEffect, useRef } from "react";

interface AdSpaceProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para espacios publicitarios (Banners 300x250 de Adsterra)
 */
function AdSpace({ className = "", style }: AdSpaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Asegurar que cargue solo si el contenedor está montado y vacío
    if (containerRef.current && !containerRef.current.firstChild) {
      const atOptions = {
        key: "d1c3f3974459f71dfabd40e46ad89a97",
        format: "iframe",
        height: 250,
        width: 300,
        params: {},
      };

      // Crear script de configuración
      const confScript = document.createElement("script");
      confScript.type = "text/javascript";
      confScript.innerHTML = `atOptions = ${JSON.stringify(atOptions)}`;

      // Crear script de invocación
      const invokeScript = document.createElement("script");
      invokeScript.type = "text/javascript";
      invokeScript.src = "https://www.highperformanceformat.com/d1c3f3974459f71dfabd40e46ad89a97/invoke.js";
      invokeScript.async = true;

      // Adjuntar al contenedor
      containerRef.current.appendChild(confScript);
      containerRef.current.appendChild(invokeScript);
    }

    return () => {
      // Limpiar al desmontar para evitar duplicados al navegar entre páginas
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`bg-transparent rounded-lg flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: "250px", width: "100%", ...style }}
    />
  );
}

export default AdSpace;
