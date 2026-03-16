#!/usr/bin/env liquidsoap

# Script de Liquidsoap para streaming a Icecast
# Lee archivos MP3 desde Google Cloud Storage y los streama a Icecast como OGG Vorbis

# Configuración de Icecast desde variables de entorno
icecast_host = getenv("ICECAST_HOST", default="localhost")
icecast_port = int_of_string(getenv("ICECAST_PORT", default="8000"))
icecast_mount = getenv("ICECAST_MOUNT", default="/vixis")
icecast_password_source = getenv("ICECAST_SOURCE_PASSWORD", default="")
icecast_password_env = getenv("ICECAST_PASSWORD", default="")
icecast_password = if icecast_password_source != "" then icecast_password_source else icecast_password_env end

# Configuración de Google Cloud Storage
gcs_bucket = getenv("GCS_BUCKET_NAME", default="radio-vixis-music")
playlist_file = "/tmp/radio-playlist.m3u"

# Usamos playlist con loop=false para que se agote después de tocar todo.
radio_playlist = playlist(
  loop=false,
  playlist_file
)

# Definimos el cierre del servicio
def restart_service()
  log("La playlist ha finalizado completamente. Reiniciando servicio...")
  shutdown()
end

# Usamos 'append' para encadenar la playlist con una función de shutdown.
# Usamos una sintaxis compatible con Liquidsoap 2.1.3
radio = append(radio_playlist, fun () -> begin
  restart_service()
  blank()
end)

# Hacer el source seguro
safe_source = mksafe(radio)

# Stream a Icecast con OGG Vorbis
output.icecast(
  %vorbis.abr(samplerate=44100, channels=2, bitrate=128, max_bitrate=192, min_bitrate=64),
  host=icecast_host,
  port=icecast_port,
  user="source",
  password=icecast_password,
  mount=icecast_mount,
  name="Radio Vixis",
  description="Radio Vixis Stream",
  genre="Various",
  url="https://radio.vixis.dev",
  safe_source
)

log(level=3, "Radio Vixis streaming iniciado (Modo: SECUENCIAL)")
