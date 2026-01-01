import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { getUpcomingEvents } from "../lib/supabase-functions";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/supabase";
import { useTranslation } from "../lib/i18n";
import AdSpace from "../components/features/AdSpace";

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string; // URL del stream de audio desde S3/CloudFront o servicio de streaming
  duration?: number;
}

function Radio() {
  const { t, language } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLive, setIsLive] = useState(false); // Estado para saber si la radio está en vivo
  const [events, setEvents] = useState<
    Array<{
      id: string;
      title: string;
      date: string;
      passline_url: string | null;
      thumbnail_url: string | null;
      description: string | null;
    }>
  >([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Estados del chat
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [username, setUsername] = useState<string>(() => {
    // Cargar username del localStorage si existe
    return localStorage.getItem("radio_username") || "";
  });
  const [usernameConfirmed, setUsernameConfirmed] = useState<boolean>(() => {
    // Verificar si ya hay un username guardado
    return !!localStorage.getItem("radio_username");
  });
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const volumeThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // URL del stream de Icecast (configurable desde variables de entorno)
  const ICECAST_STREAM_URL =
    import.meta.env.VITE_ICECAST_STREAM_URL ||
    "http://localhost:8000/radiovixis";
  const ICECAST_STATUS_URL =
    import.meta.env.VITE_ICECAST_STATUS_URL ||
    "http://localhost:8000/status-json.xsl";

  // Cargar metadata del stream de Icecast y verificar si está en vivo
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(ICECAST_STATUS_URL);
        const data = await response.json();

        // Buscar el mountpoint de la radio
        const mountpoint = data.icestats?.source?.find(
          (source: any) =>
            source.server_name?.toLowerCase().includes("vixis") ||
            source.listenurl?.includes("vixis") ||
            source.mount?.includes("vixis")
        );

        if (mountpoint) {
          // La radio está activa
          setIsLive(true);
          const title =
            mountpoint.title ||
            mountpoint.yp_currently_playing ||
            t("radio.liveTitle");
          const artist = mountpoint.artist || t("radio.liveArtist");

          setCurrentSong({
            id: "live",
            title: title,
            artist: artist,
            url: ICECAST_STREAM_URL,
          });
        } else {
          // La radio no está activa
          setIsLive(false);
          setCurrentSong({
            id: "offline",
            title: t("radio.offlineTitle"),
            artist: t("radio.waiting"),
            url: ICECAST_STREAM_URL,
          });
        }
      } catch (error) {
        // Silenciar errores de conexión en producción (NetworkError, CORS, etc.)
        // Solo loggear en desarrollo
        if (import.meta.env.DEV) {
          console.debug("Error al cargar metadata de Icecast:", error);
        }
        // Si no se puede conectar, asumir que está offline
        setIsLive(false);
        setCurrentSong({
          id: "offline",
          title: t("radio.offlineTitle"),
          artist: t("radio.offlineArtist"),
          url: ICECAST_STREAM_URL,
        });
      }
    };

    fetchMetadata();
    // Actualizar metadata cada 10 segundos
    const interval = setInterval(fetchMetadata, 10000);

    return () => clearInterval(interval);
  }, [ICECAST_STATUS_URL, ICECAST_STREAM_URL, t, language]);

  // Reproducir automáticamente cuando la radio esté en vivo
  useEffect(() => {
    if (isLive && audioRef.current && !isPlaying) {
      // Intentar reproducir automáticamente
      audioRef.current.play().catch((error) => {
        console.log(t("radio.autoplayBlocked"), error);
      });
    } else if (!isLive && audioRef.current && isPlaying) {
      // Pausar si la radio se desconecta
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isLive, isPlaying, t]);

  // Cargar eventos próximos
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const upcomingEvents = await getUpcomingEvents(5); // Obtener 5 eventos próximos
        setEvents(upcomingEvents || []);
      } catch (error) {
        console.error("Error al cargar eventos:", error);
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Cargar mensajes iniciales
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        // Invertir para mostrar los más antiguos arriba
        setMessages((data || []).reverse());
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, []);

  // Suscripción Realtime para nuevos mensajes
  useEffect(() => {
    const channel = supabase
      .channel("radio-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Tables<"messages">;
          setMessages((prev) => [...prev, newMessage]);
          // Auto-scroll al final
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll cuando hay nuevos mensajes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length]);

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

    // Para streams en vivo, no hay duración definida
    const updateTime = () => {
      if (audio.currentTime && !isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      // Para streams en vivo, duration puede ser Infinity
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else {
        setDuration(0); // Stream en vivo
      }
    };

    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error("Error en el stream de audio:", e);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Limpiar throttle al desmontar
  useEffect(() => {
    return () => {
      if (volumeThrottleRef.current) {
        clearTimeout(volumeThrottleRef.current);
      }
    };
  }, []);

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

    // Actualizar el estado inmediatamente para feedback visual
    setVolume(newVolume);

    // Throttle: actualizar el audio solo cada 100ms para evitar bloqueos
    if (volumeThrottleRef.current) {
      clearTimeout(volumeThrottleRef.current);
    }

    volumeThrottleRef.current = setTimeout(() => {
      // Actualizar el volumen del audio si está disponible, pero no bloquear si no lo está
      try {
        if (audioRef.current) {
          audioRef.current.volume = newVolume;
        }
      } catch (error) {
        // Ignorar errores silenciosamente para no bloquear la UI
        console.debug("Error al cambiar volumen:", error);
      }
    }, 100);
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

  // Formatear tiempo relativo
  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const msgDate = new Date(date);
    const diffSeconds = Math.floor((now.getTime() - msgDate.getTime()) / 1000);

    if (diffSeconds < 60) return t("radio.now");
    if (diffSeconds < 3600)
      return `${t("radio.ago")} ${Math.floor(diffSeconds / 60)} ${t(
        "radio.minutes"
      )}`;
    if (diffSeconds < 86400)
      return `${t("radio.ago")} ${Math.floor(diffSeconds / 3600)} ${t(
        "radio.hours"
      )}`;
    return `${t("radio.ago")} ${Math.floor(diffSeconds / 86400)} ${t(
      "radio.days"
    )}`;
  };

  // Validaciones anti-abuso
  const bannedWords = [
    "scam",
    "hack",
    "virus",
    "malware",
    "malparido",
    "perro hp",
    "triple cv",
    // Agregar más según necesites
  ];

  const validateMessage = (user: string, msg: string): string | null => {
    // Validar username
    const trimmedUser = user.trim();
    if (trimmedUser.length < 2 || trimmedUser.length > 20) {
      return t("radio.usernameTooShort");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUser)) {
      return t("radio.usernameInvalid");
    }

    // Validar mensaje
    const trimmedMsg = msg.trim();
    if (trimmedMsg.length < 1 || trimmedMsg.length > 200) {
      return t("radio.messageTooLong");
    }

    // Rate limiting (3 segundos mínimo entre mensajes)
    const now = Date.now();
    if (now - lastMessageTime < 3000) {
      return t("radio.rateLimit");
    }

    // Verificar palabras prohibidas
    const lowerMsg = trimmedMsg.toLowerCase();
    for (const word of bannedWords) {
      if (lowerMsg.includes(word.toLowerCase())) {
        return t("radio.bannedWords");
      }
    }

    return null;
  };

  // Enviar mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      alert(t("radio.usernameRequired"));
      return;
    }

    const validationError = validateMessage(username, messageInput);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setIsSending(true);

      // Guardar username en localStorage
      localStorage.setItem("radio_username", username.trim());

      const trimmedMessage = messageInput.trim().replace(/\s+/g, " ");

      // Insertar mensaje en la base de datos
      const { data, error } = await supabase
        .from("messages")
        .insert({
          username: username.trim(),
          message: trimmedMessage,
        })
        .select()
        .single();

      if (error) throw error;

      // Agregar el mensaje al estado local inmediatamente
      if (data) {
        setMessages((prev) => [...prev, data as Tables<"messages">]);
        // Auto-scroll al final
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }

      setMessageInput("");
      setLastMessageTime(Date.now());
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      alert(t("common.error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra del reproductor (fija arriba, negra, h-10, sin animaciones) */}
      <div
        className="fixed top-0 left-0 right-0 bg-black text-white z-40 h-10 md:h-12 flex items-center px-2 md:px-4"
        style={{
          transform: "translateZ(0)",
          willChange: "auto",
          cursor: "default",
        }}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center gap-1 md:gap-4">
          {/* Controles principales */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={togglePlayPause}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-white/20 rounded transition-colors cursor-pointer flex-shrink-0"
              aria-label={isPlaying ? t("radio.pause") : t("radio.play")}
            >
              {isPlaying ? (
                <svg
                  className="w-4 h-4 md:w-6 md:h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 md:w-6 md:h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              className="hidden md:flex w-8 h-8 items-center justify-center hover:bg-white/20 rounded transition-colors"
              aria-label={t("radio.previous")}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              className="hidden md:flex w-8 h-8 items-center justify-center hover:bg-white/20 rounded transition-colors"
              aria-label={t("radio.next")}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Texto marquee (solo esto tiene animación) */}
          <div className="flex-1 overflow-hidden relative h-8 flex items-center justify-center min-w-0">
            <div
              ref={marqueeRef}
              className="whitespace-nowrap text-xs md:text-sm font-medium"
              style={{ willChange: "transform" }}
            >
              {currentSong
                ? `${currentSong.title} - ${currentSong.artist}`
                : t("radio.loading")}
            </div>
          </div>

          {/* Tiempo y barra de progreso (oculto para streams en vivo) */}
          {duration > 0 ? (
            <div className="hidden md:flex items-center gap-2 min-w-[200px]">
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
                  }%, #4b5563 ${
                    (currentTime / duration) * 100
                  }%, #4b5563 100%)`,
                }}
              />
              <span className="text-xs text-gray-400 min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-[60px] md:min-w-[100px]">
              {isLive ? (
                <span className="text-[10px] md:text-xs text-blue-400 font-semibold animate-pulse">
                  ● {t("radio.online")}
                </span>
              ) : (
                <span className="text-[10px] md:text-xs text-gray-400">
                  ○ {t("radio.offline")}
                </span>
              )}
            </div>
          )}

          {/* Control de volumen */}
          <div className="hidden md:flex items-center gap-2 min-w-[120px]">
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

          {/* Botón de ajustes/menú con dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors flex-shrink-0 cursor-pointer"
              aria-label={t("nav.settings")}
            >
              <svg
                className="w-4 h-4 md:w-5 md:h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {/* Menú dropdown */}
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-black shadow-lg min-w-[180px] z-[9999]">
                <button
                  onClick={() => {
                    const typeformUrl =
                      import.meta.env.VITE_TYPEFORM_SONG_REQUEST_URL || "";
                    if (typeformUrl) {
                      window.open(typeformUrl, "_blank", "noopener,noreferrer");
                    } else {
                      alert(
                        t("radio.songRequestUrlNotConfigured") ||
                          "URL de Typeform no configurada"
                      );
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors cursor-pointer flex items-center gap-2 text-sm"
                >
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
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  {t("radio.requestSong") || "Pide tu canción"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio element (oculto) */}
      <audio ref={audioRef} src={currentSong?.url} />

      {/* Contenido principal */}
      <div className="pt-10 md:pt-15 flex-1">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
            {t("radio.title")}
          </h1>

          {/* Placeholder para el chat en tiempo real */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div
                className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-4"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  cursor: "default",
                }}
              >
                <h2
                  className="text-lg mb-4 text-gray-900"
                  style={{ fontSize: "12px", lineHeight: "1.8" }}
                >
                  {t("radio.chat")}
                </h2>

                {/* Contenedor de mensajes con scroll */}
                <div
                  ref={messagesContainerRef}
                  className="bg-gray-50 border-2 border-black p-3 mb-4 overflow-y-auto"
                  style={{
                    maxHeight: "400px",
                    minHeight: "200px",
                    fontSize: "10px",
                    lineHeight: "1.6",
                  }}
                >
                  {messagesLoading ? (
                    <div className="text-gray-600">
                      {t("radio.loadingMessages")}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-gray-500">{t("radio.noMessages")}</div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="border-b border-gray-300 pb-2 last:border-0"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-gray-900 font-bold"
                              style={{ color: "#331d83" }}
                            >
                              [{msg.username}]
                            </span>
                            <span
                              className="text-gray-500"
                              style={{ fontSize: "8px" }}
                            >
                              {formatRelativeTime(msg.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-800 break-words">
                            {msg.message}
                          </p>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Formulario de envío */}
                {!usernameConfirmed ? (
                  <div className="space-y-2">
                    <label
                      className="block text-gray-900 mb-2"
                      style={{ fontSize: "8px" }}
                    >
                      {t("radio.username").toUpperCase()}:
                    </label>
                    <input
                      ref={usernameInputRef}
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setUsername(newValue);
                      }}
                      maxLength={20}
                      className="w-full border-2 border-black p-2 bg-white text-gray-900 cursor-text"
                      style={{
                        fontSize: "10px",
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                      placeholder={t("radio.username")}
                      onKeyDown={(e) => {
                        // Solo confirmar username si presiona Enter Y tiene 2+ caracteres
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const currentValue =
                            usernameInputRef.current?.value || "";
                          if (currentValue.trim().length >= 2) {
                            setUsernameConfirmed(true);
                            localStorage.setItem(
                              "radio_username",
                              currentValue.trim()
                            );
                            setUsername(currentValue.trim());
                            // Pequeño delay para asegurar que el estado se actualice
                            setTimeout(() => {
                              document
                                .querySelector<HTMLInputElement>(
                                  'input[name="message"]'
                                )
                                ?.focus();
                            }, 100);
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="message"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        maxLength={200}
                        className="flex-1 border-2 border-black p-2 bg-white text-gray-900 cursor-text"
                        style={{
                          fontSize: "10px",
                          fontFamily: "'Press Start 2P', monospace",
                        }}
                        placeholder={t("radio.chatPlaceholder")}
                        disabled={isSending}
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        disabled={isSending || !messageInput.trim()}
                        className="border-2 border-black bg-[#331d83] text-white px-4 py-2 hover:bg-[#2093c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{
                          fontSize: "8px",
                          fontFamily: "'Press Start 2P', monospace",
                          boxShadow: "2px 2px 0px #000",
                        }}
                      >
                        {isSending
                          ? t("radio.sending")
                          : t("radio.send").toUpperCase()}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-gray-500">
                      <span style={{ fontSize: "7px" }}>
                        {t("radio.username")}: {username}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUsername("");
                          setUsernameConfirmed(false);
                          localStorage.removeItem("radio_username");
                          // Focus en el input de username
                          setTimeout(() => {
                            usernameInputRef.current?.focus();
                          }, 100);
                        }}
                        className="text-gray-600 hover:text-gray-900 underline"
                        style={{ fontSize: "7px" }}
                      >
                        {t("common.update")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t("radio.events")}
                </h2>
                {eventsLoading ? (
                  <p className="text-gray-600">{t("radio.loadingEvents")}</p>
                ) : events.length === 0 ? (
                  <p className="text-gray-600">{t("radio.noEvents")}</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => {
                      const eventDate = new Date(event.date);
                      const formattedDate = eventDate.toLocaleDateString(
                        language === "es" ? "es-ES" : "en-US",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      );

                      return (
                        <div
                          key={event.id}
                          className="p-3 bg-purple/10 rounded-lg border border-purple/20 hover:bg-purple/20 transition-colors cursor-pointer"
                          onClick={() => {
                            if (event.passline_url) {
                              window.open(
                                event.passline_url,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }
                          }}
                        >
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formattedDate}
                          </p>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Anuncio debajo de Próximos Eventos */}
              <AdSpace className="mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Radio;
