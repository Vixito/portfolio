import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../lib/i18n";

function RadioPlayer() {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // URL del stream de Icecast
  const ICECAST_STREAM_URL =
    import.meta.env.VITE_ICECAST_STREAM_URL ||
    "http://localhost:8000/radiovixis";
  const ICECAST_STATUS_URL =
    import.meta.env.VITE_ICECAST_STATUS_URL ||
    "http://localhost:8000/status-json.xsl";

  // Verificar estado de la radio
  useEffect(() => {
    const checkRadioStatus = async () => {
      try {
        const response = await fetch(ICECAST_STATUS_URL);
        const data = await response.json();

        const mountpoint = data.icestats?.source?.find(
          (source: any) =>
            source.server_name?.toLowerCase().includes("vixis") ||
            source.listenurl?.includes("vixis") ||
            source.mount?.includes("vixis")
        );

        setIsLive(!!mountpoint);
      } catch (error) {
        setIsLive(false);
      }
    };

    checkRadioStatus();
    const interval = setInterval(checkRadioStatus, 30000); // Verificar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  // Manejar reproducción/pausa
  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // Si no hay src, establecerlo
        if (!audioRef.current.src) {
          audioRef.current.src = ICECAST_STREAM_URL;
        }
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error al reproducir la radio:", error);
        setIsPlaying(false);
      }
    }
  };

  // Pausar si la radio se desconecta
  useEffect(() => {
    if (!isLive && audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isLive, isPlaying]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center gap-4">
        {/* Botón de play a la izquierda */}
        <button
          onClick={togglePlayPause}
          disabled={!isLive}
          className={`w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
            isPlaying ? "animate-spin" : ""
          } ${!isLive ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
          style={{
            animationDuration: "3s",
          }}
        >
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
        </button>
        <div className="flex-1">
          {/* Radio Vixis encima de Online/Offline */}
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {t("radio.title")}
          </h3>
          {isLive ? (
            <p className="text-xs text-blue-400 font-semibold animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              {t("radio.live")}
            </p>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              {t("radio.offline")}
            </p>
          )}
        </div>
        <Link
          to="/radio"
          className="text-sm text-purple hover:text-blue transition-colors cursor-pointer inline-flex items-center gap-1"
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
