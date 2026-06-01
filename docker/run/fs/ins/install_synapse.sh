#!/bin/bash
set -e

# Прерывание скрипта в случае возникновения ошибки
# set -e

# Получение ветки сборки из параметров
if [ -z "$1" ]; then
    echo "Ошибка: Ветка не указана. Пожалуйста, передайте корректное название ветки."
    exit 1
fi
BRANCH="$1"

if [ "$BRANCH" = "local" ]; then
    # Использование локальной ветки
    echo "Используются локальные файлы разработки из /git/synapse"
else
    # Клонирование из репозитория для всех остальных веток
    echo "Клонирование репозитория, ветка: $BRANCH..."
    git clone -b "$BRANCH" "https://github.com/synapseai/synapse" "/git/synapse" || {
        echo "КРИТИЧЕСКАЯ ОШИБКА: Не удалось склонировать репозиторий. Ветка: $BRANCH"
        exit 1
    }
fi

. "/ins/setup_venv.sh" "$@"

# Установка Python-зависимостей платформы Synapse
uv pip install -r /git/synapse/requirements.txt
# Установка дополнительных зависимостей
uv pip install -r /git/synapse/requirements2.txt

# Установка браузера playwright
bash /ins/install_playwright.sh "$@"

# Предварительная загрузка компонентов ядра Synapse
# python /git/synapse/preload.py --dockerized=true
