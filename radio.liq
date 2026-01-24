#!/usr/bin/env liquidsoap

# Script de Liquidsoap para streaming a Icecast
# Lee archivos MP3 desde Google Cloud Storage y los streama a Icecast como OGG Vorbis

# Configuración de Icecast desde variables de entorno
icecast_host = getenv("ICECAST_HOST", default="localhost")
icecast_port = int_of_string(getenv("ICECAST_PORT", default="8000"))
icecast_mount = getenv("ICECAST_MOUNT", default="/vixis")
# Intentar ambas variables de entorno (Doppler exporta ICECAST_PASSWORD, pero también puede ser ICECAST_SOURCE_PASSWORD)
icecast_password_source = getenv("ICECAST_SOURCE_PASSWORD", default="")
icecast_password_env = getenv("ICECAST_PASSWORD", default="")
# Usar la primera que esté disponible
icecast_password = if icecast_password_source != "" then icecast_password_source else icecast_password_env end

# Configuración de Google Cloud Storage
gcs_bucket = getenv("GCS_BUCKET_NAME", default="radio-vixis-music")

# Archivo de playlist que se actualiza dinámicamente
playlist_file = "/tmp/radio-playlist.m3u"

# Crear playlist desde archivo M3U
# Liquidsoap puede leer desde archivos M3U y URLs HTTP
# El archivo se actualiza externamente por update-playlist.sh
# La playlist decodifica automáticamente MP3, OGG, etc.
# Playlist con loop automático
# En Liquidsoap 2.x, la playlist hace loop por defecto
playlist_source = playlist(
  reload_mode="watch",
  reload=60,  # Recargar cada 60 segundos
  loop=true,  # Asegurar que repita indefinidamente
  playlist_file
)

# Hacer el source seguro (maneja errores gracefully)
# mksafe asegura que el stream continúe incluso si hay errores con un track
safe_source = mksafe(playlist_source)

# Stream a Icecast con OGG Vorbis
# output.icecast codifica directamente a OGG Vorbis usando %vorbis.abr
# %vorbis.abr permite especificar bitrate específico (average bitrate)
# No necesitamos decode/encode explícitos - Liquidsoap lo hace automáticamente
# IMPORTANTE: user y password son requeridos para autenticación con Icecast
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

# Log de inicio
log(level=3, "Radio Vixis streaming iniciado")
log(level=3, "Host: #{icecast_host}:#{icecast_port}")
log(level=3, "Mount: #{icecast_mount}")
log(level=3, "GCS Bucket: #{gcs_bucket}")
# Verificar que la contraseña esté configurada (sin mostrarla)
if icecast_password == "" then
  log(level=1, "WARNING: ICECAST_SOURCE_PASSWORD no está configurada!")
else
  log(level=3, "Contraseña configurada (no mostrada por seguridad)")
end
