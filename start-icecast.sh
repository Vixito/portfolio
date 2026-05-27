#!/bin/bash

# Script para generar icecast.xml desde variables de entorno

# Cargar fallbacks si no están definidos
if [ -z "$ICECAST_SOURCE_PASSWORD" ] && [ -n "$ICECAST_PASSWORD" ]; then
    export ICECAST_SOURCE_PASSWORD="$ICECAST_PASSWORD"
fi
if [ -z "$ICECAST_RELAY_PASSWORD" ]; then
    export ICECAST_RELAY_PASSWORD="${ICECAST_SOURCE_PASSWORD:-change-me}"
fi
if [ -z "$ICECAST_ADMIN_PASSWORD" ]; then
    export ICECAST_ADMIN_PASSWORD="${ICECAST_SOURCE_PASSWORD:-change-me}"
fi
if [ -z "$ICECAST_HOSTNAME" ]; then
    export ICECAST_HOSTNAME="localhost"
fi

if [ -z "$ICECAST_SOURCE_PASSWORD" ]; then
    echo "Error: ICECAST_SOURCE_PASSWORD (o ICECAST_PASSWORD) no está definida"
    exit 1
fi

# Función para escapar caracteres especiales XML
escape_xml() {
    echo "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'"'"'/\&apos;/g'
}

# Escapar las contraseñas para XML y exportarlas con los mismos nombres
export ICECAST_SOURCE_PASSWORD=$(escape_xml "$ICECAST_SOURCE_PASSWORD")
export ICECAST_RELAY_PASSWORD=$(escape_xml "$ICECAST_RELAY_PASSWORD")
export ICECAST_ADMIN_PASSWORD=$(escape_xml "$ICECAST_ADMIN_PASSWORD")

# Obtener el directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="$SCRIPT_DIR/icecast.xml"
if [ ! -f "$TEMPLATE_PATH" ]; then
    TEMPLATE_PATH="/etc/icecast2/icecast.xml.template"
fi

# Asegurar que el directorio de destino exista
mkdir -p /tmp/icecast2

# Generar icecast.xml desde el template en un directorio con permisos de escritura
envsubst < "$TEMPLATE_PATH" > /tmp/icecast2/icecast.xml

# Iniciar Icecast con el archivo generado
exec icecast2 -c /tmp/icecast2/icecast.xml