FROM savonet/liquidsoap:v2.3.1

# Instalar dependencias para descargar desde URLs
RUN mkdir -p /var/lib/apt/lists/partial && \
    apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /radio

# Copiar script de Liquidsoap
COPY liquidsoap.liq /radio/liquidsoap.liq

# Ejecutar Liquidsoap
CMD ["liquidsoap", "/radio/liquidsoap.liq"]