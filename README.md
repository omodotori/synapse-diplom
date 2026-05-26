# Synapse 🧠

**Synapse** — это современный агентный фреймворк с открытым исходным кодом для создания автономных ИИ-агентов, способных использовать операционную систему как инструмент. Проект построен на принципах многоагентного взаимодействия, долгосрочной памяти и гибкой плагинной архитектуры.

---

## 🚀 Основные возможности

- **Многоагентная среда** — агенты создают «подчинённых» для декомпозиции сложных задач
- **Интеграция с ОС** — доступ к терминалу, файловой системе и браузеру
- **RAG и Память** — FAISS + векторные эмбеддинги для долгосрочного хранения контекста и знаний
- **LiteLLM** — поддержка 100+ провайдеров ИИ (OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama и др.)
- **Плагинная архитектура** — расширение через систему хуков и динамическую загрузку инструментов
- **Современный WebUI** — интуитивный интерфейс на Alpine.js для управления чатами, плагинами и настройками
- **CSRF-защита и авторизация** — безопасный доступ через логин/пароль и CSRF-токены
- **MCP-сервер** — поддержка Model Context Protocol для интеграции с внешними инструментами
- **Docker-деплой** — готовая контейнеризация через docker-compose

---

## 🧰 Функциональные возможности (подробно)

### Инструменты агента (Tools)

Агент использует набор инструментов для выполнения задач. Каждый инструмент — Python-класс в папке `tools/`:

| Инструмент | Файл | Описание |
|---|---|---|
| **Code Execution** | Плагин `_code_execution` | Выполнение Python, Bash, PowerShell кода в изолированной среде |
| **Call Subordinate** | `call_subordinate.py` | Создание подчинённого агента для делегирования подзадач |
| **Search Engine** | `search_engine.py` | Поиск в интернете через SearXNG |
| **Document Query** | `document_query.py` | Чтение и анализ документов (PDF, DOCX, TXT и др.) |
| **Vision Load** | `vision_load.py` | Загрузка и анализ изображений (для моделей с vision) |
| **Scheduler** | `scheduler.py` | Планирование задач по расписанию (cron), одноразовых и плановых |
| **Skills** | `skills_tool.py` | Поиск, загрузка и использование навыков (SKILL.md стандарт) |
| **Notify User** | `notify_user.py` | Отправка уведомлений пользователю через WebUI |
| **A2A Chat** | `a2a_chat.py` | Обмен сообщениями между агентами (Agent-to-Agent протокол) |
| **Response** | `response.py` | Финальный ответ пользователю (завершение цикла размышлений) |
| **Wait** | `wait.py` | Пауза выполнения на заданное время |
| **Browser** | `browser._py` | Управление браузером через Playwright (навигация, скриншоты) |
| **Knowledge** | `knowledge_tool._py` | Работа с базой знаний агента (сохранение/извлечение из FAISS) |

### Системные плагины (20 шт.)

Плагины расширяют функционал через систему хуков. Расположены в `plugins/`:

| Плагин | Описание |
|---|---|
| `_model_config` | Настройка LLM-моделей (Chat, Utility, Embedding) с пресетами |
| `_code_execution` | Исполнение кода в терминале (Python, Bash, Node.js, PowerShell) |
| `_browser_agent` | Автоматизация браузера через Playwright |
| `_memory` | Долгосрочная память на основе FAISS (сохранение/вспоминание) |
| `_chat_branching` | Ветвление диалогов (создание альтернативных веток) |
| `_chat_compaction` | Сжатие длинных диалогов для экономии контекста |
| `_email_integration` | Интеграция с Email (IMAP/SMTP) |
| `_telegram_integration` | Бот для Telegram |
| `_whatsapp_integration` | Интеграция с WhatsApp |
| `_error_retry` | Автоматический повтор при ошибках LLM |
| `_infection_check` | Проверка на prompt injection |
| `_onboarding` | Экран приветствия для новых пользователей |
| `_plugin_installer` | Установка пользовательских плагинов |
| `_plugin_scan` | Сканирование и обнаружение новых плагинов |
| `_plugin_validator` | Валидация манифестов плагинов |
| `_promptinclude` | Динамическое включение промптов |
| `_skills` | Управление навыками (Anthropic SKILL.md стандарт) |
| `_text_editor` | Редактор текстовых файлов в WebUI |
| `_discovery` | Автоматическое обнаружение возможностей |
| `_a0_connector` | Интеграция с Synapse API |

### Профили агентов

В папке `agents/` находятся предустановленные профили:

| Профиль | Описание |
|---|---|
| `synapse` | Универсальный агент по умолчанию |
| `default` | Базовый профиль с минимальной конфигурацией |
| `developer` | Оптимизирован для задач разработки |
| `hacker` | Расширенные инструменты для тестирования безопасности |
| `researcher` | Фокус на поиске и анализе информации |

