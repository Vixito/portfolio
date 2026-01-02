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
# Host interno de Koyeb (si los servicios pueden comunicarse entre sí)
# IMPORTANTE: Debe ser el nombre EXACTO del servicio de Icecast en Koyeb
ICECAST_INTERNAL_HOST="${ICECAST_INTERNAL_HOST:-}"
# Supabase Storage (requerido para leer archivos directamente)
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_STORAGE_BUCKET="${SUPABASE_STORAGE_BUCKET:-music}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

# Codificar contraseña para URL (manejar caracteres especiales)
# FFmpeg requiere que la contraseña esté codificada en la URL
# Usar urllib.parse.quote con safe='' para codificar todos los caracteres especiales
ICECAST_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; import sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$ICECAST_PASSWORD")

# Intentar usar host interno con puerto 8000 si está configurado
# Esto evita problemas de TLS al usar HTTP directo entre servicios
# IMPORTANTE: En Koyeb, el host interno debe ser el nombre EXACTO del servicio
# No uses "cool-lorne" (ese es el nombre del servicio FFmpeg, no Icecast)
if [ -n "$ICECAST_INTERNAL_HOST" ]; then
    ICECAST_HOST_FINAL="$ICECAST_INTERNAL_HOST"
    ICECAST_PORT_FINAL="8000"
    PROTOCOL="http"
    echo "Usando host interno de Koyeb: ${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL}"
else
    # Si no hay host interno, usar host público (HTTPS)
    ICECAST_HOST_FINAL="$ICECAST_HOST"
    ICECAST_PORT_FINAL="$ICECAST_PORT"
    # Determinar protocolo según el puerto
    if [ "$ICECAST_PORT" = "443" ]; then
        PROTOCOL="https"
    else
        PROTOCOL="http"
    fi
    echo "Usando host público: ${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL} (${PROTOCOL})"
    echo "NOTA: Si tienes problemas de TLS, configura ICECAST_INTERNAL_HOST con el nombre del servicio de Icecast en Koyeb"
fi

# Construir URL de Icecast usando HTTP/HTTPS directo con autenticación básica
# Usar HTTP directo es más confiable que icecast:// para FFmpeg
ICECAST_URL="${PROTOCOL}://${ICECAST_USER}:${ICECAST_PASSWORD_ENCODED}@${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL}${ICECAST_MOUNT}"

# Debug: mostrar URL sin contraseña para logs
ICECAST_URL_DEBUG="${PROTOCOL}://${ICECAST_USER}:***@${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL}${ICECAST_MOUNT}"
echo "URL de Icecast (sin contraseña): ${ICECAST_URL_DEBUG}"
echo "Protocolo: ${PROTOCOL}"
echo "Puerto: ${ICECAST_PORT_FINAL}"
echo "Host: ${ICECAST_HOST_FINAL}"

echo "Iniciando streaming a Icecast..."
echo "Host: ${ICECAST_HOST_FINAL}"
echo "Port: ${ICECAST_PORT_FINAL}"
echo "Mount: ${ICECAST_MOUNT}"

# Verificar que Supabase esté configurado
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "ERROR: SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados"
    echo "Configura estas variables de entorno en Koyeb:"
    echo "  SUPABASE_URL=https://rshlpiottljwhyxmcxjn.supabase.co"
    echo "  SUPABASE_ANON_KEY=[tu_anon_key]"
    exit 1
fi

echo "Usando Supabase Storage: ${SUPABASE_URL}"
echo "Bucket: ${SUPABASE_STORAGE_BUCKET}"

# Función para reproducir una URL con FFmpeg
play_url() {
    local url="$1"
    echo "Reproduciendo: $url"
    
    # Stream con FFmpeg usando HTTP/HTTPS directo con método PUT
    # -re: leer a velocidad real (importante para streaming)
    # -i: input (URL del archivo)
    # -user_agent: usar User-Agent de navegador para evitar bloqueos de CloudFront
    # -headers: agregar headers adicionales
    # -map 0:a:0: SOLO usar el primer stream de audio (ignorar portadas/video embebidos)
    # -f mp3: forzar formato de entrada MP3 (evita detección incorrecta de formato)
    # -acodec copy: copiar el codec sin re-encodificar (más eficiente, menos memoria)
    # Si el archivo no es MP3, usar libmp3lame para re-encodificar
    # -ab 96k: bitrate 96kbps (optimizado para memoria)
    # -ar 44100: sample rate 44.1kHz
    # -ac 2: stereo
    # -f mp3: formato de salida MP3
    # -content_type audio/mpeg: tipo de contenido para Icecast
    # -method PUT: usar método PUT para enviar el stream (requerido por Icecast)
    # -loglevel fatal: solo mostrar errores fatales (reduce logs)
    # -timeout 10000000: timeout para conexiones (microsegundos)
    # -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1: reconectar automáticamente
    # -tls_verify 0: deshabilitar verificación TLS (evita errores de certificado)
    # -multiple_requests 1: permitir múltiples requests en la misma conexión
    # -reconnect_delay_max 5: máximo delay entre reconexiones
    # -rw_timeout 10000000: timeout para read/write operations
    # Usar HTTP/HTTPS directo con autenticación básica en la URL y método PUT explícito
    # Intentar primero con copy (sin re-encodificar), si falla, re-encodificar
    FFMPEG_OPTS=(
        -re
        -user_agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        -headers "Referer: https://vixis.dev/\r\n"
        -f mp3
        -i "$url"
        -map 0:a:0
        -acodec copy
        -f mp3
        -content_type audio/mpeg
        -method PUT
        -loglevel error
        -timeout 10000000
        -rw_timeout 10000000
        -reconnect 1
        -reconnect_at_eof 1
        -reconnect_streamed 1
        -reconnect_delay_max 5
        -fflags +genpts
    )
    
    # Agregar opciones TLS solo si usamos HTTPS
    if [ "$PROTOCOL" = "https" ]; then
        FFMPEG_OPTS+=(-tls_verify 0 -multiple_requests 1)
    fi
    
    # Intentar con copy primero
    if ! ffmpeg "${FFMPEG_OPTS[@]}" "$ICECAST_URL" 2>&1; then
        # Si falla con copy, intentar re-encodificar (solo audio)
        FFMPEG_OPTS_REENCODE=(
            -re
            -user_agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
            -headers "Referer: https://vixis.dev/\r\n"
            -i "$url"
            -map 0:a:0
            -acodec libmp3lame -ab 96k -ar 44100 -ac 2
            -f mp3
            -content_type audio/mpeg
            -method PUT
            -loglevel error
            -timeout 10000000
            -rw_timeout 10000000
            -reconnect 1
            -reconnect_at_eof 1
            -reconnect_streamed 1
            -reconnect_delay_max 5
            -fflags +genpts
        )
        
        if [ "$PROTOCOL" = "https" ]; then
            FFMPEG_OPTS_REENCODE+=(-tls_verify 0 -multiple_requests 1)
        fi
        
        ffmpeg "${FFMPEG_OPTS_REENCODE[@]}" "$ICECAST_URL" 2>&1
    fi
}

