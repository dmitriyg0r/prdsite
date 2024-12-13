import { Bullet } from './Bullet.js';

export class Enemy {
    constructor(canvas, x, y, type = 'basic') {
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Базовые параметры противника
        this.width = 30;
        this.height = 30;
        this.speed = 150;
        this.points = 100;
        this.movePattern = 'straight';
        this.amplitude = 100; // для волнового движения
        this.frequency = 0.02; // для волнового движения
        this.startX = x; // для волнового движения
        
        // Настройка параметров в зависимости от типа
        this.setupType();
    }

    setupType() {
        switch(this.type) {
            case 'fast':
                this.speed = 250;
                this.points = 150;
                this.width = 25;
                this.height = 25;
                this.movePattern = 'zigzag';
                break;
            case 'tank':
                this.speed = 100;
                this.points = 200;
                this.width = 40;
                this.height = 40;
                this.movePattern = 'straight';
                break;
            case 'wave':
                this.speed = 150;
                this.points = 175;
                this.width = 30;
                this.height = 30;
                this.movePattern = 'wave';
                break;
            default: // basic
                this.movePattern = 'straight';
                break;
        }
    }

    update(dt) {
        // Базовое движение вниз
        this.y += this.speed * (dt / 1000);

        // Дополнительные паттерны движения
        switch(this.movePattern) {
            case 'zigzag':
                // Зигзагообразное движение
                this.x += Math.sin(this.y * 0.05) * 5;
                break;
            case 'wave':
                // Волновое движение
                this.x = this.startX + Math.sin(this.y * this.frequency) * this.amplitude;
                break;
            case 'straight':
            default:
                // Прямое движение вниз
                break;
        }

        // Ограничение движения по X в пределах canvas
        this.x = Math.max(0, Math.min(this.x, this.canvas.width - this.width));
    }

    isOffScreen() {
        return this.y > this.canvas.height;
    }
}

export class EnemyManager {
    constructor() {
        this.enemies = [];
        this.enemyBullets = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1000;
        this.enemyTypes = ['basic', 'fast', 'tank', 'wave'];
        this.shootTimer = 0;
        this.shootInterval = 2000;
    }

    update(dt, game) {
        const multipliers = game.gameState.difficultyMultipliers;
        
        // Обновление таймера спавна с учетом множителя скорости спавна
        this.spawnTimer += dt * multipliers.enemySpawnRate;
        this.shootTimer += dt;

        // Спавн врагов
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnEnemy(game.canvas, game.gameState.difficulty);
            this.spawnTimer = 0;
            // Уменьшаем интервал спавна с ростом сложности
            this.spawnInterval = Math.max(300, 1000 - (game.gameState.difficulty * 50));
        }

        // Стрельба врагов
        if (this.shootTimer >= this.shootInterval) {
            this.enemyShoot(game.gameState.difficultyMultipliers.enemyBulletSpeed);
            this.shootTimer = 0;
            // Уменьшаем интервал стрельбы с ростом сложности
            this.shootInterval = Math.max(1000, 2000 - (game.gameState.difficulty * 100));
        }

        // Обновление врагов с учетом множителя скорости
        this.enemies.forEach(enemy => {
            enemy.speed = enemy.baseSpeed * multipliers.enemySpeed;
        });

        // Обновление пуль врагов
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.update(dt);

            // Проверка столкновения с игроком
            if (!game.player.isInvulnerable && this.checkBulletCollision(bullet, game.player)) {
                this.enemyBullets.splice(i, 1);
                game.player.hit();
                game.gameState.updateUI(game);
                
                if (game.player.lives <= 0) {
                    game.gameState.gameOver(game);
                }
                continue;
            }

            // Удаление пуль за пределами экрана
            if (bullet.y > game.canvas.height) {
                this.enemyBullets.splice(i, 1);
            }
        }

        // Обновление врагов
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt);

            // Проверка столкновения с игроком
            if (!game.player.isInvulnerable && this.checkCollision(enemy, game.player)) {
                game.player.hit();
                game.gameState.updateUI(game);
                
                if (game.player.lives <= 0) {
                    game.gameState.gameOver(game);
                }
            }

            if (enemy.isOffScreen()) {
                this.enemies.splice(i, 1);
            }
        }
    }

    enemyShoot() {
        // Выбираем случайного врага для стрельбы
        if (this.enemies.length > 0) {
            const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            const bullet = new Bullet(
                shooter.x + shooter.width/2,
                shooter.y + shooter.height,
                -400
            );
            bullet.speedY = Math.abs(bullet.speed);
            this.enemyBullets.push(bullet);
        }
    }

    checkCollision(enemy, player) {
        const padding = 5;
        return (enemy.x + padding) < (player.x + player.width - padding) &&
               (enemy.x + enemy.width - padding) > (player.x + padding) &&
               (enemy.y + padding) < (player.y + player.height - padding) &&
               (enemy.y + enemy.height - padding) > (player.y + padding);
    }

    checkBulletCollision(bullet, player) {
        const padding = 3;
        return (bullet.x + padding) < (player.x + player.width - padding) &&
               (bullet.x + bullet.width - padding) > (player.x + padding) &&
               (bullet.y + padding) < (player.y + player.height - padding) &&
               (bullet.y + bullet.height - padding) > (player.y + padding);
    }

    spawnEnemy(canvas, difficulty) {
        const x = Math.random() * (canvas.width - 30);
        
        // Выбор типа врага в зависимости от сложности
        let type = 'basic';
        const rand = Math.random();
        
        if (difficulty >= 3) {
            if (rand < 0.3) type = 'wave';
            else if (rand < 0.6) type = 'tank';
            else if (rand < 0.8) type = 'fast';
        } else if (difficulty >= 2) {
            if (rand < 0.2) type = 'wave';
            else if (rand < 0.4) type = 'tank';
            else if (rand < 0.7) type = 'fast';
        } else if (difficulty >= 1) {
            if (rand < 0.3) type = 'fast';
            else if (rand < 0.4) type = 'tank';
        }

        const enemy = new Enemy(canvas, x, -30, type);
        enemy.baseSpeed = enemy.speed; // Сохраняем базовую скорость
        this.enemies.push(enemy);
    }

    reset() {
        this.enemies = [];
        this.enemyBullets = [];
        this.spawnTimer = 0;
        this.shootTimer = 0;
        this.spawnInterval = 1000;
        this.shootInterval = 2000;
    }
} 