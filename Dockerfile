FROM savonet/liquidsoap:v2.3.1

# Cambiar a root para instalar dependencias
USER root

# Instalar dependencias para descargar desde URLs
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Volver al usuario original de la imagen
USER $(id -u):$(id -g)

# Crear directorio de trabajo
WORKDIR /radio

# Copiar script de Liquidsoap
COPY liquidsoap.liq /radio/liquidsoap.liq

# Ejecutar Liquidsoap
CMD ["liquidsoap", "/radio/liquidsoap.liq"]