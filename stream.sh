#!/bin/bash

# Script de streaming con FFmpeg a Icecast
# Configuración optimizada para 256MB RAM (eNano en Koyeb)

# Variables de entorno con valores por defecto
ICECAST_HOST="${ICECAST_HOST:-localhost}"  # Por defecto localhost si Icecast está en la misma VM
ICECAST_PORT="${ICECAST_PORT:-8000}"   # Puerto 8000 (HTTP)
ICECAST_MOUNT="${ICECAST_MOUNT:-/vixis}"
ICECAST_USER="${ICECAST_USER:-source}"
ICECAST_PASSWORD="${ICECAST_PASSWORD:-}"
# Google Cloud Storage (requerido para leer archivos)
GCS_BUCKET_NAME="${GCS_BUCKET_NAME:-}"
ICECAST_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; import sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$ICECAST_PASSWORD")

# ESTRATEGIA: Si Icecast está en la misma VM, usar localhost (más rápido y confiable)
# Si está en otro servidor, usar la URL pública
if [ "$ICECAST_HOST" = "localhost" ] || [ "$ICECAST_HOST" = "127.0.0.1" ]; then
    ICECAST_HOST_FINAL="localhost"
    ICECAST_PORT_FINAL="8000"
    PROTOCOL="http"
    echo "✓ Usando Icecast LOCAL (misma VM): ${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL} (HTTP)"
    echo "  Esto evita problemas de red y latencia"
else
    # Si está en otro servidor (ej: Koyeb), usar la URL pública
    ICECAST_HOST_FINAL="$ICECAST_HOST"
    ICECAST_PORT_FINAL="$ICECAST_PORT"
    
    # Determinar protocolo basado en el puerto
    if [ "$ICECAST_PORT_FINAL" = "443" ]; then
        PROTOCOL="https"
    else
        PROTOCOL="http"
    fi
    
    echo "ℹ Usando Icecast REMOTO: ${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL} (${PROTOCOL})"
fi

# Construir URL de Icecast usando HTTP PUT con OGG Vorbis
# Cambiamos a OGG Vorbis (formato nativo de Icecast) para evitar problemas con MP3
# Icecast maneja OGG Vorbis nativamente sin warnings ni problemas
ICECAST_URL="${PROTOCOL}://${ICECAST_USER}:${ICECAST_PASSWORD_ENCODED}@${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL}${ICECAST_MOUNT}"

# Debug: mostrar URL sin contraseña para logs
ICECAST_URL_DEBUG="${PROTOCOL}://${ICECAST_USER}:***@${ICECAST_HOST_FINAL}:${ICECAST_PORT_FINAL}${ICECAST_MOUNT}"
echo "URL de Icecast (sin contraseña): ${ICECAST_URL_DEBUG}"
echo "Protocolo: ${PROTOCOL} (HTTP PUT con OGG Vorbis)"
echo "Puerto: ${ICECAST_PORT_FINAL}"
echo "Formato: OGG Vorbis (nativo de Icecast, sin warnings)"
echo "Host: ${ICECAST_HOST_FINAL}"

echo "Iniciando streaming a Icecast..."
echo "Host: ${ICECAST_HOST_FINAL}"
echo "Port: ${ICECAST_PORT_FINAL}"
echo "Mount: ${ICECAST_MOUNT}"

# Verificar que GCS esté configurado
if [ -z "$GCS_BUCKET_NAME" ]; then
    echo "ERROR: GCS_BUCKET_NAME debe estar configurado"
    echo "Configura esta variable de entorno:"
    echo "  GCS_BUCKET_NAME=mi-bucket-de-musica"
    exit 1
fi

echo "Usando Google Cloud Storage Bucket: ${GCS_BUCKET_NAME}"

