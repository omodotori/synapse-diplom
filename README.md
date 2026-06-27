# Synapse 🧠

![Python Version](https://img.shields.io/badge/Python-3.12%2B-blue?logo=python&logoColor=white)
![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js&logoColor=white)
![Framework](https://img.shields.io/badge/Framework-Flask%20%7C%20Alpine.js-lightgrey)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)


**Synapse** — это автономный агентный ИИ-фреймворк с открытым исходным кодом. 
Он разработан для создания ИИ-ассистентов, способных взаимодействовать с операционной системой, выполнять код, управлять файлами и координировать работу с другими агентами (sub-agents) для решения сложных задач.

Проект построен на связке Python (Flask) и легковесного фронтенда на Alpine.js. Благодаря архитектуре плагинов, Synapse легко расширяется под любые нужды разработчиков и энтузиастов.

## ✨ Основные возможности

*   **💻 Code Execution:** Безопасное выполнение Python, Bash, Node.js и PowerShell скриптов в изолированной Docker-среде.
*   **👥 Многоагентность:** Главный агент может порождать подчиненных агентов (sub-agents) для параллельного выполнения подзадач.
*   **🔌 Система плагинов:** Фуллстек-плагины позволяют добавлять новые инструменты, API-эндпоинты и элементы интерфейса без изменения ядра.
*   **🤖 Универсальность LLM:** Поддержка множества языковых моделей через LiteLLM (OpenRouter, OpenAI, Anthropic, Gemini, Ollama и др.).
*   **💬 Реактивный WebUI:** Быстрый и минималистичный интерфейс на Alpine.js и WebSocket (Socket.IO) с потоковой передачей ответов и визуализацией "потока мыслей" агента.
*   **📱 Интеграция с мессенджерами:** Встроенные плагины для Telegram и WhatsApp для удаленного управления агентом.

## 🛠 Технологический стек

*   **Бэкенд:** Python 3.12+, Flask, python-socketio, LiteLLM
*   **Фронтенд:** HTML5, Vanilla CSS, Alpine.js
*   **Инфраструктура:** Docker & Docker Compose (изоляция песочницы)

## ⚡ Установка и запуск

### Требования

*   Python 3.12+
*   Docker Engine 24+ и Docker Compose v2 (обязательно для безопасного выполнения кода)
*   API-ключ одного из поддерживаемых LLM-провайдеров (рекомендуется OpenRouter)

### Быстрый старт (Docker)

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/your-username/synapse.git
   cd synapse
   ```

2. **Настройте переменные окружения:**
   ```bash
   cp .env.example usr/.env
   ```
   *Откройте `usr/.env`, задайте ваш `API_KEY_OPENROUTER` (или ключ другого провайдера) и обязательно смените `AUTH_PASSWORD`.*

3. **Запустите через Docker Compose:**
   ```bash
   cd docker/run
   docker-compose up -d --build
   ```
   WebUI будет доступен по адресу: **http://localhost:50080**

### Локальная разработка

Для создания плагинов и изменения ядра фреймворка:

```bash
# Создание и активация виртуального окружения
python -m venv .venv
source .venv/bin/activate  # Для Windows: .venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt
pip install -r requirements2.txt

# Запуск фреймворка (скрипт для Windows)
.\start.bat
```

## 📁 Структура проекта

```text
synapse/
├── agent.py              # Ядро: логика агента и цикл размышлений (Monologue)
├── initialize.py         # Инициализация фреймворка
├── run_ui.py             # Точка входа бэкенда (Flask + Socket.IO)
├── api/                  # HTTP и WebSocket хэндлеры
├── helpers/              # Утилиты ядра и загрузчик плагинов
├── tools/                # Встроенные инструменты агента (выполнение кода, файлы и т.д.)
├── plugins/              # Базовые системные плагины
├── webui/                # Фронтенд (Alpine.js)
├── usr/                  # Пользовательские данные, плагины и рабочая директория (workdir)
└── docker/               # Docker-образы для изоляции
```

## 🧩 Разработка плагинов

Функционал Synapse расширяется через плагины. Любой плагин может содержать:
*   Инструменты (Tools) для агента
*   Новые API и WebSocket хэндлеры
*   UI-компоненты и модальные окна для фронтенда
*   Хуки жизненного цикла фреймворка

Пользовательские плагины размещаются в `usr/plugins/`. Подробное руководство по созданию плагинов находится в `docs/agents/AGENTS.plugins.md`.

## 🧪 Тестирование

Проект использует `pytest` для unit- и интеграционного тестирования.

```bash
pip install -r requirements.dev.txt
pytest
```

## 📜 Лицензия

Проект распространяется под лицензией MIT. Подробнее см. файл `LICENSE`.