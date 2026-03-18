#!/usr/bin/env liquidsoap

# Script de Liquidsoap para streaming continuo
# - Lee la playlist en modo bucle.
# - Recarga la playlist si el archivo se modifica externamente (gracias a 'watch').
# - Al terminarse, simplemente vuelve al inicio, manteniendo a los oyentes dentro.

icecast_host = getenv("ICECAST_HOST", default="localhost")
icecast_port = int_of_string(getenv("ICECAST_PORT", default="8000"))
icecast_mount = getenv("ICECAST_MOUNT", default="/vixis")
icecast_password = getenv("ICECAST_SOURCE_PASSWORD", default=getenv("ICECAST_PASSWORD", default=""))

playlist_file = "/tmp/radio-playlist.m3u"

# Reproducción infinita (bucle)
# reload_mode="watch" hace que Liquidsoap recargue los MP3 si update-playlist.sh modifica el archivo
radio = playlist(
  loop=true,
  reload_mode="watch",
  mode="normal",
  playlist_file
)

# mksafe evita crasheos o desconexiones de Icecast en caso de fallos momentáneos de la lista.
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
