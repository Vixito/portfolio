FROM savonet/liquidsoap:latest

# Instalar dependencias para descargar desde URLs
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /radio

# Copiar script de Liquidsoap
COPY liquidsoap.liq /radio/liquidsoap.liq

# Ejecutar Liquidsoap
CMD ["liquidsoap", "/radio/liquidsoap.liq"]