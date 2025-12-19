# Radio Vixis - AutoDJ desde CDN
# Configuración

# URL del CDN con la playlist (desde variable de entorno)
playlist_url = getenv("PLAYLIST_URL", default="https://cdn.vixis.dev/music/playlist.m3u")

# Configuración de Icecast (desde variables de entorno)
icecast_host = getenv("ICECAST_HOST", default="radio.vixis.dev")
icecast_port = int_of_string(getenv("ICECAST_PORT", default="443"))
icecast_mount = getenv("ICECAST_MOUNT", default="/vixis")
icecast_user = getenv("ICECAST_USER", default="source")
icecast_password = getenv("ICECAST_PASSWORD", default="")

# Nombre de la radio
radio_name = "Radio Vixis"
radio_description = "Radio en línea de Vixis"

# Cargar playlist desde CDN
# Liquidsoap puede leer playlists M3U desde URLs HTTP/HTTPS
music = playlist(mode="randomize", reload_mode="watch", playlist_url)

# Hacer la fuente infalible
music = fallback([music, blank()])
music = mksafe(music)

# Conectar a Icecast
output.icecast(
  %mp3(bitrate=128, samplerate=44100, stereo=true),
  host=icecast_host,
  port=icecast_port,
  mount=icecast_mount,
  user=icecast_user,
  password=icecast_password,
  name=radio_name,
  description=radio_description,
  music
)