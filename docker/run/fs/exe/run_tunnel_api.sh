#!/bin/bash

# Ожидание файла run_tunnel.py
echo "Запуск Tunnel API..."

sleep 1
while [ ! -f /synapse/run_tunnel.py ]; do
    echo "Ожидание файла /synapse/run_tunnel.py..."
    sleep 1
done

. "/ins/setup_venv.sh" "$@"

exec python /synapse/run_tunnel.py \
    --dockerized=true \
    --port=80 \
    --tunnel_api_port=55520 \
    --host="0.0.0.0"
