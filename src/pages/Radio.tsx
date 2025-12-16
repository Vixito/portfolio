import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string; // URL del stream de audio desde S3/CloudFront o servicio de streaming
  duration?: number;
}

function Radio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  // Mock de canción actual (luego vendrá de Supabase)
  useEffect(() => {
    setCurrentSong({
      id: "1",
      title: "Canción de Ejemplo",
      artist: "Artista Ejemplo",
      url: "https://tu-cdn.cloudfront.net/radio/stream.mp3",
    });
  }, []);

  // Efecto marquee para el texto (desplazamiento continuo)
  useEffect(() => {
    if (!marqueeRef.current || !currentSong) return;

    const text = `${currentSong.title} - ${currentSong.artist}`;
    const textWidth = marqueeRef.current.scrollWidth;
    const containerWidth = marqueeRef.current.parentElement?.offsetWidth || 0;

    // Solo animar si el texto es más largo que el contenedor
    if (textWidth > containerWidth) {
      const distance = textWidth - containerWidth + 50; // 50px de padding

      gsap.to(marqueeRef.current, {
        x: -distance,
        duration: distance / 30, // Velocidad ajustable (píxeles por segundo)
        ease: "none",
        repeat: -1,
      });
    } else {
      // Si el texto cabe, centrarlo
      gsap.set(marqueeRef.current, { x: 0 });
    }
  }, [currentSong]);

  // Event listeners del audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Control de volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra del reproductor (fija arriba, negra, h-10, sin animaciones) */}
      <div
        className="fixed top-0 left-0 right-0 bg-black text-white z-40 h-10 flex items-center px-4"
        style={{ transform: "translateZ(0)", willChange: "auto" }}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center gap-4">
          {/* Controles principales */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded transition-colors cursor-pointer"
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              aria-label="Anterior"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              aria-label="Siguiente"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Texto marquee (solo esto tiene animación) */}
          <div className="flex-1 overflow-hidden relative h-8 flex items-center justify-center">
            <div
              ref={marqueeRef}
              className="whitespace-nowrap text-sm font-medium"
              style={{ willChange: "transform" }}
            >
              {currentSong
                ? `${currentSong.title} - ${currentSong.artist}`
                : "Cargando..."}
            </div>
          </div>

          {/* Tiempo y barra de progreso */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-xs text-gray-400 min-w-[40px] text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              style={{
                background: `linear-gradient(to right, white 0%, white ${
                  (currentTime / duration) * 100
                }%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
              }}
            />
            <span className="text-xs text-gray-400 min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* Control de volumen */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              {volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              ) : volume < 0.5 ? (
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              )}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              style={{
                background: `linear-gradient(to right, white 0%, white ${
                  volume * 100
                }%, #4b5563 ${volume * 100}%, #4b5563 100%)`,
              }}
            />
          </div>

          {/* Botón de ajustes/menú */}
          <button
            className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
            aria-label="Ajustes"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Audio element (oculto) */}
      <audio ref={audioRef} src={currentSong?.url} />

      {/* Contenido principal */}
      <div className="pt-15 flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
            Radio Vixis
          </h1>

          {/* Placeholder para el chat en tiempo real */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Chat en Tiempo Real
                </h2>
                <p className="text-gray-600">
                  El chat se implementará con Supabase Realtime en la siguiente
                  fase.
                </p>
                <div className="mt-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          Usuario {i}
                        </span>
                        <span className="text-xs text-gray-500">hace 2m</span>
                      </div>
                      <p className="text-gray-700">
                        Mensaje de ejemplo {i} del chat...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Próximos Eventos
                </h2>
                <p className="text-gray-600 mb-4">Eventos desde passline.com</p>
                <div className="space-y-3">
                  <div className="p-3 bg-purple/10 rounded-lg border border-purple/20">
                    <h3 className="font-semibold text-gray-900">
                      Evento Ejemplo 1
                    </h3>
                    <p className="text-sm text-gray-600">15 de Enero, 2025</p>
                  </div>
                  <div className="p-3 bg-blue/10 rounded-lg border border-blue/20">
                    <h3 className="font-semibold text-gray-900">
                      Evento Ejemplo 2
                    </h3>
                    <p className="text-sm text-gray-600">20 de Enero, 2025</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Radio;
