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

# Codificar contraseña para URL (manejar caracteres especiales)
# FFmpeg requiere que la contraseña esté codificada en la URL
# Usar urllib.parse.quote con safe='' para codificar todos los caracteres especiales
ICECAST_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; import sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$ICECAST_PASSWORD")

# Determinar protocolo según el puerto
if [ "$ICECAST_PORT" = "443" ]; then
    PROTOCOL="https"
else
    PROTOCOL="http"
fi

# Construir URL de Icecast usando HTTP/HTTPS directo con autenticación básica
# Usar HTTP directo es más confiable que icecast:// para FFmpeg
ICECAST_URL="${PROTOCOL}://${ICECAST_USER}:${ICECAST_PASSWORD_ENCODED}@${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}"

# Debug: mostrar URL sin contraseña para logs
ICECAST_URL_DEBUG="${PROTOCOL}://${ICECAST_USER}:***@${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}"
echo "URL de Icecast (sin contraseña): ${ICECAST_URL_DEBUG}"
echo "Protocolo: ${PROTOCOL}"
echo "Puerto: ${ICECAST_PORT}"

echo "Iniciando streaming a Icecast..."
echo "Host: ${ICECAST_HOST}"
echo "Port: ${ICECAST_PORT}"
echo "Mount: ${ICECAST_MOUNT}"
echo "Playlist: ${PLAYLIST_URL}"

# Función para reproducir una URL con FFmpeg
play_url() {
    local url="$1"
    echo "Reproduciendo: $url"
    
    # Stream con FFmpeg usando HTTP/HTTPS directo con método PUT
    # -re: leer a velocidad real (importante para streaming)
    # -i: input (URL del archivo)
    # -user_agent: usar User-Agent de navegador para evitar bloqueos de CloudFront
    # -headers: agregar headers adicionales
    # -acodec libmp3lame: codec MP3
    # -ab 96k: bitrate 96kbps (optimizado para memoria)
    # -ar 44100: sample rate 44.1kHz
    # -ac 2: stereo
    # -f mp3: formato de salida MP3
    # -content_type audio/mpeg: tipo de contenido para Icecast
    # -method PUT: usar método PUT para enviar el stream (requerido por Icecast)
    # -loglevel fatal: solo mostrar errores fatales (reduce logs)
    # -timeout 10000000: timeout para conexiones (microsegundos)
    # -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1: reconectar automáticamente
    # Usar HTTP/HTTPS directo con autenticación básica en la URL y método PUT explícito
    ffmpeg -re \
        -user_agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
        -headers "Referer: https://vixis.dev/\r\n" \
        -i "$url" \
        -acodec libmp3lame -ab 96k -ar 44100 -ac 2 \
        -f mp3 \
        -content_type audio/mpeg \
        -method PUT \
        -loglevel fatal \
        -timeout 10000000 \
        -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 \
        -fflags +genpts \
        "$ICECAST_URL" 2>&1 | head -20
}

# Loop infinito para reproducir la playlist continuamente
while true; do
    # Descargar playlist con headers de navegador
    PLAYLIST=$(curl -s \
        -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
        -H "Referer: https://vixis.dev/" \
        "${PLAYLIST_URL}")
    
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
        
        # Verificar que la URL sea accesible antes de intentar reproducir
        # Usar User-Agent de navegador para evitar bloqueos de CloudFront
        # Aumentar timeout para CloudFront (puede tardar más en responder)
        HTTP_CODE=$(curl -s --max-time 15 -o /dev/null -w "%{http_code}" \
            -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
            -H "Referer: https://vixis.dev/" \
            "$URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "206" ]; then
            echo "Advertencia: URL no accesible (HTTP $HTTP_CODE): $URL, saltando..."
            # Esperar un poco antes de continuar para evitar spam de logs
            sleep 2
            continue
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
