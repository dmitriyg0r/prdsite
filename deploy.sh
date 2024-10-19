#!/bin/bash

# Переходим в директорию проекта
cd /var/www/html || { echo "$(date) - Error: Directory /var/www/html does not exist" >> /var/log/deploy.log; exit 1; }

# Логирование
LOG_FILE="/var/log/deploy.log"
echo "$(date) - Starting deployment" >> $LOG_FILE

# Проверка, что это Git-репозиторий
if [ ! -d ".git" ]; then
    echo "$(date) - Error: Not a git repository" >> $LOG_FILE
    exit 1
fi

# Спрятать локальные изменения
sudo -u www-data git stash >> $LOG_FILE 2>&1
if [ $? -ne 0 ]; then
    echo "$(date) - Error: Failed to stash local changes" >> $LOG_FILE
    exit 1
fi

# Удалить неотслеживаемые файлы
sudo -u www-data git clean -f >> $LOG_FILE 2>&1
if [ $? -ne 0 ]; then
    echo "$(date) - Error: Failed to clean untracked files" >> $LOG_FILE
    exit 1
fi

# Выполнить git pull
sudo -u www-data git pull origin main >> $LOG_FILE 2>&1

# Проверка на конфликты слияния
if [ $? -ne 0 ]; then
    echo "$(date) - Merge conflicts detected. Attempting to resolve automatically." >> $LOG_FILE
    
    # Автоматическое разрешение конфликтов для всех файлов
    sudo -u www-data git diff --name-only --diff-filter=U | while read file; do
        echo "$(date) - Resolving conflict in $file" >> $LOG_FILE
        sudo -u www-data git checkout --theirs "$file"
        sudo -u www-data git add "$file"
    done

    # Завершение слияния
    sudo -u www-data git commit -m "Merge branch 'main' of origin" >> $LOG_FILE 2>&1
    if [ $? -ne 0 ]; then
        echo "$(date) - Error: Failed to commit merge resolution" >> $LOG_FILE
        exit 1
    fi

    # Повторно пытаемся выполнить git pull
    sudo -u www-data git pull origin main >> $LOG_FILE 2>&1
    if [ $? -ne 0 ]; then
        echo "$(date) - Error: Failed to pull after resolving conflicts" >> $LOG_FILE
        exit 1
    fi
fi

# Применить спрятанные изменения
sudo -u www-data git stash pop >> $LOG_FILE 2>&1
if [ $? -ne 0 ]; then
    echo "$(date) - Stash conflicts detected. Please resolve them manually." >> $LOG_FILE
    exit 1
fi

# Если все в порядке, продолжаем выполнение скрипта
echo "$(date) - Deployment successful" >> $LOG_FILE