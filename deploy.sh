#!/bin/bash
cd /var/www/html
sudo git pull origin main
sudo chown -R www-data:www-data /var/www/html
