#!/bin/bash
# Detiene el entorno local del portfolio.

cd "$(dirname "$0")"
docker stop portfolio-dev >/dev/null 2>&1 || true
docker rm portfolio-dev >/dev/null 2>&1 || true
rm -f /tmp/vixis-dev.env
echo "Entorno local detenido."