# Función para reproducir una URL con FFmpeg
play_url() {
    local url="$1"
    echo "Reproduciendo: $url"
    
    # Stream con FFmpeg usando HTTP PUT con OGG Vorbis (formato nativo de Icecast)
    # IMPORTANTE: Cambiamos a OGG Vorbis porque:
    # 1. Es el formato nativo preferido de Icecast (sin warnings)
    # 2. No tiene restricciones de licencia
    # 3. Mejor calidad a menor bitrate
    # 4. Icecast lo maneja nativamente sin problemas
    # FFmpeg convertirá automáticamente los MP3 a OGG Vorbis en tiempo real
    # -re: leer a velocidad real (importante para streaming)
    # -i: input (URL del archivo) - FFmpeg detectará automáticamente MP3, OGG, etc.
    # -user_agent: usar User-Agent de navegador para evitar bloqueos de CloudFront
    # -headers: agregar headers adicionales
    # -map 0:a:0: SOLO usar el primer stream de audio (ignorar portadas/video embebidos)
    # -acodec libvorbis: codificar a OGG Vorbis (formato nativo de Icecast)
    # -ab 128k: bitrate 128kbps (mejor calidad que MP3 a mismo bitrate)
    # -ar 44100: sample rate 44.1kHz
    # -ac 2: stereo
    # -f ogg: formato de salida OGG
    # -content_type application/ogg: tipo de contenido para Icecast (OGG Vorbis)
    # -method PUT: usar método PUT para enviar el stream (requerido por Icecast)
    # -ice_name "Radio Vixis": nombre del stream para Icecast (metadata)
    # -ice_description "Radio Vixis Stream": descripción del stream
    # -ice_genre "Various": género del stream
    # -loglevel warning: mostrar warnings y errores (para debugging)
    # -timeout 10000000: timeout para conexiones (microsegundos)
    # -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1: reconectar automáticamente
    # -reconnect_delay_max 5: máximo delay entre reconexiones
    # -rw_timeout 10000000: timeout para read/write operations
    # -fflags +genpts: generar PTS (Presentation Time Stamp) para el stream
    # FFmpeg convertirá automáticamente los MP3 a OGG Vorbis en tiempo real
    FFMPEG_OPTS=(
        -re
        -user_agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        -headers "Referer: https://vixis.dev/\r\n"
        -i "$url"
        -map 0:a:0
        -acodec libvorbis
        -ab 128k
        -ar 44100
        -ac 2
        -f ogg
        -content_type application/ogg
        -method PUT
        -ice_name "Radio Vixis"
        -ice_description "Radio Vixis Stream"
        -ice_genre "Various"
        -loglevel warning
        -timeout 10000000
        -rw_timeout 10000000
        -reconnect 1
        -reconnect_at_eof 1
        -reconnect_streamed 1
        -reconnect_delay_max 5
        -fflags +genpts
    )
    
    # Capturar salida de FFmpeg para análisis de errores
    FFMPEG_OUTPUT=$(ffmpeg "${FFMPEG_OPTS[@]}" "$ICECAST_URL" 2>&1)
    FFMPEG_EXIT_CODE=$?
    
    # Verificar si el archivo se envió exitosamente
    # "Broken pipe" al final es normal cuando el archivo termina
    # Si hay "bytes written" y solo "Broken pipe", es exitoso
    if echo "$FFMPEG_OUTPUT" | grep -qi "bytes written"; then
        if echo "$FFMPEG_OUTPUT" | grep -qi "broken pipe" && ! echo "$FFMPEG_OUTPUT" | grep -qiE "error|failed|cannot|connection.*timeout"; then
            echo "✓ Archivo reproducido exitosamente"
            return 0
        fi
    fi
    
    if [ $FFMPEG_EXIT_CODE -ne 0 ]; then
        echo "⚠ Error al reproducir (código: $FFMPEG_EXIT_CODE)" >&2
        echo "Últimas líneas de FFmpeg:" >&2
        echo "$FFMPEG_OUTPUT" | tail -10 >&2
        
        # Verificar si es un error TLS
        if echo "$FFMPEG_OUTPUT" | grep -qi "tls\|ssl\|certificate\|handshake"; then
            echo "❌ Error TLS detectado." >&2
        fi
        
        # Si falla, el stream continuará con el siguiente archivo
        return 1
    else
        echo "$FFMPEG_OUTPUT" | tail -5
    fi
}

