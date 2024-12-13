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
        // Обновление таймера спавна
        this.spawnTimer += dt;
        this.shootTimer += dt;

        // Спавн врагов
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnEnemy(game.canvas, game.gameState.difficulty);
            this.spawnTimer = 0;
            this.spawnInterval = Math.max(300, 1000 - (game.gameState.difficulty * 50));
        }

        // Стрельба врагов
        if (this.shootTimer >= this.shootInterval) {
            this.enemyShoot();
            this.shootTimer = 0;
            this.shootInterval = Math.max(1000, 2000 - (game.gameState.difficulty * 100));
        }

        // Обновление пуль врагов
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.update(dt);

            // Проверка столкновения с игроком
            if (!game.player.isInvulnerable) {
                const collision = this.checkBulletCollision(bullet, game.player);
                if (collision) {
                    console.log('Bullet collision detected:', {
                        bulletPos: { x: bullet.x, y: bullet.y },
                        playerPos: { x: game.player.x, y: game.player.y }
                    });
                    this.enemyBullets.splice(i, 1);
                    if (game.player.hit()) {
                        game.particleSystem.createExplosion(
                            game.player.x + game.player.width/2,
                            game.player.y + game.player.height/2
                        );
                        game.gameState.updateUI(game);
                    }
                    continue;
                }
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
            if (!game.player.isInvulnerable) {
                const collision = this.checkCollision(enemy, game.player);
                if (collision) {
                    console.log('Enemy collision detected:', {
                        enemyPos: { x: enemy.x, y: enemy.y },
                        playerPos: { x: game.player.x, y: game.player.y }
                    });
                    if (game.player.hit()) {
                        game.particleSystem.createExplosion(
                            game.player.x + game.player.width/2,
                            game.player.y + game.player.height/2
                        );
                        game.gameState.updateUI(game);
                    }
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
        // Увеличиваем отступ для более точной коллизии
        const padding = 8;
        const hitbox = {
            enemy: {
                x: enemy.x + padding,
                y: enemy.y + padding,
                width: enemy.width - padding * 2,
                height: enemy.height - padding * 2
            },
            player: {
                x: player.x + padding,
                y: player.y + padding,
                width: player.width - padding * 2,
                height: player.height - padding * 2
            }
        };

        return hitbox.enemy.x < hitbox.player.x + hitbox.player.width &&
               hitbox.enemy.x + hitbox.enemy.width > hitbox.player.x &&
               hitbox.enemy.y < hitbox.player.y + hitbox.player.height &&
               hitbox.enemy.y + hitbox.enemy.height > hitbox.player.y;
    }

    checkBulletCollision(bullet, player) {
        // Увеличиваем отступ для более точной коллизии пуль
        const padding = 4;
        const hitbox = {
            bullet: {
                x: bullet.x + padding,
                y: bullet.y + padding,
                width: bullet.width - padding * 2,
                height: bullet.height - padding * 2
            },
            player: {
                x: player.x + padding,
                y: player.y + padding,
                width: player.width - padding * 2,
                height: player.height - padding * 2
            }
        };

        return hitbox.bullet.x < hitbox.player.x + hitbox.player.width &&
               hitbox.bullet.x + hitbox.bullet.width > hitbox.player.x &&
               hitbox.bullet.y < hitbox.player.y + hitbox.player.height &&
               hitbox.bullet.y + hitbox.bullet.height > hitbox.player.y;
    }

    spawnEnemy(canvas, difficulty) {
        // Выбор типа противника с учетом сложности
        let type = 'basic';
        const rand = Math.random();
        
        if (difficulty >= 2) {
            if (rand < 0.3) type = 'fast';
            else if (rand < 0.5) type = 'tank';
            else if (rand < 0.7) type = 'wave';
        } else if (difficulty >= 1) {
            if (rand < 0.2) type = 'fast';
            else if (rand < 0.3) type = 'tank';
        }

        // Случайная позиция по X
        const x = Math.random() * (canvas.width - 30);
        const enemy = new Enemy(canvas, x, -30, type);
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