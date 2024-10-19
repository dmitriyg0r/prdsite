#!/bin/bash

# Переходим в директорию проекта
cd /var/www/html

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

# Удалить неотслеживаемые файлы
sudo -u www-data git clean -f >> $LOG_FILE 2>&1

# Выполнить git pull с автоматическим разрешением конфликтов
sudo -u www-data git pull origin main --no-edit >> $LOG_FILE 2>&1

# Проверка на конфликты слияния
if [ $? -ne 0 ]; then
    echo "$(date) - Merge conflicts detected. Attempting to resolve automatically." >> $LOG_FILE
    
    # Автоматическое разрешение конфликтов для текстовых файлов
    sudo -u www-data git diff --name-only --diff-filter=U | while read file; do
        if [[ "$file" == *.txt || "$file" == *.json || "$file" == *.md ]]; then
            echo "$(date) - Resolving conflict in $file" >> $LOG_FILE
            sudo -u www-data git checkout --ours "$file"
            sudo -u www-data git add "$file"
        fi
    done

    # Завершение слияния
    sudo -u www-data git commit -m "Merge branch 'main' of origin" >> $LOG_FILE 2>&1
fi

# Применить спрятанные изменения
sudo -u www-data git stash pop >> $LOG_FILE 2>&1

# Проверка на конфликты после применения stash
if [ $? -ne 0 ]; then
    echo "$(date) - Stash conflicts detected. Please resolve them manually." >> $LOG_FILE
    exit 1
fi

# Если все в порядке, продолжаем выполнение скрипта
echo "$(date) - Deployment successful" >> $LOG_FILE