### Веб-интерфейс (WebUI)

Фронтенд на Alpine.js с компонентной архитектурой:

| Компонент | Описание |
|---|---|
| **Chat** | Интерфейс чата с поддержкой Markdown, LaTeX, подсветкой кода |
| **Sidebar** | Боковая панель со списком чатов, проектов и навигацией |
| **Settings** | Настройки моделей, API-ключей, безопасности, плагинов |
| **Modals** | Стековая система модальных окон для настроек и плагинов |
| **Notifications** | Всплывающие уведомления от агентов и системы |
| **Projects** | Управление проектами (привязка чатов к папкам) |
| **Welcome Screen** | Экран приветствия при первом входе |
| **File Browser** | Просмотр и редактирование файлов рабочей директории |
| **Drag & Drop** | Загрузка файлов перетаскиванием |
| **Speech** | Голосовой ввод (Whisper) и синтез речи (Kokoro TTS) |

### Система безопасности

| Механизм | Описание |
|---|---|
| **Авторизация** | Login/password через Flask sessions (SHA-512 хэширование с pepper) |
| **CSRF-защита** | Все API-запросы проверяют X-CSRF-Token |
| **Constant-time сравнение** | `hmac.compare_digest()` для защиты от timing attacks |
| **Авто-генерация ключей** | `FLASK_SECRET_KEY` генерируется при первом запуске |
| **Маскировка API-ключей** | Ключи скрываются при отображении на фронтенде |
| **Origin-проверка** | Защита от DNS rebinding через Origin-заголовки |
| **Rate Limiting** | Ограничение частоты запросов к LLM провайдерам |
| **Brute-force защита** | Задержка 1 секунда при неверном пароле |

---

## 🏗 Архитектура

```
┌────────────────────────────────────────────────────────┐
│                     WebUI (Alpine.js)                  │
│       Чат • Настройки • Плагины • Уведомления          │
└──────────────────────┬─────────────────────────────────┘
                       │ HTTP / WebSocket (Socket.IO)
┌──────────────────────▼─────────────────────────────────┐
│                  Flask + Uvicorn (ASGI)                 │
│            API Handlers • CSRF • Auth Sessions          │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│                   Agent Core (Python)                   │
│      Monologue Loop • History • Prompt Engineering      │
│           │              │              │               │
│     ┌─────▼─────┐  ┌────▼────┐  ┌──────▼──────┐       │
│     │  LiteLLM  │  │  FAISS  │  │   Tools     │       │
│     │  (100+    │  │ Vector  │  │ Terminal,   │       │
│     │ providers)│  │   DB    │  │ Browser,    │       │
│     └───────────┘  └─────────┘  │ Scheduler   │       │
│                                 └─────────────┘       │
└────────────────────────────────────────────────────────┘
```

### Ключевые слои

1. **Core (Python):**
   - `agent.py` — логика цикла размышлений агента (monologue loop)
   - `models.py` — мост между LangChain/LiteLLM и фреймворком
   - `initialize.py` — инициализация компонентов и миграции

2. **API & Transport:**
   - `run_ui.py` — точка входа в веб-интерфейс
   - `helpers/ui_server.py` — сервер Flask + Socket.IO для real-time взаимодействия
   - `helpers/api.py` — базовый класс API-хэндлеров

3. **Frontend (Alpine.js):**
   - Реактивный интерфейс с поддержкой модальных окон и уведомлений
   - Компонентная архитектура (`webui/components/`)
   - Store-based состояние (`webui/js/AlpineStore.js`)

---

## 🛠 Стек технологий

| Компонент | Технология | Версия |
|---|---|---|
| **Язык (бэкенд)** | Python | 3.12+ |
| **Web-фреймворк** | Flask (async) | 3.0.3 |
| **ASGI-сервер** | Uvicorn | ≥ 0.38.0 |
| **WebSocket** | python-socketio + wsproto | ≥ 5.14.2 |
| **LLM-интеграция** | LiteLLM | 1.79.3 |
| **LangChain** | langchain-core | 0.3.49 |
| **Векторная БД** | FAISS (faiss-cpu) | 1.11.0 |
| **Эмбеддинги** | sentence-transformers | 3.0.1 |
| **Фронтенд** | Alpine.js + ES Modules | — |
| **Стили** | Vanilla CSS | — |
| **Контейнеризация** | Docker, docker-compose | — |
| **Тестирование** | Pytest | — |

---

## 📋 Требования для запуска

### Минимальные
- **Python**: 3.12 или выше
- **pip**: актуальная версия
- **ОС**: Windows 10/11, Linux (Ubuntu 20.04+), macOS 12+
- **RAM**: минимум 4 ГБ (8 ГБ рекомендуется для локальных моделей)

### Для Docker-деплоя
- Docker Engine 24+ и Docker Compose v2

