# Использование предварительно собранного базового образа Synapse
FROM synapse-base:latest

# Добавляем информацию об авторе
LABEL author="Твоё Имя"
LABEL maintainer="Твоё Имя"

# Проверка наличия аргумента ветки, иначе - вывод ошибки
ARG SYNAPSE_BRANCH
RUN if [ -z "$SYNAPSE_BRANCH" ]; then echo "ОШИБКА: Переменная SYNAPSE_BRANCH не установлена!" >&2; exit 1; fi
ENV SYNAPSE_BRANCH=$SYNAPSE_BRANCH

# Копирование содержимого файловой системы в корень
COPY ./fs/ /

# Этап 1: Предварительная подготовка и настройка окружения
RUN bash /ins/pre_install.sh $SYNAPSE_BRANCH

# Этап 2: Установка ядра приложения Synapse
RUN bash /ins/install_synapse.sh $SYNAPSE_BRANCH

# Этап 3: Установка дополнительных компонентов
RUN bash /ins/install_additional.sh $SYNAPSE_BRANCH

# Этап 4: Инвалидация кэша сборки и повторная компиляция ядра Synapse
ARG SYNAPSE_CACHE_DATE=none
RUN echo "Очистка кэша: $SYNAPSE_CACHE_DATE" && bash /ins/install_synapse2.sh $SYNAPSE_BRANCH

# Этап 5: Пост-установочные скрипты и очистка временных файлов
RUN bash /ins/post_install.sh $SYNAPSE_BRANCH

# Проброс необходимых портов
EXPOSE 22 80 9000-9009

# Выдача прав на выполнение скриптам запуска платформы
RUN chmod +x /exe/initialize.sh /exe/run_synapse.sh /exe/run_searxng.sh /exe/run_tunnel_api.sh /exe/trigger_self_update.sh

# Инициализация среды и передача управления менеджеру процессов
CMD ["/exe/initialize.sh", "$SYNAPSE_BRANCH"]
