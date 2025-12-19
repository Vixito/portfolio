#!/bin/bash

# Script para generar icecast.xml desde variables de entorno

# Verificar que las variables de entorno estén definidas
if [ -z "$ICECAST_SOURCE_PASSWORD" ] || [ -z "$ICECAST_RELAY_PASSWORD" ] || [ -z "$ICECAST_ADMIN_PASSWORD" ] || [ -z "$ICECAST_HOSTNAME" ]; then
    echo "Error: Variables de entorno requeridas no están definidas"
    echo "Necesitas: ICECAST_SOURCE_PASSWORD, ICECAST_RELAY_PASSWORD, ICECAST_ADMIN_PASSWORD, ICECAST_HOSTNAME"
    exit 1
fi

# Generar icecast.xml desde el template
envsubst < /etc/icecast2/icecast.xml.template > /etc/icecast2/icecast.xml

# Iniciar Icecast
exec icecast2 -c /etc/icecast2/icecast.xml