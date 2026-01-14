#!/bin/bash

# Script para actualizar la playlist M3U desde Google Cloud Storage
# Se ejecuta periódicamente para refrescar la lista de archivos MP3

GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-radio-vixis-music}"
PLAYLIST_FILE="/tmp/radio-playlist.m3u"

# Generar playlist M3U desde GCS
echo "#EXTM3U" > "$PLAYLIST_FILE"

# Listar archivos MP3 desde GCS y agregar a playlist
# Usar -m para procesamiento en paralelo y asegurar que el while loop funcione correctamente
# IMPORTANTE: Usar -r para listar recursivamente y encontrar todos los MP3s
echo "🔍 Buscando archivos MP3 en gs://${GCS_BUCKET_NAME}/*.mp3..."
file_count=0

# Listar todos los MP3s (recursivo si hay subdirectorios)
gsutil -m ls -r "gs://${GCS_BUCKET_NAME}/**/*.mp3" 2>/dev/null | while IFS= read -r gs_url; do
  # Verificar que la línea no esté vacía
  if [ -n "$gs_url" ]; then
    file_count=$((file_count + 1))
    echo "📁 Procesando archivo $file_count: $gs_url"
    
    # Convertir gs://bucket/file.mp3 a https://storage.googleapis.com/bucket/file.mp3
    http_url=$(echo "$gs_url" | sed "s|gs://${GCS_BUCKET_NAME}/|https://storage.googleapis.com/${GCS_BUCKET_NAME}/|" | sed 's/ /%20/g')
    
    # Extraer nombre del archivo para metadata (sin extensión)
    filename=$(basename "$gs_url" .mp3 | sed 's/%20/ /g')
    
    # Agregar entrada M3U
    echo "#EXTINF:-1,${filename}" >> "$PLAYLIST_FILE"
    echo "$http_url" >> "$PLAYLIST_FILE"
    
    echo "✅ Agregado: ${filename}"
  fi
done

# Si no se encontraron archivos con el patrón recursivo, intentar sin recursivo
if [ ! -s "$PLAYLIST_FILE" ] || [ "$(grep -c "^#EXTINF" "$PLAYLIST_FILE")" -eq 0 ]; then
  echo "⚠️ No se encontraron archivos con -r, intentando sin recursivo..."
  gsutil -m ls "gs://${GCS_BUCKET_NAME}/*.mp3" 2>/dev/null | while IFS= read -r gs_url; do
    if [ -n "$gs_url" ]; then
      file_count=$((file_count + 1))
      http_url=$(echo "$gs_url" | sed "s|gs://${GCS_BUCKET_NAME}/|https://storage.googleapis.com/${GCS_BUCKET_NAME}/|" | sed 's/ /%20/g')
      filename=$(basename "$gs_url" .mp3 | sed 's/%20/ /g')
      echo "#EXTINF:-1,${filename}" >> "$PLAYLIST_FILE"
      echo "$http_url" >> "$PLAYLIST_FILE"
      echo "✅ Agregado: ${filename}"
    fi
  done
fi

# Contar líneas (excluyendo el header #EXTM3U y líneas vacías)
entry_count=$(grep -c "^#EXTINF" "$PLAYLIST_FILE" 2>/dev/null || echo "0")

echo "✅ Playlist actualizada: ${entry_count} entradas"
echo "📋 Contenido de la playlist:"
cat "$PLAYLIST_FILE" | head -20  # Mostrar primeras 20 líneas para debug
