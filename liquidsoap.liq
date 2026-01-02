# Radio Vixis - AutoDJ desde CDN
# Configuración optimizada para 256MB RAM (eNano en Koyeb)

# URL del CDN con la playlist (desde variable de entorno)
playlist_url_env = getenv("PLAYLIST_URL")
playlist_url = if playlist_url_env == "" then "https://cdn.vixis.dev/music/playlist.m3u" else playlist_url_env

# Configuración de Icecast (desde variables de entorno)
icecast_host_env = getenv("ICECAST_HOST")
icecast_host = if icecast_host_env == "" then "radio.vixis.dev" else icecast_host_env

icecast_port_env = getenv("ICECAST_PORT")
icecast_port_str = if icecast_port_env == "" then "443" else icecast_port_env
icecast_port = int_of_string(icecast_port_str)

icecast_mount_env = getenv("ICECAST_MOUNT")
icecast_mount = if icecast_mount_env == "" then "/vixis" else icecast_mount_env

icecast_user_env = getenv("ICECAST_USER")
icecast_user = if icecast_user_env == "" then "source" else icecast_user_env

icecast_password_env = getenv("ICECAST_PASSWORD")
icecast_password = if icecast_password_env == "" then "" else icecast_password_env

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
# Sintaxis simplificada: fuente como primer parámetro después del formato
output.icecast(%mp3(bitrate=96, samplerate=44100, stereo=true), music, host=icecast_host, port=icecast_port, mount=icecast_mount, user=icecast_user, password=icecast_password, name=radio_name, description=radio_description)
