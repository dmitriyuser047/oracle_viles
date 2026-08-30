# Размещение Велеса на VPS

Инструкция рассчитана на Ubuntu/Debian VPS, Node.js, PM2 и Nginx.

## 1. Подготовить сервер

```bash
sudo apt update
sudo apt install -y git curl nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Забрать проект

```bash
cd /var/www
sudo git clone https://github.com/dmitriyuser047/oracle_viles.git
sudo chown -R $USER:$USER /var/www/oracle_viles
cd /var/www/oracle_viles
npm ci
```

## 3. Настроить переменные окружения

```bash
cp .env.example .env
nano .env
```

В `.env` нужно указать настоящий ключ:

```bash
GROQ_API_KEY=твой_ключ_groq
PORT=3000
```

Файл `.env` не должен попадать в git.

## 4. Запустить через PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Проверка:

```bash
curl http://127.0.0.1:3000/health
```

Ожидаемый ответ:

```json
{"ok":true,"service":"oracle-viles"}
```

## 5. Подключить домен через Nginx

Создай файл:

```bash
sudo nano /etc/nginx/sites-available/oracle_viles
```

Конфиг:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активировать:

```bash
sudo ln -s /etc/nginx/sites-available/oracle_viles /etc/nginx/sites-enabled/oracle_viles
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Обновление кода

```bash
cd /var/www/oracle_viles
bash scripts/update-vps.sh
```

Если проект лежит в другой папке или сервис PM2 назван иначе:

```bash
APP_DIR=/var/www/oracle_viles PM2_APP=oracle-viles BRANCH=main bash scripts/update-vps.sh
```

## Полезные команды

```bash
pm2 status
pm2 logs oracle-viles
pm2 restart oracle-viles
```
