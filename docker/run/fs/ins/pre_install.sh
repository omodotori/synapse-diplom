#!/bin/bash
set -e

# Обновление списка пакетов apt с retry-логикой
for i in 1 2 3; do
    rm -rf /var/lib/apt/lists/*
    apt-get clean
    apt-get update -y --fix-missing && break
    echo "apt-get update: попытка $i не удалась, повтор через 5с..."
    sleep 5
done

# Установка пакетов с --fix-missing чтобы не падать на временно недоступных
apt-get install -y --fix-missing cmake clang libclang-dev

# Исправление прав доступа для файлов cron, если они существуют
if ls /etc/cron.d/* 2>/dev/null | grep -q .; then
    chmod 0644 /etc/cron.d/*
fi

# Подготовка SSH-сервера
bash /ins/setup_ssh.sh "$@"