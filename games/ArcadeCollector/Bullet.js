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
    }

    update(dt, game) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt);

            // Проверяем столкновения с врагами
            for (let j = game.enemyManager.enemies.length - 1; j >= 0; j--) {
                const enemy = game.enemyManager.enemies[j];
                if (this.checkCollision(bullet, enemy)) {
                    // Удаляем пулю и врага
                    this.bullets.splice(i, 1);
                    game.enemyManager.enemies.splice(j, 1);
                    
                    // Добавляем очки
                    game.gameState.addScore(enemy.points, game);  // Передаем game в addScore
                    
                    // Создаем эффект взрыва
                    game.particleSystem.createExplosion(
                        enemy.x + enemy.width/2,
                        enemy.y + enemy.height/2
                    );
                    
                    break;
                }
            }

            // Удаляем пули, вышедшие за пределы экрана
            if (bullet.isOffScreen()) {
                this.bullets.splice(i, 1);
            }
        }
    }

    checkCollision(bullet, enemy) {
        return bullet.x < enemy.x + enemy.width &&
               bullet.x + bullet.width > enemy.x &&
               bullet.y < enemy.y + enemy.height &&
               bullet.y + bullet.height > enemy.y;
    }

    addBullet(bullet) {
        this.bullets.push(bullet);
    }

    reset() {
        this.bullets = [];
    }
} 