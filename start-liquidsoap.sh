#!/bin/bash

# Script wrapper para ejecutar Liquidsoap con variables de entorno de Doppler
# Este script carga las variables de Doppler y luego ejecuta Liquidsoap

set -e

# Cargar variables de entorno desde Doppler
eval "$(doppler secrets download --no-file --format env --project vixis-portfolio --config cloud)"

# Exportar las variables necesarias para Liquidsoap
# Doppler puede exportar ICECAST_PASSWORD, pero Liquidsoap busca ICECAST_SOURCE_PASSWORD
# Si ICECAST_SOURCE_PASSWORD no está definida, usar ICECAST_PASSWORD como fallback
if [ -n "$ICECAST_PASSWORD" ] && [ -z "$ICECAST_SOURCE_PASSWORD" ]; then
  export ICECAST_SOURCE_PASSWORD="$ICECAST_PASSWORD"
fi

# Actualizar playlist antes de iniciar Liquidsoap
/home/radio/liquidsoap/update-playlist.sh

# Ejecutar Liquidsoap con todas las variables de entorno cargadas
exec /usr/bin/liquidsoap /home/radio/liquidsoap/radio.liq