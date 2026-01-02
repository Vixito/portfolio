FROM ubuntu:22.04

# Instalar FFmpeg y dependencias
RUN apt-get update && \
    apt-get install -y ffmpeg curl python3 && \
    rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN useradd -m -u 1000 radio && \
    mkdir -p /radio && \
    chown -R radio:radio /radio

USER radio
WORKDIR /radio

# Copiar scripts
COPY stream.sh /radio/stream.sh
COPY start.sh /radio/start.sh
COPY healthcheck.py /radio/healthcheck.py

# Hacer ejecutables
USER root
RUN chmod +x /radio/stream.sh /radio/start.sh /radio/healthcheck.py
USER radio

# Ejecutar script de inicio (que maneja health check y streaming)
CMD ["/radio/start.sh"]
