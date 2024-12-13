export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.debugMode = false;
        this.colors = {
            player: '#00FF00',
            playerInvulnerable: 'rgba(0, 255, 0, 0.5)',
            enemyBasic: '#FF4500',
            enemyFast: '#FF0000',
            enemyTank: '#800080',
            enemyWave: '#00FFFF',
            bullet: '#FFFF00',
            enemyBullet: '#FF0000',
            particleDefault: '#FFA500'
        };
    }

    draw(game) {
        // Очистка canvas
        this.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
        
        // Включаем сглаживание
        this.ctx.imageSmoothingEnabled = true;
        
        // Отрисовка игрока
        this.drawPlayer(game.player);
        
        // Отрисовка врагов
        this.drawEnemies(game.enemyManager.enemies);
        
        // Отрисовка пуль
        this.drawBullets(game.bulletManager.bullets, this.colors.bullet);
        if (game.enemyManager.enemyBullets) {
            this.drawBullets(game.enemyManager.enemyBullets, this.colors.enemyBullet);
        }
        
        // Отрисовка частиц
        this.drawParticles(game.particleSystem.particles);

        // Отрисовка хитбоксов в режиме отладки
        if (this.debugMode) {
            this.drawHitboxes(game);
        }
    }

    drawPlayer(player) {
        this.ctx.save();
        this.ctx.fillStyle = player.isInvulnerable ? this.colors.playerInvulnerable : this.colors.player;
        this.ctx.fillRect(
            Math.round(player.x),
            Math.round(player.y),
            player.width,
            player.height
        );
        this.ctx.restore();
    }

    drawEnemies(enemies) {
        enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.fillStyle = this.getEnemyColor(enemy.type);
            this.ctx.fillRect(
                Math.round(enemy.x),
                Math.round(enemy.y),
                enemy.width,
                enemy.height
            );
            this.ctx.restore();
        });
    }

    drawBullets(bullets, color) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        bullets.forEach(bullet => {
            this.ctx.fillRect(
                Math.round(bullet.x),
                Math.round(bullet.y),
                bullet.width,
                bullet.height
            );
        });
        this.ctx.restore();
    }

    getEnemyColor(type) {
        switch(type) {
            case 'fast': return this.colors.enemyFast;
            case 'tank': return this.colors.enemyTank;
            case 'wave': return this.colors.enemyWave;
            default: return this.colors.enemyBasic;
        }
    }

    drawStartScreen(canvas) {
        this.ctx.save();
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Arcade Collector', canvas.width/2, canvas.height/2 - 50);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press SPACE to start', canvas.width/2, canvas.height/2 + 50);
        this.ctx.restore();
    }

    drawParticles(particles) {
        this.ctx.save();
        particles.forEach(particle => {
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    drawHitboxes(game) {
        this.ctx.save();
        
        // Хитбокс игрока
        const padding = 5;
        
        // Рисуем внешнюю границу игрока
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            game.player.x,
            game.player.y,
            game.player.width,
            game.player.height
        );
        
        // Рисуем хитбокс игрока
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            game.player.x + padding,
            game.player.y + padding,
            game.player.width - padding * 2,
            game.player.height - padding * 2
        );
        
        // Хитбоксы врагов
        game.enemyManager.enemies.forEach(enemy => {
            // Внешняя граница
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(
                enemy.x,
                enemy.y,
                enemy.width,
                enemy.height
            );
            
            // Хитбокс
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                enemy.x + padding,
                enemy.y + padding,
                enemy.width - padding * 2,
                enemy.height - padding * 2
            );
        });
        
        // Хитбоксы пуль
        const bulletPadding = 3;
        if (game.enemyManager.enemyBullets) {
            game.enemyManager.enemyBullets.forEach(bullet => {
                // Внешняя граница
                this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    bullet.x,
                    bullet.y,
                    bullet.width,
                    bullet.height
                );
                
                // Хитбокс
                this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    bullet.x + bulletPadding,
                    bullet.y + bulletPadding,
                    bullet.width - bulletPadding * 2,
                    bullet.height - bulletPadding * 2
                );
            });
        }
        
        this.ctx.restore();
    }

    // ... остальные методы остаются без изменений
}