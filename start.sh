#!/bin/sh
# Script de inicio que ejecuta Liquidsoap y el health check server en paralelo

# Ejecutar health check server en background
python3 /radio/healthcheck.py &

# Ejecutar Liquidsoap en foreground
exec liquidsoap --debug 1 /radio/liquidsoap.liq

