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
        this.shootTimer = 0;
        this.shootInterval = 2000;
    }

    update(dt, game) {
        if (!game) return;

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

            // Проверка столкн��вения с игроком
            if (!game.player.isInvulnerable && this.checkBulletCollision(bullet, game.player)) {
                this.enemyBullets.splice(i, 1);
                const wasHit = game.player.hit();
                if (wasHit) {
                    game.gameState.updateUI(game);
                    
                    if (game.player.lives <= 0) {
                        game.gameState.gameOver(game);
                    }
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
                const wasHit = game.player.hit();
                if (wasHit) {
                    game.gameState.updateUI(game);
                    
                    if (game.player.lives <= 0) {
                        game.gameState.gameOver(game);
                    }
                }
            }

            if (enemy.isOffScreen()) {
                this.enemies.splice(i, 1);
            }
        }
    }

    enemyShoot() {
        this.enemies.forEach(enemy => {
            if (Math.random() < 0.3) { // 30% шанс выстрела для каждого врага
                const bullet = {
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height,
                    width: 5,
                    height: 10,
                    speed: 300,
                    update(dt) {
                        this.y += this.speed * (dt / 1000);
                    }
                };
                this.enemyBullets.push(bullet);
            }
        });
    }

    spawnEnemy(canvas, difficulty) {
        const x = Math.random() * (canvas.width - 30);
        const type = this.getRandomEnemyType(difficulty);
        const enemy = {
            x: x,
            y: -30,
            width: 30,
            height: 30,
            speed: this.getEnemySpeed(type),
            type: type,
            points: this.getEnemyPoints(type),
            update(dt) {
                this.y += this.speed * (dt / 1000);
            },
            isOffScreen() {
                return this.y > canvas.height;
            }
        };
        this.enemies.push(enemy);
    }

    getRandomEnemyType(difficulty) {
        const rand = Math.random();
        if (difficulty >= 3) {
            if (rand < 0.3) return 'wave';
            if (rand < 0.6) return 'tank';
            if (rand < 0.8) return 'fast';
        } else if (difficulty >= 2) {
            if (rand < 0.2) return 'wave';
            if (rand < 0.4) return 'tank';
            if (rand < 0.7) return 'fast';
        } else if (difficulty >= 1) {
            if (rand < 0.3) return 'fast';
            if (rand < 0.4) return 'tank';
        }
        return 'basic';
    }

    getEnemySpeed(type) {
        switch(type) {
            case 'fast': return 200;
            case 'tank': return 50;
            case 'wave': return 150;
            default: return 100;
        }
    }

    getEnemyPoints(type) {
        switch(type) {
            case 'fast': return 150;
            case 'tank': return 200;
            case 'wave': return 300;
            default: return 100;
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

    reset() {
        this.enemies = [];
        this.enemyBullets = [];
        this.spawnTimer = 0;
        this.shootTimer = 0;
    }
} 