#!/bin/bash

# Script de streaming con FFmpeg a Icecast
# Configuración optimizada para 256MB RAM (eNano en Koyeb)

# Variables de entorno con valores por defecto
PLAYLIST_URL="${PLAYLIST_URL:-https://cdn.vixis.dev/music/playlist.m3u}"
ICECAST_HOST="${ICECAST_HOST:-radio.vixis.dev}"
ICECAST_PORT="${ICECAST_PORT:-443}"
ICECAST_MOUNT="${ICECAST_MOUNT:-/vixis}"
ICECAST_USER="${ICECAST_USER:-source}"
ICECAST_PASSWORD="${ICECAST_PASSWORD:-}"

# URL de Icecast
ICECAST_URL="icecast://${ICECAST_USER}:${ICECAST_PASSWORD}@${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}"

echo "Iniciando streaming a Icecast..."
echo "Host: ${ICECAST_HOST}"
echo "Port: ${ICECAST_PORT}"
echo "Mount: ${ICECAST_MOUNT}"
echo "Playlist: ${PLAYLIST_URL}"

# Función para reproducir una URL con FFmpeg
play_url() {
    local url="$1"
    echo "Reproduciendo: $url"
    
    # Stream con FFmpeg
    # -re: leer a velocidad real (importante para streaming)
    # -i: input (URL del archivo)
    # -acodec libmp3lame: codec MP3
    # -ab 96k: bitrate 96kbps (optimizado para memoria)
    # -ar 44100: sample rate 44.1kHz
    # -ac 2: stereo
    # -f mp3: formato de salida MP3
    # -loglevel error: solo mostrar errores
    ffmpeg -re -i "$url" \
        -acodec libmp3lame -ab 96k -ar 44100 -ac 2 \
        -f mp3 \
        -loglevel error \
        "$ICECAST_URL" 2>&1
}

# Loop infinito para reproducir la playlist continuamente
while true; do
    # Descargar playlist
    PLAYLIST=$(curl -s "${PLAYLIST_URL}")
    
    if [ -z "$PLAYLIST" ]; then
        echo "Error: No se pudo descargar la playlist, reintentando en 10 segundos..."
        sleep 10
        continue
    fi
    
    # Procesar playlist y mezclar aleatoriamente
    echo "$PLAYLIST" | grep -v "^#" | grep -v "^$" | shuf | while IFS= read -r line; do
        # Determinar URL completa
        if [[ "$line" =~ ^https?:// ]]; then
            URL="$line"
        else
            URL="https://cdn.vixis.dev/music/$line"
        fi
        
        # Reproducir URL
        play_url "$URL" || {
            echo "Error al reproducir $URL, continuando con siguiente..."
            sleep 1
        }
    done
    
    echo "Playlist terminada, reiniciando..."
    sleep 2
done
