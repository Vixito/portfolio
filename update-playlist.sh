#!/bin/bash

# Script para actualizar la playlist M3U desde Google Cloud Storage
# Se ejecuta periódicamente para refrescar la lista de archivos MP3

GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-radio-vixis-music}"
PLAYLIST_FILE="/tmp/radio-playlist.m3u"

# Generar playlist M3U desde GCS
echo "#EXTM3U" > "$PLAYLIST_FILE"

# Listar archivos MP3 desde GCS y agregar a playlist
# Usar -m para procesamiento en paralelo y asegurar que el while loop funcione correctamente
gsutil -m ls "gs://${GCS_BUCKET_NAME}/*.mp3" 2>/dev/null | while IFS= read -r gs_url; do
  # Verificar que la línea no esté vacía
  if [ -n "$gs_url" ]; then
    # Convertir gs://bucket/file.mp3 a https://storage.googleapis.com/bucket/file.mp3
    http_url=$(echo "$gs_url" | sed "s|gs://${GCS_BUCKET_NAME}/|https://storage.googleapis.com/${GCS_BUCKET_NAME}/|" | sed 's/ /%20/g')
    
    # Extraer nombre del archivo para metadata (sin extensión)
    filename=$(basename "$gs_url" .mp3 | sed 's/%20/ /g')
    
    # Agregar entrada M3U
    echo "#EXTINF:-1,${filename}" >> "$PLAYLIST_FILE"
    echo "$http_url" >> "$PLAYLIST_FILE"
  fi
done

# Contar líneas (excluyendo el header #EXTM3U y líneas vacías)
line_count=$(grep -v "^#" "$PLAYLIST_FILE" | grep -v "^$" | wc -l)
entry_count=$((line_count / 2))  # Cada entrada tiene 2 líneas (#EXTINF y URL)

echo "Playlist actualizada: ${entry_count} entradas"
