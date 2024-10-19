#!/bin/bash
cd /var/www/html
sudo chown -R www-data:www-data /var/www/html
# Проверка, что это Git-репозиторий
if [ ! -d ".git" ]; then
    echo "Error: Not a git repository"
    exit 1
fi

# Спрятать локальные изменения
sudo -u www-data git stash

# Удалить неотслеживаемые файлы
sudo -u www-data git clean -f

# Выполнить git pull
sudo -u www-data git pull origin main

# Проверка на конфликты слияния
if [ $? -ne 0 ]; then
    echo "Merge conflicts detected. Please resolve them manually."
    exit 1
fi

# Применить спрятанные изменения
sudo -u www-data git stash pop

# Проверка на конфликты после применения stash
if [ $? -ne 0 ]; then
    echo "Stash conflicts detected. Please resolve them manually."
    exit 1
fi
