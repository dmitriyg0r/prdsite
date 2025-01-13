# Подключение к серверу
## ssh
ssh root@45.91.238.3
## Пароль
sGLTccA_Na#9zC
# редактирование конфигурации
sudo nano /etc/nginx/sites-available/space-point.ru
# Для nginx
sudo nginx -t
sudo systemctl restart nginx

# Создать что то в базе данных
sudo -u postgres psql
-- Добавляем новое поле
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT '/uploads/default-avatar.png'; (Пример с аватарками)

-- Проверяем структуру таблицы
DESCRIBE users;

# При добавлении новой локации заносить её в NGINX!!!


AIzaSyAlHAgAaw5FVkRKVhO_cDLB29a9Jk9uB_o
