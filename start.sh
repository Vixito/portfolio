#!/bin/bash
# Entorno local del portfolio (Vite en Docker + env de Doppler).
# Uso: ./start.sh [--mock]   (--mock arranca sin variables, modo maqueta)

set -e
cd "$(dirname "$0")"

if ! docker info > /dev/null 2>&1; then
  echo "Docker no está corriendo. Inícialo primero."
  exit 1
fi

ENV_FILE=""
if [ "$1" != "--mock" ]; then
  echo "Descargando env de Doppler (dev)..."
  doppler secrets download -p vixis-portfolio -c dev --format env --no-file > /tmp/vixis-dev.env
  chmod 600 /tmp/vixis-dev.env
  ENV_FILE="--env-file /tmp/vixis-dev.env"
else
  echo "Modo mock (sin variables de entorno)."
fi

docker rm -f portfolio-dev >/dev/null 2>&1 || true
# shellcheck disable=SC2086
docker run -d --name portfolio-dev \
  -v "$PWD:/app" -w /app \
  -p 5173:5173 $ENV_FILE \
  denoland/deno:latest sh -c 'deno cache --node-modules-dir=auto src/main.tsx vite.config.ts npm:vite npm:@vitejs/plugin-react >/dev/null 2>&1 && deno run -A --node-modules-dir=auto npm:vite --host 0.0.0.0 --port 5173'

echo ""
echo "Listo: http://localhost:5173"
echo "Para detener: ./stop.sh"
