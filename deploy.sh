#!/bin/bash

# Логирование начала работы скрипта
echo "[$(date)] Running deploy script..." >> /var/log/deploy.log

# Переходим в каталог, где находится ваш репозиторий
cd /var/www/html || { echo "[$(date)] Failed to change directory to /var/www/html" >> /var/log/deploy.log; exit 1; }

# Сбрасываем изменения и подтягиваем новые
echo "[$(date)] Resetting and pulling from origin/main..." >> /var/log/deploy.log

# Сбрасываем изменения
git reset --hard origin/main >> /var/log/deploy.log 2>&1
if [ $? -ne 0 ]; then
    echo "[$(date)] git reset failed." >> /var/log/deploy.log
    exit 1
fi

# Подтягиваем новые изменения
git pull origin main >> /var/log/deploy.log 2>&1
if [ $? -ne 0 ]; then
    echo "[$(date)] git pull failed." >> /var/log/deploy.log
    exit 1
fi

# Логируем успешное завершение работы скрипта
echo "[$(date)] Deploy script finished successfully." >> /var/log/deploy.log
