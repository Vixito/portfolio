#!/usr/bin/env liquidsoap

# Script para Radio Vixis (Liquidsoap 2.1.3)
# Sin ajustes de configuración globales para evitar incompatibilidades de versión.

# 1. Configuración de Icecast (Cargada desde Doppler)
icecast_host = environment.get(default="localhost", "ICECAST_HOST")
icecast_port = int_of_string(environment.get(default="8000", "ICECAST_PORT"))
icecast_mount = environment.get(default="/vixis", "ICECAST_MOUNT")
icecast_password = environment.get(default=environment.get(default="", "ICECAST_PASSWORD"), "ICECAST_SOURCE_PASSWORD")

playlist_file = "/tmp/radio-playlist.m3u"

# 2. Fuente de audio: Playlist dinámica desde M3U
radio = playlist(
  loop=true,
  reload_mode="watch",
  mode="normal",
  playlist_file
)

# 3. Asegurar la fuente (Mantenemos el stream vivo ante cualquier error)
radio = mksafe(radio)

# 4. Salida de audio -> Icecast (Ogg Vorbis)
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

log("Radio Vixis 24/7 iniciada con éxito.")
