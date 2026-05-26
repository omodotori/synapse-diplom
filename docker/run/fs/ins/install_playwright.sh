#!/bin/bash
set -e

# Активация виртуального окружения
. "/ins/setup_venv.sh" "$@"

# Установка playwright (если не установлен через requirements)
uv pip install playwright

# Установка пути инсталляции браузеров playwright в директорию Synapse
export PLAYWRIGHT_BROWSERS_PATH=/synapse/tmp/playwright

# Установка chromium и его зависимостей
apt-get install -y fonts-unifont libnss3 libnspr4 libatk1.0-0 libatspi2.0-0 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libcups2
playwright install chromium --only-shell
