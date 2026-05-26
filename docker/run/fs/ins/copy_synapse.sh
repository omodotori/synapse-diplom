#!/bin/bash
set -e

# Пути
SOURCE_DIR="/git/synapse"
TARGET_DIR="/synapse"

# Копирование файлов исходного кода, если run_ui.py отсутствует в целевой директории
if [ ! -f "$TARGET_DIR/run_ui.py" ]; then
    echo "Копируем исходники из $SOURCE_DIR в $TARGET_DIR..."
    cp -rn --no-preserve=ownership,mode "$SOURCE_DIR/." "$TARGET_DIR"
fi