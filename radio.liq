#!/usr/bin/env liquidsoap

# Script de Liquidsoap
# Estrategia: loop=false + fallible=true
# Cuando la playlist termina, el output se desconecta y Liquidsoap sale solo.
# Systemd reinicia el servicio automáticamente.

icecast_host = getenv("ICECAST_HOST", default="localhost")
icecast_port = int_of_string(getenv("ICECAST_PORT", default="8000"))
icecast_mount = getenv("ICECAST_MOUNT", default="/vixis")
icecast_password = getenv("ICECAST_SOURCE_PASSWORD", default=getenv("ICECAST_PASSWORD", default=""))

playlist_file = "/tmp/radio-playlist.m3u"

# loop=false: reproduce la lista una sola vez, luego la fuente se agota
radio = playlist(
  loop=false,
  reload_mode="never",
  mode="normal",
  playlist_file
)

# fallible=true: el output NO falla si la fuente se agota, simplemente se desconecta.
# Cuando no hay fuentes activas, Liquidsoap termina el proceso por si solo.
output.icecast(
  %vorbis.abr(samplerate=44100, channels=2, bitrate=128, max_bitrate=192, min_bitrate=64),
  fallible=true,
  host=icecast_host,
  port=icecast_port,
  user="source",
  password=icecast_password,
  mount=icecast_mount,
  name="Radio Vixis",
  description="Radio Vixis Stream",
  genre="Various",
  url="https://radio.vixis.dev",
  radio
)

log(level=3, "Radio Vixis iniciada. Transmitiendo playlist en orden.")
