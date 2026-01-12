import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { getUpcomingEvents, getPlaylist } from "../lib/supabase-functions";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/supabase";
import { useTranslation, getTranslatedText } from "../lib/i18n";
import AdSpace from "../components/features/AdSpace";
import AdsterraBanner from "../components/features/AdsterraBanner";
import { sanitizeUserInput } from "../lib/security";

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
      title_translations?: { es?: string; en?: string } | null;
      date: string;
      passline_url: string | null;
      thumbnail_url: string | null;
      description: string | null;
      description_translations?: { es?: string; en?: string } | null;
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

  // Estados para la playlist automática
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const playlistLoadedRef = useRef(false);
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);

  // URL del stream de Icecast (configurable desde variables de entorno)
  const ICECAST_STREAM_URL =
    import.meta.env.VITE_ICECAST_STREAM_URL ||
    "http://localhost:8000/radiovixis";
  const ICECAST_STATUS_URL =
    import.meta.env.VITE_ICECAST_STATUS_URL ||
    "http://localhost:8000/status-json.xsl";

  // Configuración de AzuraCast (para cuando no esté en transmisión)
  const AZURACAST_BASE_URL = import.meta.env.VITE_AZURACAST_BASE_URL || "";
  const AZURACAST_API_KEY = import.meta.env.VITE_AZURACAST_API_KEY || "";
  const AZURACAST_STATION_ID = import.meta.env.VITE_AZURACAST_STATION_ID || "1";

  // Cargar metadata del stream de Icecast y verificar si está en vivo
  useEffect(() => {
    let isMounted = true;

    const fetchMetadata = async () => {
      if (!isMounted) return;

      try {
        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(ICECAST_STATUS_URL, {
          cache: "no-cache",
          signal: controller.signal,
        });

        // Si el servicio no está disponible (503, 502, etc.), manejar silenciosamente
        if (
          !response.ok &&
          (response.status === 503 ||
            response.status === 502 ||
            response.status === 500)
        ) {
          clearTimeout(timeoutId);
          if (!isMounted) return;
          setIsLive(false);
          // No loggear errores de servicio no disponible en producción
          if (import.meta.env.DEV) {
            console.debug(
              `Servicio de radio no disponible (${response.status})`
            );
          }
          // Continuar con el flujo normal (playlist o offline) - no hacer throw
          setCurrentSong({
            id: "offline",
            title: t("radio.offlineTitle"),
            artist: t("radio.waiting"),
            url: ICECAST_STREAM_URL,
          });
          return;
        }

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!isMounted) return;

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
          // La radio no está activa, intentar conectar con AzuraCast
          setIsLive(false);

          // Intentar obtener información de AzuraCast si está configurado
          if (AZURACAST_BASE_URL && AZURACAST_API_KEY) {
            try {
              const azuracastResponse = await fetch(
                `${AZURACAST_BASE_URL}/api/nowplaying/${AZURACAST_STATION_ID}`,
                {
                  headers: {
                    "X-API-Key": AZURACAST_API_KEY,
                  },
                  signal: controller.signal,
                }
              );

              if (azuracastResponse.ok) {
                const azuracastData = await azuracastResponse.json();
                const nowPlaying = azuracastData.now_playing;

                if (nowPlaying && nowPlaying.song) {
                  setCurrentSong({
                    id: "azuracast",
                    title: nowPlaying.song.title || t("radio.offlineTitle"),
                    artist: nowPlaying.song.artist || t("radio.waiting"),
                    url:
                      nowPlaying.station.listen_url ||
                      `${AZURACAST_BASE_URL}/radio/${AZURACAST_STATION_ID}`,
                  });
                  return; // Salir temprano si AzuraCast funciona
                }
              }
            } catch (azuracastError) {
              // Silenciar errores de AzuraCast, continuar con fallback
              if (import.meta.env.DEV) {
                console.debug(
                  "Error al conectar con AzuraCast:",
                  azuracastError
                );
              }
            }
          }

          // Fallback: mostrar estado offline
          setCurrentSong({
            id: "offline",
            title: t("radio.offlineTitle"),
            artist: t("radio.waiting"),
            url: ICECAST_STREAM_URL,
          });
        }
      } catch (error) {
        if (!isMounted) return;

        // Silenciar errores de conexión en producción (NetworkError, CORS, etc.)
        // Solo loggear en desarrollo
        if (import.meta.env.DEV) {
          console.debug("Error al cargar metadata de Icecast:", error);
        }
        // Si no se puede conectar con Icecast, intentar AzuraCast
        setIsLive(false);

        if (AZURACAST_BASE_URL && AZURACAST_API_KEY) {
          try {
            const azuracastController = new AbortController();
            const azuracastTimeout = setTimeout(
              () => azuracastController.abort(),
              5000
            );

            const azuracastResponse = await fetch(
              `${AZURACAST_BASE_URL}/api/nowplaying/${AZURACAST_STATION_ID}`,
              {
                headers: {
                  "X-API-Key": AZURACAST_API_KEY,
                },
                signal: azuracastController.signal,
              }
            );

            clearTimeout(azuracastTimeout);

            if (azuracastResponse.ok) {
              const azuracastData = await azuracastResponse.json();
              const nowPlaying = azuracastData.now_playing;

              if (nowPlaying && nowPlaying.song) {
                setCurrentSong({
                  id: "azuracast",
                  title: nowPlaying.song.title || t("radio.offlineTitle"),
                  artist: nowPlaying.song.artist || t("radio.waiting"),
                  url:
                    nowPlaying.station.listen_url ||
                    `${AZURACAST_BASE_URL}/radio/${AZURACAST_STATION_ID}`,
                });
                return; // Salir temprano si AzuraCast funciona
              }
            }
          } catch (azuracastError) {
            // Silenciar errores de AzuraCast
            if (import.meta.env.DEV) {
              console.debug("Error al conectar con AzuraCast:", azuracastError);
            }
          }
        }

        // Fallback final: mostrar estado offline
        setCurrentSong({
          id: "offline",
          title: t("radio.offlineTitle"),
          artist: t("radio.waiting"),
          url: ICECAST_STREAM_URL,
        });
      }
    };

    fetchMetadata();
    // Actualizar metadata cada 30 segundos cuando está en vivo (optimizado para recursos)
    // Cuando está offline con AzuraCast, actualizar cada 60 segundos para reducir consumo
    const interval = setInterval(() => {
      if (isMounted) {
        fetchMetadata();
      }
    }, 30000); // 30 segundos es un buen balance entre actualización y consumo de recursos

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    ICECAST_STATUS_URL,
    ICECAST_STREAM_URL,
    AZURACAST_BASE_URL,
    AZURACAST_API_KEY,
    AZURACAST_STATION_ID,
  ]); // Incluir variables de AzuraCast

  // Cargar playlist cuando no está en vivo
  useEffect(() => {
    const loadPlaylist = async () => {
      if (isLive || playlistLoadedRef.current) return;

      try {
        const playlistData = await getPlaylist();
        if (playlistData && playlistData.length > 0) {
          const songs: Song[] = playlistData.map((item: any) => ({
            id: item.id,
            title: item.title || t("radio.unknownTitle"),
            artist: item.artist || t("radio.unknownArtist"),
            url: item.url,
            duration: item.duration || undefined,
          }));

          // Filtrar canciones con URLs válidas antes de establecer la playlist
          const validSongs = songs.filter((song) => {
            try {
              if (!song.url || typeof song.url !== "string") return false;
              new URL(song.url);
              return true;
            } catch {
              if (import.meta.env.DEV) {
                console.debug(
                  "URL inválida en la playlist, saltando:",
                  song.url
                );
              }
              return false;
            }
          });

          if (validSongs.length > 0) {
            setPlaylist(validSongs);
            playlistLoadedRef.current = true;

            // Si hay canciones válidas, iniciar la primera automáticamente
            if (!isLive) {
              setCurrentPlaylistIndex(0);
              setCurrentSong(validSongs[0]);
              // Reproducir automáticamente la playlist cuando no está en vivo (solo en /radio)
              const isRadioPage = window.location.pathname === "/radio";
              if (audioRef.current && validSongs[0].url && isRadioPage) {
                try {
                  audioRef.current.src = validSongs[0].url;
                  audioRef.current.load();

                  // Esperar a que el audio esté listo antes de reproducir
                  const handleCanPlay = () => {
                    if (audioRef.current && !isPlaying) {
                      // Asegurar que el audio no esté mutado y el volumen esté configurado
                      audioRef.current.muted = false;
                      audioRef.current.volume = volume;

                      // Logging para debug
                      if (import.meta.env.DEV) {
                        console.debug(
                          "Intentando reproducir playlist automáticamente:",
                          {
                            url: audioRef.current.src,
                            volume: audioRef.current.volume,
                            muted: audioRef.current.muted,
                            readyState: audioRef.current.readyState,
                          }
                        );
                      }

                      audioRef.current
                        .play()
                        .then(() => {
                          setIsPlaying(true);
                          if (import.meta.env.DEV) {
                            console.debug("Playlist reproducida exitosamente");
                          }
                        })
                        .catch((error) => {
                          // Si falla el autoplay (requiere interacción del usuario), no hacer nada
                          console.warn(
                            "No se pudo reproducir automáticamente la playlist:",
                            error
                          );
                        });
                    }
                    // Remover el listener después de usarlo
                    audioRef.current?.removeEventListener(
                      "canplay",
                      handleCanPlay
                    );
                  };

                  // Agregar listener para cuando el audio esté listo
                  audioRef.current.addEventListener("canplay", handleCanPlay, {
                    once: true,
                  });

                  // También intentar reproducir si ya está listo
                  if (audioRef.current.readyState >= 3) {
                    // HAVE_FUTURE_DATA o superior
                    handleCanPlay();
                  }
                } catch (error) {
                  if (import.meta.env.DEV) {
                    console.debug("Error al cargar primera canción:", error);
                  }
                }
              }
            }
          } else {
            if (import.meta.env.DEV) {
              console.debug("No hay canciones con URLs válidas en la playlist");
            }
            setPlaylist([]);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug("Error al cargar playlist:", error);
        }
      }
    };

    if (!isLive) {
      loadPlaylist();
    } else {
      // Resetear cuando vuelve a estar en vivo
      playlistLoadedRef.current = false;
      setPlaylist([]);
      setCurrentPlaylistIndex(0);
    }
  }, [isLive, t]);

  // Reproducir automáticamente cuando está en vivo (solo en /radio, no en Home)
  useEffect(() => {
    // Verificar que estamos en la página /radio (no en Home)
    const isRadioPage = window.location.pathname === "/radio";

    if (isLive && isRadioPage && audioRef.current && !isPlaying) {
      // Cuando está en vivo, reproducir automáticamente
      const playLive = async () => {
        try {
          if (
            !audioRef.current.src ||
            audioRef.current.src !== currentSong?.url
          ) {
            audioRef.current.src = currentSong?.url || ICECAST_STREAM_URL;
          }
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          // Si falla el autoplay (requiere interacción del usuario), no hacer nada
          if (import.meta.env.DEV) {
            console.debug("No se pudo reproducir automáticamente:", error);
          }
        }
      };
      playLive();
    }
  }, [isLive, currentSong, ICECAST_STREAM_URL]);

  // Pausar automáticamente si la radio se desconecta y cambiar a playlist
  useEffect(() => {
    if (!isLive && audioRef.current && isPlaying) {
      // Si estaba reproduciendo en vivo, pausar
      audioRef.current.pause();
      setIsPlaying(false);

      // Si hay playlist disponible, cambiar a la primera canción
      if (playlist.length > 0 && currentPlaylistIndex < playlist.length) {
        const nextSong = playlist[currentPlaylistIndex];
        setCurrentSong(nextSong);
        if (audioRef.current) {
          audioRef.current.src = nextSong.url;
          audioRef.current.volume = volume; // Configurar volumen antes de cargar
          audioRef.current.muted = false; // Asegurar que no esté mutado
          audioRef.current.load();
        }
      }
    }
  }, [isLive, isPlaying, playlist, currentPlaylistIndex]);

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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
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
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            if (import.meta.env.DEV) {
              console.debug("WebSocket de Supabase conectado exitosamente");
            }
          } else if (status === "CHANNEL_ERROR") {
            console.warn(
              "Error en el WebSocket de Supabase (solo afecta el chat en tiempo real)"
            );
          }
        });
    } catch (error) {
      console.warn(
        "Error al suscribirse al WebSocket de Supabase (solo afecta el chat en tiempo real):",
        error
      );
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // Ignorar errores al limpiar el canal
          if (import.meta.env.DEV) {
            console.debug("Error al limpiar el canal de Supabase:", error);
          }
        }
      }
    };
  }, []);

  // Configurar volumen inicial cuando se carga el audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = false; // Asegurar que no esté mutado
    }
  }, [volume]);

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

    // Configurar volumen inicial y asegurar que no esté mutado
    audio.volume = volume;
    audio.muted = false;

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

    const handleEnded = () => {
      setIsPlaying(false);
      // Resetear contador de errores cuando una canción termina correctamente
      errorCountRef.current = 0;

      // Si no está en vivo y hay playlist, pasar a la siguiente canción
      if (!isLive && playlist.length > 0) {
        const nextIndex = (currentPlaylistIndex + 1) % playlist.length;
        const nextSong = playlist[nextIndex];

        if (audioRef.current && nextSong && nextSong.url) {
          // Validar URL antes de intentar cargar
          try {
            new URL(nextSong.url);
            setCurrentPlaylistIndex(nextIndex);
            setCurrentSong(nextSong);
            audioRef.current.src = nextSong.url;
            audioRef.current.volume = volume; // Configurar volumen antes de cargar
            audioRef.current.muted = false; // Asegurar que no esté mutado
            audioRef.current.load();
            // Reproducir automáticamente la siguiente canción
            audioRef.current.play().catch((error) => {
              // Si falla el autoplay, no intentar más automáticamente
              if (import.meta.env.DEV) {
                console.debug(
                  "Error al reproducir siguiente canción (probablemente requiere interacción del usuario):",
                  error
                );
              }
            });
          } catch (urlError) {
            // URL inválida, solo loggear en desarrollo
            if (import.meta.env.DEV) {
              console.debug("URL inválida en la playlist:", nextSong.url);
            }
            // NO intentar siguiente canción automáticamente para evitar bucles
          }
        }
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
      // Resetear contador de errores cuando se reproduce correctamente
      errorCountRef.current = 0;
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      setIsPlaying(false);

      // Evitar bucles infinitos: solo loggear en desarrollo y con throttling
      const now = Date.now();
      if (now - lastErrorTimeRef.current > 2000) {
        // Máximo un error cada 2 segundos
        if (import.meta.env.DEV) {
          console.debug(
            "Error en el stream de audio (probablemente URL inválida o problema de CORS):",
            e
          );
        }
        lastErrorTimeRef.current = now;
      }

      // Incrementar contador de errores consecutivos
      errorCountRef.current += 1;

      // Si hay más de 5 errores consecutivos, detener completamente y limpiar
      if (errorCountRef.current >= 5) {
        if (import.meta.env.DEV) {
          console.debug(
            "Demasiados errores consecutivos, deteniendo reproducción automática"
          );
        }
        // Limpiar el src para evitar más intentos
        if (audioRef.current) {
          audioRef.current.src = "";
          audioRef.current.load();
        }
        // NO intentar cambiar de canción automáticamente para evitar bucles infinitos
        return;
      }

      // NO cambiar automáticamente de canción cuando hay un error
      // Esto evita bucles infinitos. El usuario deberá hacer click en play para intentar la siguiente canción
      // O la canción cambiará cuando termine correctamente (handleEnded)
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
  }, [isLive, playlist, currentPlaylistIndex]);

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

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // Si está en vivo, usar el stream de Icecast
        if (isLive) {
          if (
            !audioRef.current.src ||
            audioRef.current.src !== currentSong?.url
          ) {
            audioRef.current.src = currentSong?.url || ICECAST_STREAM_URL;
          }
          await audioRef.current.play();
          setIsPlaying(true);
        } else {
          // Si no está en vivo, usar la playlist
          if (playlist.length > 0) {
            // Asegurar que tenemos la canción actual de la playlist
            const songToPlay = playlist[currentPlaylistIndex] || playlist[0];
            setCurrentSong(songToPlay);
            setCurrentPlaylistIndex(
              currentPlaylistIndex < playlist.length ? currentPlaylistIndex : 0
            );

            if (
              !audioRef.current.src ||
              audioRef.current.src !== songToPlay.url
            ) {
              audioRef.current.src = songToPlay.url;
              audioRef.current.volume = volume; // Configurar volumen antes de cargar
              audioRef.current.muted = false; // Asegurar que no esté mutado
              audioRef.current.load();
            }

            await audioRef.current.play();
            setIsPlaying(true);
          } else {
            // Si no hay playlist, mostrar mensaje
            if (import.meta.env.DEV) {
              console.debug("No hay playlist disponible");
            }
          }
        }
      } catch (error) {
        // Si falla la reproducción, mantener el estado en false
        setIsPlaying(false);
        if (import.meta.env.DEV) {
          console.debug("Error al reproducir:", error);
        }
      }
    }
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
      const sanitizedUsername = sanitizeUserInput(username.trim(), 20);
      localStorage.setItem("radio_username", sanitizedUsername);

      // Sanitizar mensaje antes de guardar
      const sanitizedMessage = sanitizeUserInput(
        messageInput.trim().replace(/\s+/g, " "),
        200
      );

      // Insertar mensaje en la base de datos
      const { data, error } = await supabase
        .from("messages")
        .insert({
          username: sanitizedUsername,
          message: sanitizedMessage,
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

          {/* Estado ONLINE/OFFLINE (siempre visible) */}
          <div className="flex items-center gap-2 min-w-[60px] md:min-w-[100px]">
            {/* ONLINE cuando está en vivo O cuando se reproduce automáticamente la playlist */}
            {isLive || (isPlaying && !isLive && playlist.length > 0) ? (
              <span className="text-[10px] md:text-xs text-blue-400 font-semibold animate-pulse">
                ● {t("radio.online")}
              </span>
            ) : (
              <span className="text-[10px] md:text-xs text-gray-400">
                ○ {t("radio.offline")}
              </span>
            )}
          </div>

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
                    // URLs de Tally.so según el idioma
                    const tallyUrl =
                      language === "es"
                        ? "https://tally.so/r/Y501K6"
                        : "https://tally.so/r/b5ja5Z";
                    window.open(tallyUrl, "_blank", "noopener,noreferrer");
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
      <audio
        ref={audioRef}
        src={currentSong?.url}
        muted={false}
        preload="auto"
      />

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
                            {getTranslatedText(
                              (event as any).title_translations || event.title
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formattedDate}
                          </p>
                          {(event.description ||
                            (event as any).description_translations) && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {getTranslatedText(
                                (event as any).description_translations ||
                                  event.description
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Anuncios superpuestos (misma posición, uno detrás del otro) */}
              <div className="relative mt-6 mb-4 min-h-[250px] w-full">
                {/* Google AdSense - se muestra si está disponible (z-index: 10, detrás) */}
                <div className="absolute inset-0 z-10">
                  <AdSpace className="h-full w-full" />
                </div>
                {/* Adsterra Banner - se muestra si está disponible (z-index: 20, encima de AdSense) */}
                {(import.meta.env.VITE_ADSTERRA_ENABLED === "true" ||
                  (import.meta.env.PROD &&
                    import.meta.env.VITE_ADSTERRA_ENABLED !== "false")) && (
                  <div className="absolute inset-0 z-20">
                    <AdsterraBanner className="h-full w-full" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Radio;
