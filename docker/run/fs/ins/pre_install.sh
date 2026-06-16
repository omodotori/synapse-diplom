#!/bin/bash
set -e

# Обновление списка пакетов apt
apt-get update
apt-get install -y cmake clang libclang-dev

# Исправление прав доступа для файлов cron, если они существуют
if [ -f /etc/cron.d/* ]; then
    chmod 0644 /etc/cron.d/*
fi

# Подготовка SSH-сервера
bash /ins/setup_ssh.sh "$@"
