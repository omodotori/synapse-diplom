# Архитектура серверной инфраструктуры

Ниже представлена диаграмма архитектуры сервера, демонстрирующая изоляцию сред, управление зависимостями и конфигурацией. Вы можете использовать её для рендера (например, через плагин Markdown Preview или на сайте mermaid.live) и вставить скриншот в диплом.

```mermaid
flowchart LR
    subgraph Server ["💻 Linux-сервер (Ubuntu 20.04+)"]
        direction LR
        
        subgraph BaseSoftware ["⚙️ Базовое ПО хоста"]
            Docker["🐳 Docker Engine 24+"]
            NodeHost["🟢 Node.js 18+"]
        end

        subgraph FileSystem ["📁 Файловая система хоста"]
            ENV_FILE["📄 usr/.env\n(Изоляция конфигурации:\nключи, порты)"]
            REQ_FILES["📄 requirements.txt / requirements2.txt\n(Управление зависимостями)"]
        end

        subgraph DockerContainer ["📦 Docker-контейнер Synapse"]
            direction LR
            Supervisord["🛠️ supervisord\n(Менеджер процессов)"]
            
            subgraph FrameworkRuntime ["🧠 Framework Runtime (/opt/venv-a0)"]
                Core["Ядро Synapse"]
                WebUI["WebUI (Flask/Uvicorn)"]
                CoreDeps["Зависимости ядра\n(устанавливаются из requirements.txt)"]
                Core --- CoreDeps
                WebUI --- CoreDeps
            end
            
            subgraph SandboxRuntime ["🛡️ Execution Runtime (/opt/venv)"]
                AgentExecution["Песочница агента\n(выполнение кода)"]
                SandboxDeps["Пользовательские пакеты\n(устанавливаются через pip агентом)"]
                AgentExecution --- SandboxDeps
            end
            
            Supervisord --> Core
            Supervisord --> WebUI
            Supervisord --> AgentExecution
        end
        
        %% Связи
        Docker -. "Запускает" .-> DockerContainer
        ENV_FILE == "Пробрасывается как volume\n(Секреты скрыты от git)" ===> DockerContainer
        REQ_FILES -. "Используются при сборке" .-> CoreDeps
        NodeHost -. "Используется для мостов (WhatsApp)" .-> DockerContainer
    end

    %% Стилизация
    classDef server fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000;
    classDef container fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000;
    classDef runtime fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000;
    classDef files fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000;
    
    class Server server;
    class DockerContainer container;
    class FrameworkRuntime,SandboxRuntime runtime;
    class FileSystem,ENV_FILE,REQ_FILES files;
```

---

# Структура Docker-контейнера

Эта диаграмма детально показывает внутреннее устройство контейнера: как супервизор управляет процессами и как именно достигается изоляция ИИ-агента (Execution Runtime) от ядра (Framework Runtime).

```mermaid
flowchart LR
    subgraph Docker ["🐳 Docker Container (synapse)"]
        direction LR
        
        Init["bash /exe/initialize.sh\n(Entrypoint)"]
        
        Supervisord["⚙️ supervisord (PID 1)\nГлавный менеджер процессов"]
        Init --> Supervisord

        subgraph FrameworkEnv ["🧠 Framework Runtime\n(/opt/venv-a0 | Python 3.12+)"]
            direction LR
            Flask["WebUI Server (Flask/Uvicorn)\nПорт: 80 -> WEB_UI_PORT"]
            AgentCore["Ядро логики Агента\n(Управление памятью, LLM)"]
            SearXNG["SearXNG\n(Внутренний поисковик)"]
            
            Flask <--> AgentCore
        end

        subgraph ExecutionEnv ["🛡️ Execution Runtime (Песочница)\n(/opt/venv | Python 3.13)"]
            direction LR
            Sandbox["Терминал и выполнение кода\n(Агент имеет доступ только сюда)"]
            Pip["Менеджер пакетов pip\n(Изолированная установка)"]
            
            Sandbox -. "Устанавливает пакеты" .-> Pip
        end

        %% Связи процессов
        Supervisord ==>|Запускает и мониторит| Flask
        Supervisord ==>|Запускает и мониторит| AgentCore
        Supervisord ==>|Запускает| SearXNG
        Supervisord ==>|Контролирует| Sandbox
        
        %% Взаимодействие
        AgentCore -- "Передает код\nчерез subprocess" --> Sandbox
        Sandbox -- "Возвращает stdout/stderr" --> AgentCore
        
        %% Предупреждение
        note["⚠️ Агент не может изменить\nFramework Runtime,\nчто защищает ядро от поломок"] -.-> ExecutionEnv
    end

    %% Стилизация
    classDef main fill:#f5f5f5,stroke:#333,stroke-width:2px,color:#000;
    classDef framework fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000;
    classDef execution fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000;
    classDef manager fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000;
    classDef note fill:#fff9c4,stroke:#fbc02d,stroke-width:1px,stroke-dasharray: 5 5,color:#000;
    
    class Docker main;
    class FrameworkEnv framework;
    class ExecutionEnv execution;
    class Supervisord,Init manager;
    class note note;
```

---

# Схема конвейера CI/CD

Эта диаграмма описывает процесс непрерывной интеграции и доставки (CI/CD) на базе GitHub Actions, включая кроссплатформенную сборку Docker-образов и ИИ-генерацию релизов.

```mermaid
flowchart LR
    subgraph CI ["🔍 Этап 1: Интеграция (CI)"]
        direction TB
        Trigger["⚡ Триггеры\n(Push, Tag, Manual)"] --> Test["✅ Тесты\n(pytest)"]
        Test --> Plan["⚙️ Планирование\n(Матрица архитектур)"]
    end

    subgraph CD ["📦 Этап 2: Сборка и Релиз (CD)"]
        direction TB
        Build["🔨 Кросс-сборка\n(QEMU: amd64 / arm64)"] --> Hub[("🚀 Docker Hub\n(Публикация)")]
        Hub --> Release["🤖 GitHub Release\n(OpenRouter AI Notes)"]
    end

    %% Связь между этапами
    Plan --> Build

    %% Стилизация
    classDef ci fill:#bbdefb,stroke:#1976d2,stroke-width:2px,color:#000;
    classDef cd fill:#ffe0b2,stroke:#f57c00,stroke-width:2px,color:#000;
    
    class CI,Trigger,Test,Plan ci;
    class CD,Build,Hub,Release cd;
```
