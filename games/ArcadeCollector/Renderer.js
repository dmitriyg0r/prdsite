export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    draw(game) {
        // Отрисовка игрока
        this.drawPlayer(game.player);
        
        // Отрисовка врагов
        this.drawEnemies(game.enemyManager.enemies);
        
        // Отрисовка пуль
        this.drawBullets(game.bulletManager.bullets);
        
        // Отрисовка частиц
        this.drawParticles(game.particleSystem.particles);
    }

    drawPlayer(player) {
        this.ctx.fillStyle = player.isInvulnerable ? 
            `rgba(0, 255, 0, ${Math.sin(Date.now() / 100)})` : 
            '#00FF00';
        
        this.ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    drawEnemies(enemies) {
        enemies.forEach(enemy => {
            switch(enemy.type) {
                case 'fast':
                    this.ctx.fillStyle = '#FF0000';
                    break;
                case 'tank':
                    this.ctx.fillStyle = '#800080';
                    break;
                default:
                    this.ctx.fillStyle = '#FF4500';
            }
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
    }

    drawBullets(bullets) {
        this.ctx.fillStyle = '#FFFF00';
        bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    drawParticles(particles) {
        particles.forEach(particle => {
            this.ctx.fillStyle = `rgba(${this.hexToRgb(particle.color)}, ${particle.opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawStartScreen(canvas) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press SPACE to Start', canvas.width/2, canvas.height/2);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '255, 255, 255';
    }
}