# Cache para la lista de archivos MP3 (para reducir solicitudes analíticas)
# Cache válido por 5 minutos (300 segundos)
CACHE_FILE="/tmp/mp3_files_cache.txt"
CACHE_TIMESTAMP="/tmp/mp3_files_cache_timestamp.txt"
CACHE_DURATION=300

# Función para listar archivos MP3 desde Google Cloud Storage
# Con cache para reducir solicitudes analíticas
list_mp3_files() {
    # Verificar si el cache es válido
    if [ -f "$CACHE_FILE" ] && [ -f "$CACHE_TIMESTAMP" ]; then
        CURRENT_TIME=$(date +%s)
        CACHE_TIME=$(cat "$CACHE_TIMESTAMP" 2>/dev/null || echo "0")
        TIME_DIFF=$((CURRENT_TIME - CACHE_TIME))
        
        if [ "$TIME_DIFF" -lt "$CACHE_DURATION" ]; then
            # Cache válido, usar archivos cacheados
            echo "Usando lista de archivos en cache (${TIME_DIFF}s de antigüedad)..." >&2
            cat "$CACHE_FILE"
            return 0
        fi
    fi
    
    # Cache expirado o no existe, obtener lista fresca
    echo "Listando archivos MP3 desde GCS (gs://${GCS_BUCKET_NAME})..." >&2
    
    # Usar gsutil para listar archivos (requiere que la VM tenga permisos storage-ro)
    # gsutil ls devuelve rutas completas tipo: gs://bucket/file.mp3
    if ! command -v gsutil &> /dev/null; then
        echo "Error: gsutil no está instalado. Asegúrate de instalar Google Cloud SDK." >&2
        return 1
    fi

    # Listar archivos recursivamente (**) o planos (*)
    # Filtramos solo archivos .mp3
    MP3_FILES_RAW=$(gsutil ls "gs://${GCS_BUCKET_NAME}/**.mp3" 2>/dev/null)
    
    if [ -z "$MP3_FILES_RAW" ]; then
        echo "Advertencia: No se encontraron archivos MP3 en el bucket gs://${GCS_BUCKET_NAME}" >&2
        # Si hay cache antiguo, usarlo como fallback
        if [ -f "$CACHE_FILE" ]; then
            echo "Usando cache antiguo como fallback..." >&2
            cat "$CACHE_FILE"
            return 0
        fi
        return 1
    fi
    
    # Limpiar la salida para obtener solo el path relativo (quitamos gs://bucket/)
    # Esto nos permite procesar los nombres limpiamente
    MP3_FILES=$(echo "$MP3_FILES_RAW" | sed "s|gs://${GCS_BUCKET_NAME}/||")
    
    # Guardar en cache
    echo "$MP3_FILES" > "$CACHE_FILE"
    date +%s > "$CACHE_TIMESTAMP"
    echo "Lista de archivos actualizada y guardada en cache" >&2
    
    echo "$MP3_FILES"
    return 0
}

# Loop infinito para reproducir archivos continuamente
while true; do
    # Listar archivos MP3 desde GCS
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
        # Codificar el nombre del archivo para URL (espacios, caracteres especiales)
        FILENAME_ENCODED=$(python3 -c "import urllib.parse; import sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$filename")
        
        # Construir URL pública de GCS
        URL="https://storage.googleapis.com/${GCS_BUCKET_NAME}/${FILENAME_ENCODED}"
        
        echo "Reproduciendo: $filename"
        
        play_url "$URL" || {
            echo "Error al reproducir $URL, continuando con siguiente..."
            sleep 1
        }
    done
    
    echo "Todos los archivos reproducidos, reiniciando lista..."
    sleep 2
done
