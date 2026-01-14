import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../lib/i18n";
import { useRadioState } from "../../hooks/useRadioState";

function RadioPlayer() {
  const { t } = useTranslation();
  const {
    isPlaying: sharedIsPlaying,
    isLive: sharedIsLive,
    currentSong: sharedCurrentSong,
  } = useRadioState();
  const [isPlaying, setIsPlaying] = useState(sharedIsPlaying);
  const [isLive, setIsLive] = useState(sharedIsLive);
  const [currentSong, setCurrentSong] = useState(sharedCurrentSong);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sincronizar con el estado compartido (prioridad: usar el estado de Radio.tsx)
  useEffect(() => {
    setIsPlaying(sharedIsPlaying);
    setIsLive(sharedIsLive);
    setCurrentSong(sharedCurrentSong);
  }, [sharedIsPlaying, sharedIsLive, sharedCurrentSong]);

  // URL del stream de Icecast
  const ICECAST_STREAM_URL =
    import.meta.env.VITE_ICECAST_STREAM_URL || "https://radio.vixis.dev/vixis";
  const ICECAST_STATUS_URL =
    import.meta.env.VITE_ICECAST_STATUS_URL ||
    "https://radio.vixis.dev/status-json.xsl";

  // Verificación de estado como fallback (solo si el estado compartido no está disponible)
  // Usar la misma lógica robusta que Radio.tsx
  useEffect(() => {
    // Si ya tenemos estado compartido, usarlo (viene de Radio.tsx que tiene mejor lógica)
    // Solo verificar localmente si no hay estado compartido o como fallback
    if (sharedIsLive !== undefined) {
      // El estado compartido tiene prioridad
      return;
    }

    const checkRadioStatus = async () => {
      try {
        const response = await fetch(ICECAST_STATUS_URL, {
          cache: "no-cache",
        });

        if (!response.ok) {
          setIsLive(false);
          return;
        }

        const data = await response.json();

        // Usar la misma lógica robusta que Radio.tsx
        let sources: any[] = [];

        if (Array.isArray(data.icestats?.source)) {
          sources = data.icestats.source;
        } else if (
          data.icestats?.source &&
          typeof data.icestats.source === "object" &&
          !Array.isArray(data.icestats.source)
        ) {
          sources = [data.icestats.source];
        } else if (data.source && Array.isArray(data.source)) {
          sources = data.source;
        } else if (data.source && typeof data.source === "object") {
          sources = [data.source];
        }

        // Buscar mountpoint /vixis
        let mountpoint: any = null;
        if (sources.length > 0) {
          mountpoint = sources.find(
            (source: any) =>
              source?.mount === "/vixis" || source?.mount?.includes("/vixis")
          );

          if (!mountpoint) {
            mountpoint = sources.find(
              (source: any) =>
                source?.server_name?.toLowerCase().includes("vixis") ||
                source?.listenurl?.includes("vixis") ||
                source?.mount?.includes("vixis")
            );
          }

          if (!mountpoint && sources.length > 0) {
            mountpoint = sources[0];
          }
        }

        setIsLive(!!mountpoint);
      } catch (error) {
        setIsLive(false);
      }
    };

    checkRadioStatus();
    const interval = setInterval(checkRadioStatus, 30000);
    return () => clearInterval(interval);
  }, [sharedIsLive, ICECAST_STATUS_URL]);

  // Manejar reproducción/pausa
  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    // Usar el estado compartido como fuente de verdad
    const actualIsLive = sharedIsLive !== undefined ? sharedIsLive : isLive;

    // Siempre permitir click, incluso si está offline
    // Si está offline, simplemente no reproducir nada pero cambiar el estado visual
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Solo intentar reproducir si la radio está en vivo
      if (actualIsLive) {
        try {
          // Si no hay src, establecerlo
          if (!audioRef.current.src) {
            audioRef.current.src = ICECAST_STREAM_URL;
          }

          // Agregar event listeners para manejar errores
          const handleError = () => {
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.src = "";
            }
          };

          const handleCanPlay = () => {
            // Solo establecer isPlaying cuando realmente puede reproducir
          };

          audioRef.current.addEventListener("error", handleError);
          audioRef.current.addEventListener("canplay", handleCanPlay);

          await audioRef.current.play();
          setIsPlaying(true);

          // Limpiar listeners después de un tiempo
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.removeEventListener("error", handleError);
              audioRef.current.removeEventListener("canplay", handleCanPlay);
            }
          }, 1000);
        } catch (error) {
          // Silenciar errores en producción
          if (import.meta.env.DEV) {
            console.debug("Error al reproducir la radio:", error);
          }
          setIsPlaying(false);
        }
      } else {
        // Si está offline, NO cambiar el estado visual (mantener play)
        // No reproducir nada porque está offline
        // El botón se mantiene en play visualmente
      }
    }
  };

  // Pausar si la radio se desconecta (solo si realmente se desconecta, no en el primer render)
  // Usar el estado compartido como fuente de verdad
  useEffect(() => {
    const actualIsLive = sharedIsLive !== undefined ? sharedIsLive : isLive;
    if (!actualIsLive && audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [sharedIsLive, isLive, isPlaying]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="flex items-center gap-4">
        {/* Botón de play a la izquierda con efecto de disco de vinilo */}
        <button
          onClick={togglePlayPause}
          className={`w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 transition-all hover:opacity-90 cursor-pointer ${
            isPlaying && (sharedIsLive !== undefined ? sharedIsLive : isLive)
              ? "animate-spin"
              : ""
          }`}
          style={{
            animationDuration: "3s",
          }}
        >
          {/* Icono de play/pause */}
          <div className="pointer-events-none">
            {isPlaying ? (
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
        <div className="flex-1">
          {/* Radio Vixis encima de Online/Offline */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("radio.title")}
          </h3>
          {(sharedIsLive !== undefined ? sharedIsLive : isLive) ? (
            <p className="text-xs text-blue-400 dark:text-blue-300 font-semibold animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 dark:bg-blue-300 rounded-full"></span>
              {t("radio.online")}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></span>
              {t("radio.offline")}
            </p>
          )}
        </div>
        <Link
          to="/radio"
          className="text-sm text-purple dark:text-purple-400 hover:text-blue dark:hover:text-blue-400 transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          {t("radio.viewMore")}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
      {/* Audio element oculto */}
      <audio ref={audioRef} preload="none" />
    </div>
  );
}

export default RadioPlayer;
