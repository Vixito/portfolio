#!/bin/bash

# Script para actualizar la playlist M3U desde Google Cloud Storage
# Se ejecuta periódicamente para refrescar la lista de archivos MP3
# Incluye soporte para jingles/station IDs cada N canciones

GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-radio-vixis-music}"
PLAYLIST_FILE="/tmp/radio-playlist.m3u"
TEMP_PLAYLIST="/tmp/radio-playlist-temp.m3u"

# Configuración del jingle desde variables de entorno (cargadas desde Doppler)
JINGLE_URL="${RADIO_JINGLE_URL:-}"
JINGLE_INTERVAL="${RADIO_JINGLE_INTERVAL:-5}"

# Convertir intervalo a número (default: 5)
if ! [[ "$JINGLE_INTERVAL" =~ ^[0-9]+$ ]] || [ "$JINGLE_INTERVAL" -lt 1 ]; then
  JINGLE_INTERVAL=5
fi

# Generar playlist temporal M3U desde GCS (sin jingles aún)
echo "#EXTM3U" > "$TEMP_PLAYLIST"

# Listar archivos MP3 desde GCS y agregar a playlist temporal
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
    echo "#EXTINF:-1,${filename}" >> "$TEMP_PLAYLIST"
    echo "$http_url" >> "$TEMP_PLAYLIST"
    
    echo "✅ Agregado: ${filename}"
  fi
done

# Si no se encontraron archivos con el patrón recursivo, intentar sin recursivo
if [ ! -s "$TEMP_PLAYLIST" ] || [ "$(grep -c "^#EXTINF" "$TEMP_PLAYLIST")" -eq 0 ]; then
  echo "⚠️ No se encontraron archivos con -r, intentando sin recursivo..."
  gsutil -m ls "gs://${GCS_BUCKET_NAME}/*.mp3" 2>/dev/null | while IFS= read -r gs_url; do
    if [ -n "$gs_url" ]; then
      file_count=$((file_count + 1))
      http_url=$(echo "$gs_url" | sed "s|gs://${GCS_BUCKET_NAME}/|https://storage.googleapis.com/${GCS_BUCKET_NAME}/|" | sed 's/ /%20/g')
      filename=$(basename "$gs_url" .mp3 | sed 's/%20/ /g')
      echo "#EXTINF:-1,${filename}" >> "$TEMP_PLAYLIST"
      echo "$http_url" >> "$TEMP_PLAYLIST"
      echo "✅ Agregado: ${filename}"
    fi
  done
fi

# Contar canciones en la playlist temporal
song_count=$(grep -c "^#EXTINF" "$TEMP_PLAYLIST" 2>/dev/null || echo "0")

# Si hay jingle configurado y hay canciones, insertar jingles cada N canciones
if [ -n "$JINGLE_URL" ] && [ "$song_count" -gt 0 ]; then
  echo "🎵 Configurando jingle: URL=${JINGLE_URL}, Intervalo=${JINGLE_INTERVAL} canciones"
  
  # Generar playlist final con jingles intercalados
  echo "#EXTM3U" > "$PLAYLIST_FILE"
  
  song_counter=0
  while IFS= read -r line; do
    # Si es una línea de metadata (#EXTINF), incrementar contador
    if [[ "$line" =~ ^#EXTINF ]]; then
      song_counter=$((song_counter + 1))
      
      # Si es el momento de insertar jingle (cada N canciones, empezando después de la primera)
      if [ "$song_counter" -gt 1 ] && [ $((song_counter % JINGLE_INTERVAL)) -eq 1 ]; then
        echo "🎶 Insertando jingle después de $((song_counter - 1)) canciones"
        # Insertar jingle antes de esta canción
        echo "#EXTINF:-1,Radio Vixis Station ID" >> "$PLAYLIST_FILE"
        echo "$JINGLE_URL" >> "$PLAYLIST_FILE"
      fi
    fi
    
    # Escribir la línea original (canción o URL)
    echo "$line" >> "$PLAYLIST_FILE"
  done < "$TEMP_PLAYLIST"
  
  # Limpiar archivo temporal
  rm -f "$TEMP_PLAYLIST"
  
  # Contar entradas finales (canciones + jingles)
  final_count=$(grep -c "^#EXTINF" "$PLAYLIST_FILE" 2>/dev/null || echo "0")
  jingle_count=$((final_count - song_count))
  
  echo "✅ Playlist actualizada: ${song_count} canciones + ${jingle_count} jingles = ${final_count} entradas totales"
else
  # Sin jingle, usar playlist temporal directamente
  mv "$TEMP_PLAYLIST" "$PLAYLIST_FILE"
  echo "✅ Playlist actualizada: ${song_count} entradas (sin jingles)"
fi

echo "📋 Contenido de la playlist:"
cat "$PLAYLIST_FILE" | head -30  # Mostrar primeras 30 líneas para debug
