#!/bin/bash

# Script para iniciar todos los servicios de la radio de forma persistente en segundo plano (WSL)
# Evita que se apaguen al cerrar la terminal o el IDE.

echo "🛑 Deteniendo servicios previos de radio..."
pkill -f liquidsoap || true
pkill -f icecast2 || true
pkill -f cloudflared || true
sleep 2

echo "🚀 Iniciando Icecast2 en segundo plano (nohup)..."
nohup doppler run --project vixis-portfolio --config prd -- ./start-icecast.sh > /tmp/icecast_nohup.log 2>&1 &

# Esperar a que Icecast se levante en el puerto 8000
sleep 3

echo "🚀 Iniciando Liquidsoap en segundo plano (nohup)..."
nohup doppler run --project vixis-portfolio --config prd -- ./start-liquidsoap.sh > /tmp/liquidsoap_nohup.log 2>&1 &

sleep 2

echo "🚀 Iniciando Túnel de Cloudflare en segundo plano (nohup)..."
nohup cloudflared tunnel run --url http://localhost:8000 radio-vixis > /tmp/cloudflared_nohup.log 2>&1 &

sleep 2

echo "📊 Verificando procesos iniciados:"
ps aux | grep -E 'icecast2|liquidsoap|cloudflared' | grep -v grep

echo "✅ Servicios iniciados de forma persistente."
echo "Puedes ver los logs en:"
echo "  - Icecast: tail -f /tmp/icecast_nohup.log"
echo "  - Liquidsoap: tail -f /tmp/liquidsoap_nohup.log"
echo "  - Cloudflared: tail -f /tmp/cloudflared_nohup.log"
