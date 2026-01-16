import { useState, useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import {
  getUpcomingEvents,
  getPlaylist,
  getRadioSettings,
} from "../lib/supabase-functions";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/supabase";
import { useTranslation, getTranslatedText } from "../lib/i18n";
import AdSpace from "../components/features/AdSpace";
import AdsterraBanner from "../components/features/AdsterraBanner";
import { sanitizeUserInput } from "../lib/security";
import { emitRadioState } from "../hooks/useRadioState";

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string; // URL del stream de audio desde S3/CloudFront o servicio de streaming
  duration?: number;
}

function Radio() {
  console.log("🎵 Componente Radio montado");
  const { t, language } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1); // Para restaurar volumen al desilenciar
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLive, setIsLive] = useState(false); // Estado para saber si la radio está en vivo
  const [userPaused, setUserPaused] = useState(false); // Rastrear si el usuario pausó manualmente
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

  // Estado para los emojis que aparecen al hacer click (con deltas pre-calculados)
  const [emojiParticles, setEmojiParticles] = useState<
    Array<{
      id: number;
      startX: number;
      startY: number;
      deltaX: number;
      deltaY: number;
      rotation: number;
    }>
  >([]);
  const emojiIdCounter = useRef(0);
  const emojiParticlesCountRef = useRef(0);
  const emojiButtonRef = useRef<HTMLImageElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  // Estados del chat
  const [messages, setMessages] = useState<Tables<"radio_messages">[]>([]);
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
  const isPlayingLiveRef = useRef(false); // Para evitar loops en el useEffect de playLive
  const songsPlayedCountRef = useRef(0); // Contador de canciones reproducidas para el jingle
  const jingleAudioRef = useRef<HTMLAudioElement | null>(null); // Audio para el jingle/station ID

  // URL del stream de Icecast (configurable desde variables de entorno)
  const ICECAST_STREAM_URL =
    import.meta.env.VITE_ICECAST_STREAM_URL || "https://radio.vixis.dev/vixis";
  const ICECAST_STATUS_URL =
    import.meta.env.VITE_ICECAST_STATUS_URL ||
    "https://radio.vixis.dev/status-json.xsl";
  // Configuración del jingle/station ID (cargada desde Supabase o variables de entorno)
  const [jingleConfig, setJingleConfig] = useState<{
    jingle_url: string;
    jingle_interval: number;
  }>({
    jingle_url: import.meta.env.VITE_RADIO_JINGLE_URL || "",
    jingle_interval: parseInt(
      import.meta.env.VITE_RADIO_JINGLE_INTERVAL || "5",
      10
    ),
  });

  // Cargar metadata del stream de Icecast y verificar si está en vivo
  useEffect(() => {
    let isMounted = true;

    const fetchMetadata = async () => {
      if (!isMounted) return;

      try {
        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Agregar timestamp para evitar cache del navegador
        const statusUrlWithCacheBust = `${ICECAST_STATUS_URL}?t=${Date.now()}`;
        let response: Response | null = null;

        try {
          response = await fetch(statusUrlWithCacheBust, {
            cache: "no-cache",
            signal: controller.signal,
            mode: "cors", // Permitir CORS explícitamente
            credentials: "omit", // No enviar cookies para evitar problemas CORS
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          });
        } catch (fetchError) {
          // Si hay error de CORS o red, no hacer throw - solo retornar
          // Esto permite que el código continúe sin cambiar a offline si el audio está reproduciendo
          clearTimeout(timeoutId);
          if (!isMounted) return;
          // NO cambiar a offline si el audio está reproduciendo (puede ser error temporal)
          // Verificar el estado REAL del audio element, no solo el estado de React
          const audioIsActuallyPlaying =
            audioRef.current &&
            !audioRef.current.paused &&
            !audioRef.current.ended &&
            audioRef.current.readyState > 2; // HAVE_CURRENT_DATA o superior

          if (!audioIsActuallyPlaying) {
            setIsLive(false);
          }
          // Si está reproduciendo, mantener el estado actual y no hacer nada
          return;
        }

        // Si el servicio no está disponible (503, 502, etc.), manejar silenciosamente
        // NO cambiar a offline si el audio ya está reproduciendo (puede ser un error temporal)
        if (
          !response.ok &&
          (response.status === 503 ||
            response.status === 502 ||
            response.status === 500)
        ) {
          clearTimeout(timeoutId);
          if (!isMounted) return;

          // Verificar el estado REAL del audio element, no solo el estado de React
          const audioIsActuallyPlaying =
            audioRef.current &&
            !audioRef.current.paused &&
            !audioRef.current.ended &&
            audioRef.current.readyState > 2; // HAVE_CURRENT_DATA o superior

          // Si el audio está reproduciendo, mantener el estado actual (no cambiar a offline)
          // Solo cambiar a offline si realmente no hay stream activo
          if (!audioIsActuallyPlaying) {
            setIsLive(false);
            const offlineTitle = t("radio.offlineTitle");
            const offlineArtist = t("radio.waiting");
            setCurrentSong((prev) => {
              if (
                prev?.id === "offline" &&
                prev?.title === offlineTitle &&
                prev?.artist === offlineArtist
              ) {
                return prev;
              }
              return {
                id: "offline",
                title: offlineTitle,
                artist: offlineArtist,
                url: "",
              };
            });
          }
          // Si está reproduciendo, mantener el estado actual y no hacer nada
          return;
        }

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!isMounted) return;

        // Manejar diferentes estructuras de respuesta de Icecast
        // El error "0.find is not a function" indica que source no es un array
        let sources: any[] = [];

        // Intentar múltiples formas de obtener las fuentes
        if (Array.isArray(data.icestats?.source)) {
          sources = data.icestats.source;
        } else if (
          data.icestats?.source &&
          typeof data.icestats.source === "object" &&
          !Array.isArray(data.icestats.source)
        ) {
          // Si source es un objeto único, convertirlo a array
          sources = [data.icestats.source];
        } else if (data.source && Array.isArray(data.source)) {
          // A veces source está directamente en data
          sources = data.source;
        } else if (data.source && typeof data.source === "object") {
          sources = [data.source];
        } else {
          // Si no encontramos source, buscar en todas las propiedades de icestats
          // Buscar cualquier array en icestats que contenga objetos con 'mount'
          if (data.icestats) {
            for (const key of Object.keys(data.icestats)) {
              const value = (data.icestats as any)[key];
              if (Array.isArray(value) && value.length > 0 && value[0]?.mount) {
                sources = value;
                break;
              }
            }
          }
        }

        // Asegurarse de que sources sea un array antes de usar .find()
        if (!Array.isArray(sources)) {
          sources = [];
        }

        // Buscar por mount /vixis
        let mountpoint: any = null;
        if (sources.length > 0) {
          mountpoint = sources.find(
            (source: any) =>
              source?.mount === "/vixis" || source?.mount?.includes("/vixis")
          );

          // Si no se encuentra, buscar por server_name o listenurl
          if (!mountpoint) {
            mountpoint = sources.find(
              (source: any) =>
                source?.server_name?.toLowerCase().includes("vixis") ||
                source?.listenurl?.includes("vixis") ||
                source?.mount?.includes("vixis")
            );
          }

          // Si aún no se encuentra, usar la primera fuente disponible (fallback)
          if (!mountpoint && sources.length > 0) {
            mountpoint = sources[0];
          }
        }

        if (mountpoint) {
          // La radio está activa
          setIsLive(true);
          // Resetear contador de canciones cuando está en vivo (no aplica jingle en vivo)
          songsPlayedCountRef.current = 0;

          // Obtener título/artista de Icecast (metadata del MP3)
          // Usar valores de mountpoint directamente, sin depender de traducciones que cambian
          // Priorizar server_name que puede tener metadata más actualizada
          const icecastTitle =
            mountpoint.server_name ||
            mountpoint.title ||
            mountpoint.yp_currently_playing ||
            mountpoint.listeners?.title ||
            "En Vivo";
          const icecastArtist =
            mountpoint.artist || mountpoint.listeners?.artist || "Radio Vixis";

          // Debug en desarrollo: mostrar metadata recibida
          if (import.meta.env.DEV) {
            console.log("🎵 Icecast metadata:", {
              title: icecastTitle,
              artist: icecastArtist,
              mountpoint: mountpoint,
            });
          }

          // EL BACKEND ES LA FUENTE DE VERDAD - usar directamente los datos de Icecast
          // Intentar match con playlist de Supabase SOLO para obtener nombres más limpios
          // Pero SIEMPRE priorizar lo que dice el backend
          let finalTitle = icecastTitle;
          let finalArtist = icecastArtist;

          try {
            const playlistData = await getPlaylist();
            if (playlistData && playlistData.length > 0) {
              // Buscar match por título y artista (normalizados para comparación)
              const normalize = (str: string) =>
                str.toLowerCase().trim().replace(/\s+/g, " ");

              const normalizedIcecastTitle = normalize(icecastTitle);
              const normalizedIcecastArtist = normalize(icecastArtist);

              // Buscar en la playlist
              const matchedSong = playlistData.find((song: any) => {
                const normalizedSongTitle = normalize(song.title || "");
                const normalizedSongArtist = normalize(song.artist || "");

                // Match por título exacto o parcial
                const titleMatch =
                  normalizedSongTitle === normalizedIcecastTitle ||
                  normalizedIcecastTitle.includes(normalizedSongTitle) ||
                  normalizedSongTitle.includes(normalizedIcecastTitle);

                // Match por artista exacto o parcial
                const artistMatch =
                  normalizedSongArtist === normalizedIcecastArtist ||
                  normalizedIcecastArtist.includes(normalizedSongArtist) ||
                  normalizedSongArtist.includes(normalizedIcecastArtist);

                return titleMatch || artistMatch;
              });

              // Si encontramos match, usar los nombres de Supabase (más limpios)
              // pero solo si hay un match claro
              if (matchedSong) {
                finalTitle = matchedSong.title;
                finalArtist = matchedSong.artist;
              }
            }
          } catch (playlistError) {
            // Si falla obtener playlist, continuar con datos de Icecast
            // Error silenciado para evitar logs innecesarios
          }

          // SIEMPRE actualizar con los datos del backend (fuente de verdad)
          // No verificar si cambió - el backend es la autoridad
          setCurrentSong({
            id: "live",
            title: finalTitle,
            artist: finalArtist,
            url: ICECAST_STREAM_URL,
          });

          // Sincronizar audio: asegurar que el src coincida con el backend
          if (audioRef.current) {
            const currentSrc = audioRef.current.src;
            // Si el audio no está apuntando al stream en vivo, actualizarlo
            if (!currentSrc || !currentSrc.includes(ICECAST_STREAM_URL)) {
              // Solo actualizar si está reproduciendo (no interrumpir si está pausado)
              if (isPlaying) {
                audioRef.current.pause();
                audioRef.current.src = ICECAST_STREAM_URL;
                // NO usar load() para streams OGG en vivo
                audioRef.current.play().catch(() => {
                  // Ignorar errores de autoplay
                });
              } else {
                // Si no está reproduciendo, solo actualizar el src sin reproducir
                audioRef.current.src = ICECAST_STREAM_URL;
              }
            }
          }
        } else {
          // La radio no está activa
          setIsLive(false);

          // Limpiar el stream si estaba reproduciendo en vivo
          if (
            audioRef.current &&
            audioRef.current.src.includes(ICECAST_STREAM_URL)
          ) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current.load();
            setIsPlaying(false);
          }

          // Fallback: mostrar estado offline (sin establecer URL para evitar cargar el stream)
          const offlineTitle = t("radio.offlineTitle");
          const offlineArtist = t("radio.waiting");
          setCurrentSong((prev) => {
            // Solo actualizar si los valores realmente cambiaron
            if (
              prev?.id === "offline" &&
              prev?.title === offlineTitle &&
              prev?.artist === offlineArtist
            ) {
              return prev;
            }
            return {
              id: "offline",
              title: offlineTitle,
              artist: offlineArtist,
              url: "",
            };
          });
        }
      } catch (error) {
        if (!isMounted) return;

        // Silenciar errores de conexión en producción (NetworkError, CORS, etc.)
        // Si el audio está reproduciendo, NO cambiar a offline (puede ser error temporal de metadata)
        // Solo cambiar a offline si realmente no hay stream activo
        // Verificar el estado REAL del audio element, no solo el estado de React
        const audioIsActuallyPlaying =
          audioRef.current &&
          !audioRef.current.paused &&
          !audioRef.current.ended &&
          audioRef.current.readyState > 2; // HAVE_CURRENT_DATA o superior

        if (!audioIsActuallyPlaying) {
          setIsLive(false);
          const offlineTitle = t("radio.offlineTitle");
          const offlineArtist = t("radio.waiting");
          setCurrentSong((prev) => {
            if (
              prev?.id === "offline" &&
              prev?.title === offlineTitle &&
              prev?.artist === offlineArtist
            ) {
              return prev;
            }
            return {
              id: "offline",
              title: offlineTitle,
              artist: offlineArtist,
              url: "",
            };
          });
        }
        // Si está reproduciendo, mantener el estado actual y no hacer nada
      }
    };

    fetchMetadata();
    // Actualizar metadata cada 30 segundos cuando está en vivo (optimizado para recursos)
    const interval = setInterval(() => {
      if (isMounted) {
        fetchMetadata();
      }
    }, 30000); // 30 segundos es un buen balance entre actualización y consumo de recursos

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ICECAST_STATUS_URL, ICECAST_STREAM_URL]);

  // Cargar playlist cuando no está en vivo
  useEffect(() => {
    const loadPlaylist = async (forceReload = false) => {
      if (isLive) return;

      // Si ya se cargó y no es un reload forzado, no recargar
      if (playlistLoadedRef.current && !forceReload) return;

      try {
        const playlistData = await getPlaylist();

        // Verificar si hay canciones en Supabase Storage que no están en la tabla playlist
        if (playlistData && playlistData.length > 0) {
          const songs: Song[] = playlistData.map((item: any) => ({
            id: item.id,
            title: item.title || "Título Desconocido",
            artist: item.artist || "Artista Desconocido",
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
              // URL inválida, saltar esta canción
              return false;
            }
          });

          if (validSongs.length > 0) {
            setPlaylist(validSongs);
            playlistLoadedRef.current = true;

            // Reproducir automáticamente la playlist cuando no está en vivo (solo en /radio)
            if (!isLive) {
              setCurrentPlaylistIndex(0);
              setCurrentSong(validSongs[0]);
              const isRadioPage = window.location.pathname === "/radio";
              if (audioRef.current && validSongs[0].url && isRadioPage) {
                try {
                  audioRef.current.src = validSongs[0].url;
                  audioRef.current.load();

                  // Esperar a que el audio esté listo antes de reproducir
                  const handleCanPlay = () => {
                    if (audioRef.current && !isPlaying && !userPaused) {
                      // Asegurar que el audio no esté mutado y el volumen esté configurado
                      audioRef.current.muted = false;
                      audioRef.current.volume = volume;

                      // Logging para debug

                      audioRef.current
                        .play()
                        .then(() => {
                          setIsPlaying(true);
                        })
                        .catch((error) => {
                          // Si falla el autoplay (requiere interacción del usuario), no hacer nada
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
                  }
                }
              }
            }
          } else {
            if (import.meta.env.DEV) {
            }
            setPlaylist([]);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
        }
      }
    };

    if (!isLive) {
      loadPlaylist();

      // Recargar playlist cada 5 minutos para obtener nuevas canciones
      const playlistInterval = setInterval(() => {
        if (!isLive) {
          playlistLoadedRef.current = false; // Permitir recarga
          loadPlaylist(true);
        }
      }, 5 * 60 * 1000); // 5 minutos

      return () => clearInterval(playlistInterval);
    } else {
      // Resetear cuando vuelve a estar en vivo
      playlistLoadedRef.current = false;
      setPlaylist([]);
      setCurrentPlaylistIndex(0);
    }
  }, [isLive]);

  // Reproducir automáticamente cuando está en vivo (solo en /radio, no en Home)
  // PERO solo si el usuario no pausó manualmente
  useEffect(() => {
    // Verificar que estamos en la página /radio (no en Home)
    const isRadioPage = window.location.pathname === "/radio";

    // Solo reproducir automáticamente si:
    // 1. Está en vivo
    // 2. Estamos en la página /radio
    // 3. No está ya reproduciendo (usar ref para evitar loops)
    // 4. El usuario NO pausó manualmente
    // 5. No estamos ya intentando reproducir (evitar múltiples intentos)
    if (
      isLive &&
      isRadioPage &&
      audioRef.current &&
      !isPlayingLiveRef.current &&
      !isPlaying &&
      !userPaused
    ) {
      // Marcar que estamos intentando reproducir para evitar loops
      isPlayingLiveRef.current = true;

      // Cuando está en vivo, reproducir automáticamente
      const playLive = async () => {
        if (!audioRef.current) {
          isPlayingLiveRef.current = false;
          return;
        }

        try {
          const targetUrl = ICECAST_STREAM_URL;
          const currentSrc = audioRef.current.src;

          // Solo cambiar el src si es realmente diferente
          const needsUpdate = !currentSrc || !currentSrc.includes(targetUrl);

          if (needsUpdate) {
            // Para streams OGG en vivo, simplemente establecer el src
            // El navegador manejará el stream automáticamente
            audioRef.current.pause();
            audioRef.current.src = targetUrl;
            // NO usar load() para streams en vivo OGG - interrumpe el stream
          }

          // Para streams en vivo OGG, intentar reproducir directamente
          // No esperar metadata porque puede no emitirse inmediatamente
          try {
            // Agregar listener para ver cuando el stream está listo
            const handleCanPlayThrough = () => {
              if (import.meta.env.DEV) {
              }
            };

            audioRef.current.addEventListener(
              "canplaythrough",
              handleCanPlayThrough,
              { once: true }
            );

            await audioRef.current.play();
            setIsPlaying(true);
            setUserPaused(false); // Resetear cuando se reproduce automáticamente
          } catch (playError: any) {
            // Si falla por autoplay policy, esperar a interacción del usuario
            if (playError.name === "NotAllowedError") {
              // Autoplay bloqueado, esperando interacción del usuario
              // El usuario tendrá que hacer click en play
            } else {
              // Otro error - manejar silenciosamente
            }
            isPlayingLiveRef.current = false;
          }
        } catch (error) {
          if (import.meta.env.DEV) {
          }
          isPlayingLiveRef.current = false;
        }
      };

      playLive();
    } else if (!isLive) {
      // Resetear el ref cuando no está en vivo
      isPlayingLiveRef.current = false;
    }
  }, [isLive, ICECAST_STREAM_URL, userPaused]); // Removido isPlaying de las dependencias

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

  // Emitir estado de la radio para que RadioPlayer en HomeSection pueda acceder
  // Usar useRef para evitar loops infinitos
  const lastEmittedStateRef = useRef<{
    isPlaying: boolean;
    isLive: boolean;
    currentSongId: string | null;
    currentSongTitle: string | null;
    currentSongArtist: string | null;
  } | null>(null);

  useEffect(() => {
    const currentState = {
      isPlaying,
      isLive,
      currentSongId: currentSong?.id || null,
      currentSongTitle: currentSong?.title || null,
      currentSongArtist: currentSong?.artist || null,
    };

    // Solo emitir si el estado realmente cambió
    if (
      !lastEmittedStateRef.current ||
      lastEmittedStateRef.current.isPlaying !== currentState.isPlaying ||
      lastEmittedStateRef.current.isLive !== currentState.isLive ||
      lastEmittedStateRef.current.currentSongId !==
        currentState.currentSongId ||
      lastEmittedStateRef.current.currentSongTitle !==
        currentState.currentSongTitle ||
      lastEmittedStateRef.current.currentSongArtist !==
        currentState.currentSongArtist
    ) {
      lastEmittedStateRef.current = currentState;
      emitRadioState({
        isPlaying,
        isLive,
        currentSong,
      });
    }
  }, [isPlaying, isLive, currentSong]);

  // Cargar eventos próximos
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const upcomingEvents = await getUpcomingEvents(5); // Obtener 5 eventos próximos

        setEvents(upcomingEvents || []);
      } catch (error) {
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Cargar configuración del jingle desde Supabase (y recargar periódicamente)
  useEffect(() => {
    const loadJingleConfig = async () => {
      try {
        const radioSettings = await getRadioSettings();
        setJingleConfig({
          jingle_url: radioSettings.jingle_url,
          jingle_interval: radioSettings.jingle_interval,
        });
      } catch (error) {
        // Si falla, usar valores por defecto de variables de entorno
        setJingleConfig({
          jingle_url: import.meta.env.VITE_RADIO_JINGLE_URL || "",
          jingle_interval: parseInt(
            import.meta.env.VITE_RADIO_JINGLE_INTERVAL || "5",
            10
          ),
        });
      }
    };

    loadJingleConfig();
    // Recargar cada 30 segundos para detectar cambios desde Admin
    const interval = setInterval(loadJingleConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar mensajes iniciales
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        const { data, error } = await supabase
          .from("radio_messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        // Invertir para mostrar los más antiguos arriba
        setMessages((data || []).reverse());
      } catch (error) {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, []);

  // Suscripción Realtime para nuevos mensajes
  useEffect(() => {
    console.log("🔧 Inicializando suscripción Realtime...");
    console.log(
      "🔧 Supabase URL:",
      import.meta.env.VITE_SUPABASE_URL ? "✅ Configurado" : "❌ No configurado"
    );
    console.log(
      "🔧 Supabase Key:",
      import.meta.env.VITE_SUPABASE_ANON_KEY
        ? "✅ Configurado"
        : "❌ No configurado"
    );

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel("radio-chat")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "radio_messages",
          },
          (payload) => {
            const newMessage = payload.new as Tables<"radio_messages">;
            console.log("📨 Nuevo mensaje recibido vía Realtime:", newMessage);

            // Verificar que el mensaje no exista ya para evitar duplicados
            setMessages((prev) => {
              console.log(
                "📝 Estado actual antes de Realtime:",
                prev.length,
                "mensajes"
              );

              const exists = prev.some((msg) => msg.id === newMessage.id);
              if (exists) {
                console.log(
                  "⚠️ Mensaje duplicado ignorado (ya existe localmente):",
                  newMessage.id
                );
                return prev;
              }

              console.log(
                "✅ Agregando mensaje vía Realtime:",
                newMessage.id,
                newMessage.message
              );

              // Agregar y ordenar por created_at para mantener orden cronológico
              const updated = [...prev, newMessage];
              const sorted = updated.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );

              console.log(
                "📊 Mensajes después de Realtime:",
                sorted.length,
                "mensajes"
              );
              return sorted;
            });

            // Auto-scroll al final
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 50);
          }
        )
        .subscribe((status) => {
          console.log("🔌 Estado de Realtime subscription:", status);
          if (status === "SUBSCRIBED") {
            console.log("✅ Realtime suscrito a radio_messages");
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Error en Realtime subscription:", status);
            // Error en el WebSocket de Supabase (solo afecta el chat en tiempo real)
          } else if (status === "TIMED_OUT") {
            console.error("⏱️ Realtime subscription TIMED_OUT");
          } else if (status === "CLOSED") {
            console.warn("🔴 Realtime subscription CLOSED");
          }
        });
    } catch (error) {
      console.error("❌ Error al suscribirse a Realtime:", error);
      // Error al suscribirse al WebSocket de Supabase (solo afecta el chat en tiempo real)
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // Ignorar errores al limpiar el canal
          if (import.meta.env.DEV) {
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

    // Limpiar animación anterior inmediatamente
    gsap.killTweensOf(marqueeRef.current);
    // Asegurar que comience desde el inicio (x: 0) - FORZAR reset completo
    gsap.set(marqueeRef.current, {
      x: 0,
      clearProps: "transform", // Limpiar cualquier transform anterior
    });

    // Pequeño delay para asegurar que el DOM se actualizó completamente
    const timeoutId = setTimeout(() => {
      if (!marqueeRef.current || !currentSong) return;

      // Forzar reset una vez más después del delay
      gsap.set(marqueeRef.current, { x: 0 });

      const text = `${currentSong.title} - ${currentSong.artist}`;
      const textWidth = marqueeRef.current.scrollWidth;
      const containerWidth = marqueeRef.current.parentElement?.offsetWidth || 0;

      // Solo animar si el texto es más largo que el contenedor
      if (textWidth > containerWidth) {
        // Cuando el texto es más largo, comenzar desde x: 0 para mostrar el inicio
        // (justify-center centra el texto, pero cuando es más largo necesitamos mostrar desde el inicio)
        const distance = textWidth - containerWidth + 50; // 50px de padding

        // Asegurar que comience desde el inicio del texto (x: 0)
        gsap.set(marqueeRef.current, { x: 0 });

        // Crear timeline para controlar mejor la animación
        const tl = gsap.timeline({ repeat: -1 });

        // 1. Mostrar el texto completo desde el inicio durante 2 segundos
        tl.to(marqueeRef.current, {
          x: 0,
          duration: 2,
          ease: "none",
        });

        // 2. Desplazarse hacia la izquierda para mostrar el resto del texto
        tl.to(marqueeRef.current, {
          x: -distance,
          duration: distance / 30, // Velocidad ajustable (píxeles por segundo)
          ease: "none",
        });

        // 3. Esperar un momento al final antes de volver al inicio
        tl.to(marqueeRef.current, {
          x: -distance,
          duration: 1,
          ease: "none",
        });

        // 4. Volver al inicio (sin animación visible, instantáneo)
        tl.set(marqueeRef.current, { x: 0 });
      } else {
        // Si el texto cabe, centrarlo (x: 0 porque justify-center lo centra)
        gsap.set(marqueeRef.current, { x: 0 });
      }
    }, 100); // Delay de 100ms para asegurar que el DOM se actualizó

    return () => {
      clearTimeout(timeoutId);
      gsap.killTweensOf(marqueeRef.current);
      // Asegurar reset al desmontar
      if (marqueeRef.current) {
        gsap.set(marqueeRef.current, { x: 0 });
      }
    };
  }, [currentSong?.title, currentSong?.artist]);

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
        // Incrementar contador de canciones reproducidas
        songsPlayedCountRef.current += 1;

        // Verificar si debemos reproducir el jingle/station ID
        const shouldPlayJingle =
          jingleConfig.jingle_url &&
          songsPlayedCountRef.current > 0 &&
          songsPlayedCountRef.current % jingleConfig.jingle_interval === 0;

        const playNextSong = () => {
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
              });
            } catch (urlError) {
              // URL inválida, solo loggear en desarrollo
              if (import.meta.env.DEV) {
              }
              // NO intentar siguiente canción automáticamente para evitar bucles
            }
          }
        };

        if (shouldPlayJingle) {
          // Reproducir jingle/station ID antes de la siguiente canción
          if (!jingleAudioRef.current) {
            jingleAudioRef.current = new Audio();
            jingleAudioRef.current.volume = volume;
          }

          jingleAudioRef.current.src = jingleConfig.jingle_url;
          jingleAudioRef.current.load();

          // Cuando el jingle termine, reproducir la siguiente canción
          const handleJingleEnded = () => {
            jingleAudioRef.current?.removeEventListener(
              "ended",
              handleJingleEnded
            );
            playNextSong();
          };

          jingleAudioRef.current.addEventListener("ended", handleJingleEnded, {
            once: true,
          });

          // Reproducir el jingle
          jingleAudioRef.current.play().catch((error) => {
            // Si falla reproducir el jingle, continuar con la siguiente canción
            playNextSong();
          });
        } else {
          // No reproducir jingle, pasar directamente a la siguiente canción
          playNextSong();
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
      // NO pausar automáticamente para errores de red temporales
      // Solo pausar si es un error crítico de decodificación
      const audio = audioRef.current;
      if (audio) {
        const error = audio.error;
        if (error) {
          let errorMsg = "Error desconocido";
          let shouldPause = false;

          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              // Abortado por el usuario o cambio de fuente - no hacer nada
              return;
            case error.MEDIA_ERR_NETWORK:
              // Error de red - NO pausar, dejar que el stream se recupere
              errorMsg =
                "MEDIA_ERR_NETWORK: Error de red (intentando recuperar)";
              shouldPause = false;
              break;
            case error.MEDIA_ERR_DECODE:
              // Error de decodificación - pausar solo si es crítico
              errorMsg = "MEDIA_ERR_DECODE: Error al decodificar el audio";
              shouldPause = true;
              break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              // Formato no soportado - pausar
              errorMsg = "MEDIA_ERR_SRC_NOT_SUPPORTED: Formato no soportado";
              shouldPause = true;
              break;
          }

          // Solo pausar si es un error crítico
          if (shouldPause) {
            setIsPlaying(false);
          }

          // Solo loggear en desarrollo
          if (import.meta.env.DEV) {
            console.error("Audio error:", errorMsg, error);
          }
        } else {
          // Si no hay error específico, puede ser un error temporal de red
          // NO pausar automáticamente
          if (import.meta.env.DEV) {
            console.warn(
              "Audio error event sin código de error específico (posible error temporal de red)"
            );
          }
        }
      }

      // Evitar bucles infinitos: solo loggear en desarrollo y con throttling
      const now = Date.now();
      if (now - lastErrorTimeRef.current > 2000) {
        // Máximo un error cada 2 segundos
        lastErrorTimeRef.current = now;
      }

      // Incrementar contador de errores consecutivos
      errorCountRef.current += 1;

      // Si hay más de 5 errores consecutivos, detener completamente y limpiar
      if (errorCountRef.current >= 5) {
        // Demasiados errores consecutivos, deteniendo reproducción automática
        // Limpiar el src para evitar más intentos
        if (audioRef.current) {
          audioRef.current.src = "";
          audioRef.current.load();
        }
        setIsPlaying(false);
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

    // Limpiar jingle al desmontar
    return () => {
      audio.removeEventListener("ended", handleEnded);
      if (jingleAudioRef.current) {
        jingleAudioRef.current.pause();
        jingleAudioRef.current.src = "";
        jingleAudioRef.current = null;
      }
    };
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);

      // Limpiar jingle al desmontar
      if (jingleAudioRef.current) {
        jingleAudioRef.current.pause();
        jingleAudioRef.current.src = "";
        jingleAudioRef.current = null;
      }
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

  // Función para actualizar y sincronizar con el backend
  const handleRefresh = async () => {
    if (!audioRef.current) return;

    try {
      // Obtener metadata actual del backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      let response: Response | null = null;

      try {
        response = await fetch(ICECAST_STATUS_URL, {
          cache: "no-cache",
          signal: controller.signal,
          mode: "cors",
          credentials: "omit",
        });
      } catch (fetchError) {
        // Si hay error de CORS o red, manejar silenciosamente
        clearTimeout(timeoutId);
        return;
      }

      if (!response) return;

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Si el backend no está disponible, recargar playlist si no está en vivo
        if (!isLive && playlist.length > 0) {
          playlistLoadedRef.current = false;
          // Forzar recarga de playlist
          const playlistData = await getPlaylist();
          if (playlistData && playlistData.length > 0) {
            const songs: Song[] = playlistData.map((item: any) => ({
              id: item.id,
              title: item.title || "Título Desconocido",
              artist: item.artist || "Artista Desconocido",
              url: item.url,
              duration: item.duration || undefined,
            }));

            const validSongs = songs.filter((song) => {
              try {
                if (!song.url || typeof song.url !== "string") return false;
                new URL(song.url);
                return true;
              } catch {
                return false;
              }
            });

            if (validSongs.length > 0) {
              setPlaylist(validSongs);
              playlistLoadedRef.current = true;
              // Sincronizar con la primera canción si no hay una actual
              if (!currentSong || currentSong.id !== validSongs[0].id) {
                setCurrentSong(validSongs[0]);
                setCurrentPlaylistIndex(0);
                if (isPlaying) {
                  audioRef.current.src = validSongs[0].url;
                  audioRef.current.load();
                  await audioRef.current.play();
                }
              }
            }
          }
        }
        return;
      }

      const data = await response.json();

      // Procesar la respuesta igual que fetchMetadata
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

      if (!Array.isArray(sources)) {
        sources = [];
      }

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

      if (mountpoint) {
        setIsLive(true);
        // Resetear contador de canciones cuando está en vivo (no aplica jingle en vivo)
        songsPlayedCountRef.current = 0;

        // EL BACKEND ES LA FUENTE DE VERDAD - usar directamente los datos de Icecast
        const icecastTitle =
          mountpoint.title || mountpoint.yp_currently_playing || "En Vivo";
        const icecastArtist = mountpoint.artist || "Radio Vixis";

        // Intentar match con playlist de Supabase SOLO para obtener nombres más limpios
        // Pero SIEMPRE priorizar lo que dice el backend
        let finalTitle = icecastTitle;
        let finalArtist = icecastArtist;

        try {
          const playlistData = await getPlaylist();
          if (playlistData && playlistData.length > 0) {
            const normalize = (str: string) =>
              str.toLowerCase().trim().replace(/\s+/g, " ");

            const normalizedIcecastTitle = normalize(icecastTitle);
            const normalizedIcecastArtist = normalize(icecastArtist);

            const matchedSong = playlistData.find((song: any) => {
              const normalizedSongTitle = normalize(song.title || "");
              const normalizedSongArtist = normalize(song.artist || "");

              const titleMatch =
                normalizedSongTitle === normalizedIcecastTitle ||
                normalizedIcecastTitle.includes(normalizedSongTitle) ||
                normalizedSongTitle.includes(normalizedIcecastTitle);

              const artistMatch =
                normalizedSongArtist === normalizedIcecastArtist ||
                normalizedIcecastArtist.includes(normalizedSongArtist) ||
                normalizedSongArtist.includes(normalizedIcecastArtist);

              return titleMatch || artistMatch;
            });

            // Si encontramos match, usar los nombres de Supabase (más limpios)
            // pero solo si hay un match claro
            if (matchedSong) {
              finalTitle = matchedSong.title;
              finalArtist = matchedSong.artist;
            }
          }
        } catch (playlistError) {
          // Continuar con datos de Icecast si falla
        }

        // SIEMPRE actualizar con los datos del backend (fuente de verdad)
        const newSong = {
          id: "live",
          title: finalTitle,
          artist: finalArtist,
          url: ICECAST_STREAM_URL,
        };

        // Forzar actualización INMEDIATA del texto (sin verificar si cambió)
        // El backend es la fuente de verdad - actualizar inmediatamente
        setCurrentSong(newSong);

        // Resetear contador de canciones cuando está en vivo (no aplica jingle en vivo)
        songsPlayedCountRef.current = 0;

        // Forzar re-render del marquee inmediatamente
        if (marqueeRef.current) {
          gsap.killTweensOf(marqueeRef.current);
          gsap.set(marqueeRef.current, { x: 0, clearProps: "transform" });
        }

        // Sincronizar audio: SIEMPRE actualizar el src para que coincida con el backend
        if (audioRef.current) {
          const currentSrc = audioRef.current.src;
          // SIEMPRE actualizar el src para sincronizar con el backend
          if (!currentSrc || !currentSrc.includes(ICECAST_STREAM_URL)) {
            if (isPlaying) {
              // Si está reproduciendo, actualizar y continuar reproduciendo
              audioRef.current.pause();
              audioRef.current.src = ICECAST_STREAM_URL;
              // NO usar load() para streams OGG en vivo
              await audioRef.current.play();
            } else {
              // Si no está reproduciendo, solo actualizar el src sin reproducir
              audioRef.current.src = ICECAST_STREAM_URL;
            }
          } else if (isPlaying) {
            // Si ya está apuntando al stream correcto pero está pausado, intentar reproducir
            if (audioRef.current.paused) {
              await audioRef.current.play();
            }
          }
        }
      } else {
        setIsLive(false);
        // Si no está en vivo, sincronizar con la playlist actual
        if (playlist.length > 0) {
          // Encontrar qué canción está sonando actualmente basándose en el src del audio
          const currentSrc = audioRef.current?.src || "";
          const currentlyPlayingSong = playlist.find(
            (song) => song.url === currentSrc
          );

          if (currentlyPlayingSong) {
            // Sincronizar el texto con la canción que está sonando realmente
            setCurrentSong(currentlyPlayingSong);
            const songIndex = playlist.findIndex(
              (song) => song.id === currentlyPlayingSong.id
            );
            if (songIndex >= 0) {
              setCurrentPlaylistIndex(songIndex);
            }
          } else if (currentPlaylistIndex < playlist.length) {
            // Si no encontramos match, usar el índice actual y sincronizar audio
            const songToSync = playlist[currentPlaylistIndex];
            setCurrentSong(songToSync);
            // Sincronizar audio si está reproduciendo
            if (isPlaying && audioRef.current) {
              if (
                !audioRef.current.src ||
                audioRef.current.src !== songToSync.url
              ) {
                audioRef.current.src = songToSync.url;
                audioRef.current.load();
                await audioRef.current.play();
              }
            }
          }
        } else {
          // Si no hay playlist, recargarla
          playlistLoadedRef.current = false;
          const playlistData = await getPlaylist();
          if (playlistData && playlistData.length > 0) {
            const songs: Song[] = playlistData.map((item: any) => ({
              id: item.id,
              title: item.title || "Título Desconocido",
              artist: item.artist || "Artista Desconocido",
              url: item.url,
              duration: item.duration || undefined,
            }));

            const validSongs = songs.filter((song) => {
              try {
                if (!song.url || typeof song.url !== "string") return false;
                new URL(song.url);
                return true;
              } catch {
                return false;
              }
            });

            if (validSongs.length > 0) {
              setPlaylist(validSongs);
              playlistLoadedRef.current = true;
              setCurrentSong(validSongs[0]);
              setCurrentPlaylistIndex(0);
              // Sincronizar audio si está reproduciendo
              if (isPlaying && audioRef.current) {
                audioRef.current.src = validSongs[0].url;
                audioRef.current.load();
                await audioRef.current.play();
              }
            }
          }
        }
      }
    } catch (error) {
      // Error silenciado
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setUserPaused(true); // Marcar que el usuario pausó manualmente
    } else {
      setUserPaused(false); // Resetear cuando el usuario reproduce manualmente
      try {
        // Si está en vivo, usar el stream de Icecast
        if (isLive) {
          const targetUrl = ICECAST_STREAM_URL;
          const currentSrc = audioRef.current.src;

          // Solo cambiar el src si es realmente diferente
          if (!currentSrc || !currentSrc.includes(targetUrl)) {
            audioRef.current.pause();
            audioRef.current.src = targetUrl;
            // NO usar load() para streams en vivo OGG
          }

          // Intentar reproducir directamente
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
            }
          }
        }
      } catch (error) {
        // Si falla la reproducción, mantener el estado en false
        setIsPlaying(false);
        if (import.meta.env.DEV) {
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
    if (trimmedMsg.length < 1) {
      return t("radio.messageTooShort");
    }
    if (trimmedMsg.length > 200) {
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

      // Verificar que el mensaje sanitizado no esté vacío
      if (!sanitizedMessage || sanitizedMessage.trim().length === 0) {
        alert(t("radio.messageTooShort"));
        return;
      }

      // Insertar mensaje en la base de datos
      console.log("📤 Enviando mensaje a Supabase...");
      const { data, error } = await supabase
        .from("radio_messages")
        .insert({
          username: sanitizedUsername,
          message: sanitizedMessage,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error al insertar mensaje:", error);
        throw error;
      }

      console.log(
        "✅ Respuesta de Supabase:",
        data ? "Data recibida" : "Sin data"
      );

      // Agregar el mensaje localmente INMEDIATAMENTE para feedback instantáneo
      // Esto asegura que el mensaje aparezca sin esperar a Realtime
      if (!data) {
        console.error("❌ No se recibió data después de insertar mensaje");
        throw new Error("No se recibió data del servidor");
      }

      const newMessage = data as Tables<"radio_messages">;
      console.log("✅ Mensaje insertado en base de datos:", newMessage);

      // Agregar inmediatamente al estado (sin esperar Realtime)
      setMessages((prev) => {
        console.log("📝 Estado actual de mensajes:", prev.length, "mensajes");

        // Verificar que no exista ya (por si el listener de Realtime llegó primero)
        const exists = prev.some((msg) => msg.id === newMessage.id);
        if (exists) {
          console.log(
            "⚠️ Mensaje ya existe (Realtime llegó primero), ignorando duplicado"
          );
          return prev;
        }

        console.log(
          "✅ Agregando mensaje localmente:",
          newMessage.id,
          newMessage.message
        );

        // Agregar al final y ordenar por created_at para mantener orden cronológico
        const updated = [...prev, newMessage];
        const sorted = updated.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        console.log(
          "📊 Mensajes después de agregar:",
          sorted.length,
          "mensajes"
        );
        return sorted;
      });

      // Auto-scroll al final inmediatamente
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      setMessageInput("");
      setLastMessageTime(Date.now());
    } catch (error) {
      // Mostrar mensaje de error más descriptivo
      let errorMessage = t("common.error");
      if (error instanceof Error) {
        errorMessage = error.message;
        // Si es un error de Supabase, extraer el mensaje más legible
        if (error.message.includes("new row violates row-level security")) {
          errorMessage = "Error de permisos. Por favor, recarga la página.";
        } else if (error.message.includes("duplicate key")) {
          errorMessage = "Este mensaje ya fue enviado.";
        } else if (error.message.includes("violates check constraint")) {
          errorMessage =
            "El mensaje no cumple con los requisitos de validación.";
        }
      }
      console.error("Error al enviar mensaje:", error);
      alert(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // Función para obtener punto de origen aleatorio desde diferentes elementos
  const getRandomOriginPoint = (): { x: number; y: number } | null => {
    const origins: Array<() => { x: number; y: number } | null> = [
      // 1. Desde el emoji clickeado
      () => {
        if (emojiButtonRef.current) {
          const rect = emojiButtonRef.current.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }
        return null;
      },
      // 2. Esquina superior izquierda del viewport
      () => {
        return {
          x: 20,
          y: 20,
        };
      },
      // 3. Esquina superior derecha del viewport
      () => {
        return {
          x: window.innerWidth - 20,
          y: 20,
        };
      },
      // 4. Esquina inferior izquierda del viewport (sin incluir el nav)
      () => {
        const navHeight = 60;
        return {
          x: 20,
          y: window.innerHeight - navHeight - 20,
        };
      },
      // 5. Esquina inferior derecha del viewport (sin incluir el nav)
      () => {
        const navHeight = 60;
        return {
          x: window.innerWidth - 20,
          y: window.innerHeight - navHeight - 20,
        };
      },
      // 6. Borde izquierdo medio
      () => {
        return {
          x: 20,
          y: window.innerHeight / 2,
        };
      },
      // 7. Borde derecho medio
      () => {
        return {
          x: window.innerWidth - 20,
          y: window.innerHeight / 2,
        };
      },
      // 8. Borde superior derecho del chat
      () => {
        if (chatContainerRef.current) {
          const rect = chatContainerRef.current.getBoundingClientRect();
          return {
            x: rect.right - 20,
            y: rect.top + 20,
          };
        }
        return null;
      },
      // 9. Esquina superior izquierda del chat
      () => {
        if (chatContainerRef.current) {
          const rect = chatContainerRef.current.getBoundingClientRect();
          return {
            x: rect.left + 20,
            y: rect.top + 20,
          };
        }
        return null;
      },
      // 10. Encima del chat (centro superior) - limitado al viewport
      () => {
        if (chatContainerRef.current) {
          const rect = chatContainerRef.current.getBoundingClientRect();
          const y = Math.max(50, rect.top - 20); // Mínimo 50px desde arriba (debajo de la barra negra)
          return {
            x: rect.left + rect.width / 2,
            y: y,
          };
        }
        return null;
      },
      // 11. Borde inferior izquierdo del cuadro de eventos (sin incluir el nav)
      () => {
        if (eventsContainerRef.current) {
          const rect = eventsContainerRef.current.getBoundingClientRect();
          const navHeight = 60;
          const maxY = window.innerHeight - navHeight - 20;
          const y = Math.min(rect.bottom - 20, maxY);
          return {
            x: rect.left + 20,
            y: y,
          };
        }
        return null;
      },
      // 12. Encima de próximos eventos (centro superior)
      () => {
        if (eventsContainerRef.current) {
          const rect = eventsContainerRef.current.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top - 20,
          };
        }
        return null;
      },
      // 13. Centro de la pantalla
      () => {
        return {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
      },
    ];

    // Filtrar orígenes válidos y seleccionar uno aleatorio
    const validOrigins = origins
      .map((fn) => fn())
      .filter((origin): origin is { x: number; y: number } => origin !== null);

    if (validOrigins.length === 0) {
      // Fallback: centro de la pantalla
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }

    return validOrigins[Math.floor(Math.random() * validOrigins.length)];
  };

  // Función para crear emojis al hacer click (efecto confetti optimizado)
  const handleEmojiClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      // Sin límite - permitir clicks ilimitados
      // Obtener punto de origen aleatorio
      const origin = getRandomOriginPoint();
      if (!origin) return;

      // Asegurar que el origen esté dentro del viewport
      const clampedOrigin = {
        x: Math.max(20, Math.min(origin.x, window.innerWidth - 20)),
        y: Math.max(20, Math.min(origin.y, window.innerHeight - 20)),
      };

      // Generar 5-7 emojis (confetti) - más emojis para mejor efecto
      const count = Math.floor(Math.random() * 3) + 5; // 5-7 emojis
      const newParticles: Array<{
        id: number;
        startX: number;
        startY: number;
        deltaX: number;
        deltaY: number;
        rotation: number;
      }> = [];

      // Obtener límites del viewport (sin incluir el nav que está abajo)
      const viewportHeight = window.innerHeight;
      const navHeight = 60; // Altura aproximada del nav
      const maxY = viewportHeight - navHeight - 40; // 40px de margen
      const minY = 50; // Debajo de la barra negra superior
      const maxX = window.innerWidth - 40;
      const minX = 40;

      for (let i = 0; i < count; i++) {
        emojiIdCounter.current += 1;

        // Distribución circular desde el punto de origen (como confetti 🎉)
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        // Distancia aleatoria (150-350px) - aumentada para mejor efecto
        const distance = 150 + Math.random() * 200;
        // Gravedad simulada
        const gravity = 80 + Math.random() * 120;

        let endX = clampedOrigin.x + Math.cos(angle) * distance;
        let endY = clampedOrigin.y + Math.sin(angle) * distance + gravity;

        // Limitar las posiciones finales dentro del viewport (sin sobrepasar límites)
        endX = Math.max(minX, Math.min(endX, maxX));
        endY = Math.max(minY, Math.min(endY, maxY));

        // Rotación (2-4 vueltas) - más rotación
        const rotation = (2 + Math.random() * 2) * 360;

        // Pre-calcular deltas para evitar cálculos en cada render
        newParticles.push({
          id: emojiIdCounter.current,
          startX: clampedOrigin.x,
          startY: clampedOrigin.y,
          deltaX: endX - clampedOrigin.x,
          deltaY: endY - clampedOrigin.y,
          rotation,
        });
      }

      // Actualizar contador de partículas (solo para referencia, sin límite real)
      emojiParticlesCountRef.current += newParticles.length;

      // Usar requestAnimationFrame para no bloquear el render
      requestAnimationFrame(() => {
        setEmojiParticles((prev) => {
          // Sin límite - agregar todos los emojis
          return [...prev, ...newParticles];
        });

        // Limpiar los emojis después de 3.5 segundos (más tiempo que la animación)
        setTimeout(() => {
          setEmojiParticles((prev) => {
            const filtered = prev.filter(
              (p) => !newParticles.some((np) => np.id === p.id)
            );
            // Actualizar contador cuando se limpian
            emojiParticlesCountRef.current = filtered.length;
            return filtered;
          });
        }, 3500);
      });
    },
    [] // Sin dependencias para evitar loops infinitos
  );

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
            {/* Botón de actualizar/sincronizar */}
            <button
              onClick={handleRefresh}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-white/20 rounded transition-colors cursor-pointer flex-shrink-0"
              aria-label={t("radio.refresh") || "Actualizar"}
              title={t("radio.refresh") || "Sincronizar con el backend"}
            >
              <svg
                className="w-4 h-4 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            {/* 😎 */}
            <img
              src="https://cdn.vixis.dev/Link_Swag.webp"
              alt="Link Swag 🎵"
              className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0 ml-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleEmojiClick}
            />
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
            <button
              onClick={() => {
                if (volume === 0) {
                  // Si está silenciado, restaurar volumen anterior
                  setVolume(previousVolume);
                  if (audioRef.current) {
                    audioRef.current.volume = previousVolume;
                  }
                } else {
                  // Si tiene volumen, silenciar y guardar el volumen actual
                  setPreviousVolume(volume);
                  setVolume(0);
                  if (audioRef.current) {
                    audioRef.current.volume = 0;
                  }
                }
              }}
              className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded transition-colors cursor-pointer flex-shrink-0"
              aria-label={volume === 0 ? t("radio.unmute") : t("radio.mute")}
            >
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
            </button>
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
      {/* No usar src directamente en el JSX para streams en vivo - se maneja programáticamente */}
      <audio
        ref={audioRef}
        muted={false}
        preload="none"
        crossOrigin="anonymous"
        playsInline
      />
      {/* Audio element para jingle/station ID (oculto) */}
      {/* Se crea dinámicamente en handleEnded, pero lo dejamos aquí por si acaso */}

      {/* Contenido principal */}
      <div className="pt-10 md:pt-15 flex-1">
        <div className="max-w-7xl mx-auto px-4 py-12 pb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
            {t("radio.title")}
          </h1>

          {/* Placeholder para el chat en tiempo real */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2">
              <div
                ref={chatContainerRef}
                className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-4 mb-8"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  cursor: "default",
                  minHeight: "200px",
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
              <div
                ref={eventsContainerRef}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
              >
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
                          className="p-3 bg-indigo-100 rounded-lg border border-purple/20 hover:bg-cyan-100 transition-colors cursor-pointer"
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

      {/* Emojis confetti que aparecen al hacer click */}
      {emojiParticles.map((particle) => (
        <img
          key={particle.id}
          src="https://cdn.vixis.dev/Link_Swag.webp"
          alt="Link Swag 🎵"
          className="emoji-confetti fixed pointer-events-none z-[9999]"
          style={
            {
              "--delta-x": `${particle.deltaX}px`,
              "--delta-y": `${particle.deltaY}px`,
              "--rotation": `${particle.rotation}deg`,
              left: `${particle.startX}px`,
              top: `${particle.startY}px`,
              width: "2.5rem",
              height: "2.5rem",
            } as React.CSSProperties & {
              "--delta-x": string;
              "--delta-y": string;
              "--rotation": string;
            }
          }
        />
      ))}
    </div>
  );
}

export default Radio;
