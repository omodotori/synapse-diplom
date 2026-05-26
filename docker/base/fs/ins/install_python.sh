#!/bin/bash
set -e

echo "====================PYTHON START===================="

echo "====================PYTHON 3.13===================="

apt clean && apt-get update && apt-get -y upgrade

# Глобальная установка python 3.13
apt-get install -y --no-install-recommends \
    python3.13 python3.13-venv 
    #python3.13-dev


echo "====================PYTHON 3.13 VENV===================="

# Создание и активация виртуального окружения по умолчанию
python3.13 -m venv /opt/venv
source /opt/venv/bin/activate

# Обновление pip и установка базовых пакетов
pip install --no-cache-dir --upgrade pip pipx ipython requests

echo "====================PYTHON PYVENV===================="

# Установка зависимостей для сборки pyenv
apt-get install -y --no-install-recommends \
    make build-essential libssl-dev zlib1g-dev libbz2-dev \
    libreadline-dev libsqlite3-dev wget curl llvm \
    libncursesw5-dev xz-utils tk-dev libxml2-dev \
    libxmlsec1-dev libffi-dev liblzma-dev

# Глобальная установка pyenv
git clone https://github.com/pyenv/pyenv.git /opt/pyenv

# Настройка переменных окружения для доступности pyenv во всей системе
cat > /etc/profile.d/pyenv.sh <<'EOF'
export PYENV_ROOT="/opt/pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
EOF

# Исправление прав доступа
chmod +x /etc/profile.d/pyenv.sh

# Загрузка переменных pyenv для использования в текущем скрипте
source /etc/profile.d/pyenv.sh

# Установка Python 3.12.4
echo "====================PYENV 3.12 VENV===================="
pyenv install 3.12.4

/opt/pyenv/versions/3.12.4/bin/python -m venv /opt/venv-synapse
source /opt/venv-synapse/bin/activate

# Обновление pip и установка базовых пакетов
pip install --no-cache-dir --upgrade pip pipx

# Установка пакетов с конкретными версиями
pip install --no-cache-dir \
    torch==2.4.0 \
    torchvision==0.19.0 \
    --index-url https://download.pytorch.org/whl/cpu

echo "====================PYTHON UV ===================="

curl -Ls https://astral.sh/uv/install.sh | UV_INSTALL_DIR=/usr/local/bin sh

# Очистка кэша pip
pip cache purge

echo "====================PYTHON END===================="
