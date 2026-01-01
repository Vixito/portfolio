FROM savonet/liquidsoap:35660b4

# Cambiar a root para instalar dependencias
USER root

# Instalar dependencias para descargar desde URLs y Python para health check
RUN apt-get update && \
    apt-get install -y curl python3 && \
    rm -rf /var/lib/apt/lists/*

# La imagen base de Liquidsoap usa el usuario 'liquidsoap' (UID 1000)
# Verificar el usuario con: docker run --rm savonet/liquidsoap:v2.3.1 id
USER 1000:1000

# Crear directorio de trabajo
WORKDIR /radio

# Copiar scripts
COPY liquidsoap.liq /radio/liquidsoap.liq
COPY healthcheck.py /radio/healthcheck.py
COPY start.sh /radio/start.sh

# Hacer ejecutable el script de inicio
USER root
RUN chmod +x /radio/start.sh /radio/healthcheck.py
USER 1000:1000

# Ejecutar script de inicio que lanza ambos servicios
CMD ["/radio/start.sh"]