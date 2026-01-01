#!/bin/bash

# Script para generar icecast.xml desde variables de entorno

# Verificar que las variables de entorno estén definidas
if [ -z "$ICECAST_SOURCE_PASSWORD" ] || [ -z "$ICECAST_RELAY_PASSWORD" ] || [ -z "$ICECAST_ADMIN_PASSWORD" ] || [ -z "$ICECAST_HOSTNAME" ]; then
    echo "Error: Variables de entorno requeridas no están definidas"
    echo "Necesitas: ICECAST_SOURCE_PASSWORD, ICECAST_RELAY_PASSWORD, ICECAST_ADMIN_PASSWORD, ICECAST_HOSTNAME"
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

# Generar icecast.xml desde el template en un directorio con permisos de escritura
envsubst < /etc/icecast2/icecast.xml.template > /tmp/icecast2/icecast.xml

# Iniciar Icecast con el archivo generado
exec icecast2 -c /tmp/icecast2/icecast.xml