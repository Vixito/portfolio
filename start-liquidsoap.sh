#!/bin/bash

# Script wrapper para ejecutar Liquidsoap con variables de entorno de Doppler
# Este script carga las variables de Doppler y luego ejecuta Liquidsoap

set -e

# Cargar variables de entorno desde Doppler
# Usar 'set -a' para auto-exportar todas las variables que se definan
set -a
eval "$(doppler secrets download --no-file --format env --project vixis-portfolio --config cloud)"
set +a

# Exportar explícitamente las variables críticas para asegurar que estén disponibles
export RADIO_JINGLE_URL
export RADIO_JINGLE_INTERVAL

# Exportar las variables necesarias para Liquidsoap
# Doppler puede exportar ICECAST_PASSWORD, pero Liquidsoap busca ICECAST_SOURCE_PASSWORD
# Si ICECAST_SOURCE_PASSWORD no está definida, usar ICECAST_PASSWORD como fallback
if [ -n "$ICECAST_PASSWORD" ] && [ -z "$ICECAST_SOURCE_PASSWORD" ]; then
  export ICECAST_SOURCE_PASSWORD="$ICECAST_PASSWORD"
fi

# Debug: Verificar que las variables de jingle estén disponibles
if [ -n "$RADIO_JINGLE_URL" ]; then
  echo "✅ DEBUG: RADIO_JINGLE_URL está disponible: ${RADIO_JINGLE_URL:0:50}..." >&2
else
  echo "⚠️ DEBUG: RADIO_JINGLE_URL NO está disponible" >&2
fi
echo "🔍 DEBUG: RADIO_JINGLE_INTERVAL=${RADIO_JINGLE_INTERVAL:-NO_CONFIGURADA}" >&2

# Actualizar playlist antes de iniciar Liquidsoap
RADIO_JINGLE_URL="$RADIO_JINGLE_URL" RADIO_JINGLE_INTERVAL="$RADIO_JINGLE_INTERVAL" /home/radio/liquidsoap/update-playlist.sh 2>&1

# Lanzar un actualizador en segundo plano para refrescar la lista cada 2 horas
# Esto permite que Liquidsoap pille las nuevas canciones sin detener la transmisión
(
  while true; do
    sleep 7200
    RADIO_JINGLE_URL="$RADIO_JINGLE_URL" RADIO_JINGLE_INTERVAL="$RADIO_JINGLE_INTERVAL" /home/radio/liquidsoap/update-playlist.sh 2>&1
  done
) &

# Ejecutar Liquidsoap con todas las variables de entorno cargadas
exec /usr/bin/liquidsoap /home/radio/liquidsoap/radio.liq