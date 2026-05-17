#!/bin/bash

# Script para instalar y configurar Liquidsoap en la VM

set -e

echo "Instalando Liquidsoap..."

# Actualizar paquetes
sudo apt-get update

# Instalar dependencias esenciales
sudo apt-get install -y \
    liquidsoap \
    libvorbis-dev \
    libmp3lame-dev \
    libopus-dev \
    libflac-dev \
    libmad0-dev \
    libtag1-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    google-cloud-sdk

# Instalar dependencias opcionales (si están disponibles)
sudo apt-get install -y \
    libfaad-dev \
    libsamplerate0-dev \
    libao-dev \
    libpulse-dev \
    libasound2-dev \
    2>/dev/null || echo "Algunas dependencias opcionales no están disponibles, continuando..."

# Verificar que liquidsoap esté instalado
if ! command -v liquidsoap &> /dev/null; then
    echo "❌ Error: Liquidsoap no se instaló correctamente"
    exit 1
fi

# Verificar instalación
echo "Verificando instalación de Liquidsoap..."
liquidsoap --version

echo "✓ Liquidsoap instalado correctamente"

# Crear directorio para scripts
sudo mkdir -p /home/radio/liquidsoap
sudo chown radio:radio /home/radio/liquidsoap

echo "✓ Directorio creado: /home/radio/liquidsoap"
