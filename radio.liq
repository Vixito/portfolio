#!/usr/bin/env liquidsoap

# Script de Liquidsoap para streaming continuo
# - Lee la playlist en modo bucle.
# - Recarga la playlist si el archivo se modifica externamente (gracias a 'watch').
# - Al terminarse, simplemente vuelve al inicio, manteniendo a los oyentes dentro.

icecast_host = getenv("ICECAST_HOST", default="localhost")
icecast_port = int_of_string(getenv("ICECAST_PORT", default="8000"))
icecast_mount = getenv("ICECAST_MOUNT", default="/vixis")
icecast_password = getenv("ICECAST_SOURCE_PASSWORD", default=getenv("ICECAST_PASSWORD", default=""))

# Configuración de red para evitar errores 523 (Cloudflare) y timeouts
# Si settings.request.http falla, la forma correcta suele ser directa.
# También aumentamos el timeout.
settings.request.timeout.set(45.0)

# Intentamos fijar el User-Agent global para protocolos HTTP
settings.http.user_agent.set("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# Si Cloudflare bloquea a Liquidsoap pero no a CURL, forzamos a que Liquidsoap
# use CURL para descargar los archivos de Google Storage y Jingles.
protocol.add("https", fun (arg, ~timeout, ~header) -> begin
  headers = list.map(fun(h) -> "-H '#{fst(h)}: #{snd(h)}'", header)
  headers = string.concat(separator=" ", headers)
  process.read.lines("curl -L -s -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' #{headers} '#{arg}'")
end)

playlist_file = "/tmp/radio-playlist.m3u"

# Función para loguear cada track antes de intentar descargarlo
def log_track(metadata)
  filename = metadata["filename"]
  log("Intentando reproducir: #{filename}")
end

# Reproducción infinita (bucle)
# reload_mode="watch" hace que Liquidsoap recargue los MP3 si update-playlist.sh modifica el archivo
radio = playlist(
  loop=true,
  reload_mode="watch",
  mode="normal",
  playlist_file
)

# Registramos el log de track para ver en journalctl qué intenta bajar
radio.on_track(log_track)

# Añadimos un pequeño buffer de seguridad: si la playlist falla, 
# mksafe pondrá 1 segundo de silencio antes de saltar al siguiente intento.
radio = mksafe(radio)

output.icecast(
  %vorbis.abr(samplerate=44100, channels=2, bitrate=128, max_bitrate=192, min_bitrate=64),
  host=icecast_host,
  port=icecast_port,
  user="source",
  password=icecast_password,
  mount=icecast_mount,
  name="Radio Vixis",
  description="Radio Vixis Stream 24/7",
  genre="Various",
  url="https://radio.vixis.dev",
  radio
)

log(level=3, "Radio Vixis iniciada en modo continuo (bucle infinito).")
