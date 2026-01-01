# Radio Vixis - AutoDJ desde CDN
# Configuración optimizada para 256MB RAM (eNano en Koyeb)

# URL del CDN con la playlist (desde variable de entorno)
# getenv() retorna "" si no existe, usar operador ternario para default
playlist_url = if getenv("PLAYLIST_URL") == "" then "https://cdn.vixis.dev/music/playlist.m3u" else getenv("PLAYLIST_URL")

# Configuración de Icecast (desde variables de entorno)
icecast_host = if getenv("ICECAST_HOST") == "" then "radio.vixis.dev" else getenv("ICECAST_HOST")
icecast_port = int_of_string(if getenv("ICECAST_PORT") == "" then "443" else getenv("ICECAST_PORT"))
icecast_mount = if getenv("ICECAST_MOUNT") == "" then "/vixis" else getenv("ICECAST_MOUNT")
icecast_user = if getenv("ICECAST_USER") == "" then "source" else getenv("ICECAST_USER")
icecast_password = if getenv("ICECAST_PASSWORD") == "" then "" else getenv("ICECAST_PASSWORD")

# Nombre de la radio
radio_name = "Radio Vixis"
radio_description = "Radio en línea de Vixis"

# Cargar playlist con configuración ultra-optimizada
# reload_mode="once" carga una vez al inicio (menos memoria que "watch")
music = playlist(mode="randomize", reload_mode="once", playlist_url)

# Buffer mínimo para reducir memoria (2 segundos)
music = buffer(size=2.0, music)

# Hacer la fuente infalible con fallback mínimo
music = fallback([music, blank()])
music = mksafe(music)

# Conectar a Icecast con bitrate reducido para menos memoria
# Bitrate 96kbps en lugar de 128kbps reduce el uso de CPU y memoria
output.icecast(
  %mp3(bitrate=96, samplerate=44100, stereo=true),
  host=icecast_host,
  port=icecast_port,
  mount=icecast_mount,
  user=icecast_user,
  password=icecast_password,
  name=radio_name,
  description=radio_description,
  music
)