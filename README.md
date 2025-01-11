ssh root@45.91.238.3
sGLTccA_Na#9zC

sudo nano /etc/nginx/sites-available/adminflow.ru
редактирование конфигурации
# Для nginx
sudo nginx -t
sudo systemctl restart nginx

СОЗДАТЬ ЧТО ТО В БАЗЕ ДАННЫХ
sudo -u postgres psql
-- Добавляем новое поле
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT '/uploads/default-avatar.png'; (Пример с аватарками)

-- Проверяем структуру таблицы
DESCRIBE users;

при добавлении новой локации заносить её в NGINX!!!


AIzaSyAlHAgAaw5FVkRKVhO_cDLB29a9Jk9uB_o
background: var(--surface-color);