# Función para listar archivos MP3 desde Supabase Storage
list_mp3_files() {
    echo "Listando archivos MP3 desde Supabase Storage..."
    
    # Usar la API de Supabase Storage para listar archivos
    # POST /storage/v1/object/list/{bucket_id}
    LIST_RESPONSE=$(curl -s --max-time 15 \
        -X POST \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"prefix":"","limit":1000,"offset":0,"sortBy":{"column":"name","order":"asc"},"search":""}' \
        "${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_STORAGE_BUCKET}")
    
    if [ -z "$LIST_RESPONSE" ]; then
        echo "Error: No se pudo listar archivos desde Supabase Storage"
        return 1
    fi
    
    # Extraer nombres de archivos MP3 del JSON usando python3
    # El formato de respuesta es: [{"name":"archivo.mp3",...},...]
    MP3_FILES=$(echo "$LIST_RESPONSE" | python3 -c "
import sys
import json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        mp3_files = [item['name'] for item in data if isinstance(item, dict) and item.get('name', '').lower().endswith('.mp3')]
        print('\n'.join(mp3_files))
    else:
        print('', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print('', file=sys.stderr)
    sys.exit(1)
")
    
    if [ -z "$MP3_FILES" ]; then
        echo "Advertencia: No se encontraron archivos MP3 en el bucket"
        return 1
    fi
    
    echo "$MP3_FILES"
    return 0
}

# Loop infinito para reproducir archivos continuamente
while true; do
    # Listar archivos MP3 desde Supabase Storage
    MP3_FILES=$(list_mp3_files)
    
    if [ -z "$MP3_FILES" ]; then
        echo "Error: No se pudieron obtener archivos MP3, reintentando en 10 segundos..."
        sleep 10
        continue
    fi
    
    # Contar archivos
    FILE_COUNT=$(echo "$MP3_FILES" | wc -l)
    echo "Encontrados ${FILE_COUNT} archivos MP3"
    
    # Procesar archivos y mezclar aleatoriamente
    echo "$MP3_FILES" | shuf | while IFS= read -r filename; do
        # Construir URL pública de Supabase Storage
        # Codificar el nombre del archivo para URL (manejar espacios y caracteres especiales)
        FILENAME_ENCODED=$(python3 -c "import urllib.parse; import sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$filename")
        URL="${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${FILENAME_ENCODED}"
        
        echo "Verificando: $filename"
        
        # Verificar que la URL sea accesible y sea un archivo MP3
        HTTP_CODE=$(curl -s --max-time 15 -I -o /dev/null -w "%{http_code}" \
            -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
            "$URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "206" ]; then
            echo "Advertencia: URL no accesible (HTTP $HTTP_CODE): $URL, saltando..."
            sleep 1
            continue
        fi
        
        # Verificar que el Content-Type sea audio/mpeg o audio/mp3
        CONTENT_TYPE=$(curl -s --max-time 15 -I \
            -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
            "$URL" 2>/dev/null | grep -i "content-type:" | cut -d' ' -f2 | tr -d '\r' || echo "")
        
        if [[ ! "$CONTENT_TYPE" =~ ^audio/(mpeg|mp3|mpeg3) ]]; then
            echo "Advertencia: URL no es un archivo MP3 válido (Content-Type: $CONTENT_TYPE): $URL, saltando..."
            sleep 1
            continue
        fi
        
        # Reproducir URL
        play_url "$URL" || {
            echo "Error al reproducir $URL, continuando con siguiente..."
            sleep 1
        }
    done
    
    echo "Todos los archivos reproducidos, reiniciando lista..."
    sleep 2
done
