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

# Determinar protocolo basado en el puerto
# Si el puerto es 443, usar HTTPS; de lo contrario, HTTP
if [ "$ICECAST_PORT" = "443" ]; then
    ICECAST_PROTOCOL="https"
else
    ICECAST_PROTOCOL="http"
fi

# Construir URL de Icecast usando formato HTTP/HTTPS directo
# El protocolo icecast:// puede no funcionar bien con HTTPS
# Usar formato HTTP directo: http://user:pass@host:port/mount
# FFmpeg soporta autenticación básica HTTP en URLs
ICECAST_URL="${ICECAST_PROTOCOL}://${ICECAST_USER}:${ICECAST_PASSWORD_ENCODED}@${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}"

# Debug: mostrar URL sin contraseña para logs
ICECAST_URL_DEBUG="${ICECAST_PROTOCOL}://${ICECAST_USER}:***@${ICECAST_HOST}:${ICECAST_PORT}${ICECAST_MOUNT}"
echo "URL de Icecast (sin contraseña): ${ICECAST_URL_DEBUG}"
echo "Protocolo: ${ICECAST_PROTOCOL}"

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
    # -user_agent: usar User-Agent de navegador para evitar bloqueos de CloudFront
    # -headers: agregar headers adicionales
    # -acodec libmp3lame: codec MP3
    # -ab 96k: bitrate 96kbps (optimizado para memoria)
    # -ar 44100: sample rate 44.1kHz
    # -ac 2: stereo
    # -f mp3: formato de salida MP3
    # -content_type audio/mpeg: tipo de contenido para Icecast
    # -method PUT: usar método PUT para enviar el stream (requerido por Icecast)
    # -loglevel error: solo mostrar errores
    # -timeout 5000000: timeout para conexiones (microsegundos)
    # -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1: reconectar automáticamente
    # Usar formato HTTP/HTTPS directo con autenticación básica en la URL
    # Icecast requiere método PUT para recibir streams
    # Nota: Si el puerto es 443 y falla, puede ser necesario usar el puerto interno 8000
    # Para eso, configura ICECAST_PORT=8000 en las variables de entorno de Koyeb
    ffmpeg -re \
        -user_agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
        -headers "Referer: https://vixis.dev/\r\n" \
        -i "$url" \
        -acodec libmp3lame -ab 96k -ar 44100 -ac 2 \
        -f mp3 \
        -content_type audio/mpeg \
        -method PUT \
        -loglevel error \
        -timeout 5000000 \
        -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 \
        "$ICECAST_URL" 2>&1
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
