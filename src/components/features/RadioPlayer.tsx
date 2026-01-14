import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "../../lib/i18n";
import { useRadioState } from "../../hooks/useRadioState";

function RadioPlayer() {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    isPlaying: sharedIsPlaying,
    isLive: sharedIsLive,
    currentSong: sharedCurrentSong,
  } = useRadioState();
  const audioRef = useRef<HTMLAudioElement>(null);

  // URL del stream de Icecast
  const ICECAST_STREAM_URL =
    import.meta.env.VITE_ICECAST_STREAM_URL || "https://radio.vixis.dev/vixis";
  const ICECAST_STATUS_URL =
    import.meta.env.VITE_ICECAST_STATUS_URL ||
    "https://radio.vixis.dev/status-json.xsl";

  // Estado local para el audio (solo para control del elemento audio)
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  // Estado local para verificación cuando Radio.tsx no está montado
  const [localIsLive, setLocalIsLive] = useState(false);

  // Verificar si estamos en /radio (donde Radio.tsx está montado)
  const isRadioPage = location.pathname === "/radio";

  // Usar el estado compartido como fuente de verdad absoluta cuando Radio.tsx está montado
  // Si no estamos en /radio, usar verificación local
  const isLive = isRadioPage ? sharedIsLive : localIsLive;
  const isPlaying = sharedIsPlaying || localIsPlaying;

  // Verificación local del estado de la radio (solo cuando NO estamos en /radio)
  useEffect(() => {
    // Si estamos en /radio, Radio.tsx maneja el estado, no necesitamos verificar localmente
    if (isRadioPage) {
      return;
    }

    const checkRadioStatus = async () => {
      try {
        const response = await fetch(ICECAST_STATUS_URL, {
          cache: "no-cache",
        });

        if (!response.ok) {
          setLocalIsLive(false);
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

        setLocalIsLive(!!mountpoint);
      } catch (error) {
        setLocalIsLive(false);
      }
    };

    checkRadioStatus();
    const interval = setInterval(checkRadioStatus, 30000); // Verificar cada 30 segundos
    return () => clearInterval(interval);
  }, [isRadioPage, ICECAST_STATUS_URL]);

  // Manejar reproducción/pausa
  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    // Usar el estado compartido como fuente de verdad
    // Si la radio está online (isLive = true), reproducir el stream
    if (isPlaying) {
      audioRef.current.pause();
      setLocalIsPlaying(false);
    } else {
      // Solo intentar reproducir si la radio está online
      if (isLive) {
        try {
          // Establecer el src del stream
          if (
            !audioRef.current.src ||
            !audioRef.current.src.includes(ICECAST_STREAM_URL)
          ) {
            audioRef.current.src = ICECAST_STREAM_URL;
          }

          // Agregar event listeners para manejar errores
          const handleError = () => {
            setLocalIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.src = "";
            }
          };

          audioRef.current.addEventListener("error", handleError, {
            once: true,
          });

          await audioRef.current.play();
          setLocalIsPlaying(true);
        } catch (error) {
          // Silenciar errores en producción
          if (import.meta.env.DEV) {
            console.debug("Error al reproducir la radio:", error);
          }
          setLocalIsPlaying(false);
        }
      }
      // Si está offline, no hacer nada (el botón se mantiene en play visualmente)
    }
  };

  // Sincronizar estado local con el compartido
  useEffect(() => {
    if (sharedIsPlaying !== undefined) {
      setLocalIsPlaying(sharedIsPlaying);
    }
  }, [sharedIsPlaying]);

  // Pausar si la radio se desconecta
  useEffect(() => {
    if (!isLive && audioRef.current && localIsPlaying) {
      audioRef.current.pause();
      setLocalIsPlaying(false);
    }
  }, [isLive, localIsPlaying]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="flex items-center gap-4">
        {/* Botón de play a la izquierda con efecto de disco de vinilo */}
        <button
          onClick={togglePlayPause}
          className={`w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 transition-all hover:opacity-90 cursor-pointer ${
            isPlaying && isLive ? "animate-spin" : ""
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
          {isLive ? (
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
