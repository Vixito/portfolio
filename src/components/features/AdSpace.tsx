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
    // El script principal de Monetag ya está en index.html o se carga vía AdsterraSocialbar.
    // Para banners específicos se suele usar un zone diferente, 
    // pero si el usuario quiere usar el Multitag global, el script ya se encarga.
    // Si tienes un zone ID específico para Banners, cámbialo aquí.
  }, []);

  return (
    <div
      ref={adRef}
      className={`bg-transparent rounded-lg flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: "250px", width: "100%", ...style }}
    >
      <div id="monetag-ad-placeholder" className="text-gray-400 text-xs italic">
        {/* Placeholder para el anuncio de Monetag */}
      </div>
    </div>
  );
}

export default AdSpace;
