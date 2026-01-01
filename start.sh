#!/bin/sh
# Script de inicio que ejecuta Liquidsoap y el health check server en paralelo

# Ejecutar health check server en background
python3 /radio/healthcheck.py > /dev/null 2>&1 &
HEALTHCHECK_PID=$!

# Esperar un momento para que el servidor HTTP inicie
sleep 2

# Ejecutar Liquidsoap en foreground
exec liquidsoap --debug 1 /radio/liquidsoap.liq

