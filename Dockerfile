FROM savonet/liquidsoap:v2.3.1

# Cambiar a root para instalar dependencias
USER root

# Instalar dependencias para descargar desde URLs
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# La imagen base de Liquidsoap usa el usuario 'liquidsoap' (UID 1000)
# Verificar el usuario con: docker run --rm savonet/liquidsoap:v2.3.1 id
USER 1000:1000

# Crear directorio de trabajo
WORKDIR /radio

# Copiar script de Liquidsoap
COPY liquidsoap.liq /radio/liquidsoap.liq

# Ejecutar Liquidsoap
CMD ["liquidsoap", "/radio/liquidsoap.liq"]