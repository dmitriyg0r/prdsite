export class Bullet {
    constructor(x, y, speed = 400) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 10;
        this.speed = speed;
    }

    update(dt) {
        this.y -= this.speed * (dt / 1000);
    }

    isOffScreen() {
        return this.y < -this.height;
    }
}

export class BulletManager {
    constructor() {
        this.bullets = [];
        this.shootTimer = 0;
        this.shootInterval = 250; // 0.25 секунды между выстрелами
    }

    update(dt, game) {
        this.shootTimer += dt;

        // Стрельба
        if (game.player.keys['Space'] && this.shootTimer >= this.shootInterval) {
            this.shoot(game.player);
            this.shootTimer = 0;
        }

        // Обновление пуль
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt);

            // Проверка столкновений с врагами
            for (let j = game.enemyManager.enemies.length - 1; j >= 0; j--) {
                const enemy = game.enemyManager.enemies[j];
                if (this.checkCollision(bullet, enemy)) {
                    // Создание эффекта взрыва
                    game.particleSystem.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    
                    // Удаление пули и врага
                    this.bullets.splice(i, 1);
                    game.enemyManager.enemies.splice(j, 1);
                    
                    // Начисление очков
                    game.gameState.addScore(enemy.points);
                    break;
                }
            }

            // Удаление пуль за пределами экрана
            if (bullet.isOffScreen()) {
                this.bullets.splice(i, 1);
            }
        }
    }

    shoot(player) {
        const bullet = new Bullet(
            player.x + player.width/2 - 2.5,
            player.y
        );
        this.bullets.push(bullet);
    }

    checkCollision(bullet, enemy) {
        return bullet.x < enemy.x + enemy.width &&
               bullet.x + bullet.width > enemy.x &&
               bullet.y < enemy.y + enemy.height &&
               bullet.y + bullet.height > enemy.y;
    }

    reset() {
        this.bullets = [];
        this.shootTimer = 0;
    }
} 