### Для локальных моделей (опционально)
- [Ollama](https://ollama.com/) или [LM Studio](https://lmstudio.ai/)

---

## ⚡ Установка и запуск

### Вариант 1: Локальный запуск (Windows)

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/your-username/synapse.git
cd synapse

# 2. Создайте виртуальное окружение
python -m venv .venv
#or
py -m venv .venv

# Активируйте виртуальное окружение:
# - Для CMD (командная строка):
.venv\Scripts\activate.bat
# - Для PowerShell (если заблокировано, сначала выполните: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass):
.venv\Scripts\Activate.ps1
# - Для Git Bash:
source .venv/Scripts/activate

# 3. Установите зависимости (обязательно отдельно!)
pip install -r requirements.txt
pip install -r requirements2.txt

# 4. Создайте файл настроек
copy .env.example usr\.env
# Откройте usr\.env и введите API-ключ нужного провайдера

# 5. Запустите сервер (Sandbox + Main)
Для безопасного выполнения кода агенту нужны два процесса. Выберите удобный способ:

**Способ А: Быстрый запуск (рекомендуется)**
```bash
.\start.bat
```
*(Скрипт сам откроет два черных окна: одно для песочницы, другое для основного сервера)*

**Способ Б: Ручной запуск (в двух терминалах)**
Откройте первый терминал (Sandbox):
```bash
py run_ui.py --port 55080 --dockerized true
```
Откройте второй терминал (Main) рядом:
```bash
py run_ui.py
```

### Вариант 2: Локальный запуск (Linux / macOS)

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/your-username/synapse.git
cd synapse

# 2. Создайте виртуальное окружение
python3 -m venv .venv
source .venv/bin/activate

# 3. Установите зависимости (обязательно отдельно!)
pip install -r requirements.txt
pip install -r requirements2.txt

# 4. Создайте файл настроек
cp .env.example usr/.env
# Отредактируйте usr/.env и введите API-ключ нужного провайдера

# 5. Запустите сервер (Sandbox + Main)
Для безопасного выполнения кода агенту нужны два процесса. Откройте два терминала:

Терминал 1 (Sandbox):
```bash
python run_ui.py --port 55080 --dockerized true
```

Терминал 2 (Main):
```bash
python run_ui.py
```

### Вариант 3: Docker

```bash
cd docker/run
docker-compose up --build
```

> После запуска интерфейс будет доступен по адресу: **http://localhost:5000**

---

## ⚙️ Переменные окружения (.env)

Файл `usr/.env` содержит все настройки проекта. Ниже описаны ключевые переменные:

### Сервер

| Переменная | Описание | По умолчанию |
|---|---|---|
| `WEB_UI_PORT` | Порт WebUI | `50001` |
| `WEB_UI_HOST` | Хост (`127.0.0.1` — только локально, `0.0.0.0` — все интерфейсы) | `127.0.0.1` |

### Безопасность

| Переменная | Описание | По умолчанию |
|---|---|---|
| `FLASK_SECRET_KEY` | Секретный ключ Flask для шифрования сессий. **Генерируется автоматически** при первом запуске, если не задан | Авто |
| `AUTH_LOGIN` | Логин для входа в WebUI | `admin` |
| `AUTH_PASSWORD` | Пароль для входа в WebUI. **Рекомендуется сменить!** | `admin` |
| `RFC_PASSWORD` | Пароль для Remote Function Call | `synapse_rfc_pwd` |
| `ROOT_PASSWORD` | Пароль root (только Docker) | — |

### Агент

| Переменная | Описание | По умолчанию |
|---|---|---|
| `A0_SET_AGENT_PROFILE` | Профиль агента | `synapse` |
| `A0_STARTUP_TIMEOUT_SECONDS` | Таймаут инициализации (сек.) | `300` |
| `A0_SET_DOCKERIZED` | Флаг Docker-окружения | `false` |

### Локализация

| Переменная | Описание | По умолчанию |
|---|---|---|
| `DEFAULT_USER_TIMEZONE` | Часовой пояс пользователя | `UTC` |
| `DEFAULT_USER_UTC_OFFSET_MINUTES` | Смещение UTC в минутах | `0` |

### API-ключи провайдеров ИИ

> **Важно:** Достаточно настроить ключ **одного** провайдера. Остальные можно оставить пустыми.

| Переменная | Провайдер | Где получить |
|---|---|---|
| `API_KEY_OPENROUTER` | OpenRouter (мультипровайдер) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `API_KEY_OPENAI` | OpenAI (GPT) | [platform.openai.com](https://platform.openai.com/api-keys) |
| `API_KEY_ANTHROPIC` | Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `API_KEY_GOOGLE` / `GOOGLE_API_KEY` | Google (Gemini) | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `API_KEY_DEEPSEEK` | DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| `API_KEY_GROQ` | Groq | [console.groq.com](https://console.groq.com/keys) |
| `API_KEY_OLLAMA` | Ollama (локальные модели) | Не требуется (локально) |
| `API_KEY_LM_STUDIO` | LM Studio (локальные модели) | Не требуется (локально) |
| `API_KEY_MISTRAL` | Mistral AI | [console.mistral.ai](https://console.mistral.ai/api-keys) |
| `API_KEY_XAI` | xAI (Grok) | [console.x.ai](https://console.x.ai) |
| `API_KEY_AZURE` | Azure OpenAI | Azure Portal |
| `API_KEY_MOCK` | Mock (тестирование без API) | `mock-key-for-demo` |

> **Совет:** Самый простой способ начать — [OpenRouter](https://openrouter.ai). Один ключ даёт доступ ко всем популярным моделям (GPT, Claude, Gemini, DeepSeek и др.).

---

## 🎮 Как пользоваться

### 1. Первый вход
- Откройте `http://localhost:5000` в браузере
- Войдите с логином `admin` / паролем `admin`
- **Рекомендуется** сменить пароль через **Settings → Security**

### 2. Настройка ИИ-модели
- Откройте **Settings** (⚙️ в боковой панели)
- В разделе **Model Configuration** выберите провайдера и модель
- Введите API-ключ в соответствующее поле

Synapse поддерживает три роли моделей:
| Роль | Описание | Рекомендация |
|---|---|---|
| **Chat Model** | Основная модель для диалога | Claude Sonnet 4, GPT-4o |
| **Utility Model** | Быстрая модель для парсинга и классификации | Gemini Flash, GPT-4o-mini |
| **Embedding Model** | Модель для работы с памятью | `sentence-transformers/all-MiniLM-L6-v2` (локальная, бесплатная) |

### 3. Работа с агентом
- Введите запрос в чат-бар внизу экрана
- Агент будет «думать» (monologue loop), вызывать инструменты и отвечать
+
### 4. Плагины
- Управление плагинами: **Settings → Plugins**
- Пользовательские плагины размещаются в `usr/plugins/`
- Каждый плагин содержит `plugin.yaml` с манифестом

---

## 📁 Структура проекта

```
synapse/
├── agent.py              # Ядро: логика агента и AgentContext
├── models.py             # LLM-интеграция через LiteLLM
├── initialize.py         # Инициализация компонентов
├── run_ui.py             # Точка входа WebUI
├── .env.example          # Шаблон переменных окружения
│
├── api/                  # HTTP и WebSocket хэндлеры
├── helpers/              # Утилиты (плагины, безопасность, файлы)
├── tools/                # Инструменты агента (Terminal, Browser, Search)
├── plugins/              # Системные плагины (20+)
├── prompts/              # Шаблоны промптов
├── knowledge/            # База знаний агента
│
├── webui/                # Фронтенд
│   ├── index.html        # Главная страница
│   ├── login.html        # Страница входа
│   ├── components/       # Alpine.js компоненты
│   ├── js/               # Логика фронтенда
│   └── css/              # Стили
│
├── usr/                  # Пользовательские данные
│   ├── .env              # Переменные окружения (не в Git!)
│   ├── plugins/          # Пользовательские плагины
│   ├── chats/            # Сохранённые чаты
│   └── workdir/          # Рабочая директория агента
│
├── docker/               # Docker-конфигурация
├── tests/                # Тесты (pytest)
├── conf/                 # Конфигурация провайдеров
│   └── model_providers.yaml
│
├── requirements.txt      # Основные зависимости
└── requirements2.txt     # Дополнительные зависимости (LiteLLM, OpenAI)
```

---

## 🧪 Тестирование

Для запуска тестов необходимо установить зависимости разработчика:

```bash
# Убедитесь, что виртуальное окружение активировано, затем установите зависимости:
pip install -r requirements.dev.txt

# Запуск всех тестов
pytest

# Запуск конкретного теста
pytest tests/test_http_auth_csrf.py

# С подробным выводом
pytest -v
```

---

## 🔒 Безопасность

- **Авторизация**: Логин/пароль через Flask sessions с SHA-512 хэшированием
- **CSRF-защита**: Все API-запросы проверяют CSRF-токен
- **Constant-time comparison**: Сравнение паролей через `hmac.compare_digest()` (защита от timing attacks)
- **Автогенерация ключей**: `FLASK_SECRET_KEY` генерируется автоматически при первом запуске
- **Маскировка**: API-ключи маскируются при отображении на фронтенде
- **Origin-проверка**: Защита от DNS rebinding через проверку Origin-заголовков

---

## 🤝 Контрибьютинг

Мы приветствуем вклад в развитие Synapse! Если вы нашли баг или у вас есть идея для новой функции, создайте Issue или Pull Request.