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
# IMPORTANTE: reload_mode="watch" puede causar que on_end se dispare prematuramente si detecta cambios.
# Lo desactivamos para esta lógica de 'reinicio total'.
radio_playlist = playlist(
  loop=false,
  playlist_file
)

# Creamos una secuencia que termina en shutdown. 
# Esto asegura que primero se toque toda la playlist (radio_playlist) 
# y, cuando esta se agote, se ejecute la función de cierre.
def restart_handler()
  log("La playlist ha finalizado completamente. Reiniciando servicio...")
  shutdown()
  # Retornamos una fuente vacía para cumplir el tipo de retorno de sequence
  blank()
end

# source.fallback con track_sensitive=true asegura que termine la canción actual
# antes de pasar al siguiente elemento (el shutdown).
radio = source.fallback(track_sensitive=true, [radio_playlist, source.dynamic(restart_handler)])

# Hacer el source seguro
safe_source = mksafe(radio)

# Stream a Icecast
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

log(level=3, "Radio Vixis streaming iniciado (Modo: Reinicio tras fin de playlist)")
