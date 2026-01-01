#!/bin/sh
# Script de inicio que ejecuta Liquidsoap y el health check server en paralelo

# Ejecutar health check server en background usando nohup
nohup python3 /radio/healthcheck.py > /dev/null 2>&1 &

# Esperar un momento para que el servidor HTTP inicie
sleep 1

# Ejecutar Liquidsoap en foreground
exec liquidsoap --debug 1 /radio/liquidsoap.liq

