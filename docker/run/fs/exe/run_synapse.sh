#!/bin/bash

. "/ins/setup_venv.sh" "$@"
. "/ins/copy_synapse.sh" "$@"

echo "Запуск менеджера обновления Synapse..."
exec python /exe/self_update_manager.py docker-run-ui
