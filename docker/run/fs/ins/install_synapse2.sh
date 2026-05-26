#!/bin/bash
set -e

# Скрипт сброса кэша для ускорения процесса сборки

# Удаление склонированного репозитория (для всех веток кроме local)
if [ "$1" != "local" ]; then
    rm -rf /git/synapse
fi

# Повторный вызов основного скрипта установки
bash /ins/install_synapse.sh "$@"

# Очистка кэша пакетов Python
. "/ins/setup_venv.sh" "$@"
pip cache purge
uv cache prune