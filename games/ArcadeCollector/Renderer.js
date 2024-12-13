export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
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
        this.debugMode = false;
    }

    draw(game) {
        // Очистка canvas
        this.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
        
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
        
        // Отрисовка игрока
        this.ctx.fillStyle = player.isInvulnerable ? 
            this.colors.playerInvulnerable : 
            this.colors.player;
            
        this.ctx.fillRect(player.x, player.y, player.width, player.height);
        
        this.ctx.restore();
    }

    drawEnemies(enemies) {
        enemies.forEach(enemy => {
            this.ctx.save();
            
            // Базовые настройки для всех врагов
            this.ctx.shadowBlur = 0;
            this.ctx.lineWidth = 2;
            
            switch(enemy.type) {
                case 'fast':
                    // Быстрый враг с эффектом размытия и следом
                    this.ctx.fillStyle = this.colors.enemyFast;
                    this.ctx.shadowColor = this.colors.enemyFast;
                    this.ctx.shadowBlur = 10;
                    
                    // Эффект пульсации
                    const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                    this.ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    this.ctx.scale(scale, scale);
                    this.ctx.fillRect(-enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
                    
                    // След
                    const fastGradient = this.ctx.createLinearGradient(0, -enemy.height, 0, 0);
                    fastGradient.addColorStop(0, 'transparent');
                    fastGradient.addColorStop(1, this.colors.enemyFast);
                    this.ctx.fillStyle = fastGradient;
                    this.ctx.fillRect(-enemy.width/2, -enemy.height, enemy.width, enemy.height/2);
                    break;
                    
                case 'tank':
                    // Танк с броней и укреплениями
                    this.ctx.fillStyle = this.colors.enemyTank;
                    this.ctx.strokeStyle = '#A020F0';
                    
                    // Основное тело
                    this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                    this.ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
                    
                    // Броня (полосы)
                    this.ctx.beginPath();
                    this.ctx.moveTo(enemy.x, enemy.y + enemy.height/3);
                    this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height/3);
                    this.ctx.moveTo(enemy.x, enemy.y + 2*enemy.height/3);
                    this.ctx.lineTo(enemy.x + enemy.width, enemy.y + 2*enemy.height/3);
                    this.ctx.stroke();
                    
                    // Дополнительное укрепление углов
                    this.ctx.strokeRect(enemy.x - 2, enemy.y - 2, enemy.width + 4, enemy.height + 4);
                    break;
                    
                case 'wave':
                    // Волновой враг с эффектом свечения
                    this.ctx.fillStyle = this.colors.enemyWave;
                    this.ctx.shadowColor = this.colors.enemyWave;
                    this.ctx.shadowBlur = 15;
                    
                    // Волновое смещение
                    const waveOffset = Math.sin(Date.now() / 300) * 5;
                    this.ctx.translate(enemy.x + waveOffset, enemy.y);
                    
                    // Основная форма
                    this.ctx.beginPath();
                    this.ctx.moveTo(enemy.width/2, 0);
                    this.ctx.lineTo(enemy.width, enemy.height/2);
                    this.ctx.lineTo(enemy.width/2, enemy.height);
                    this.ctx.lineTo(0, enemy.height/2);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Внутреннее свечение
                    const waveGradient = this.ctx.createRadialGradient(
                        enemy.width/2, enemy.height/2, 0,
                        enemy.width/2, enemy.height/2, enemy.width/2
                    );
                    waveGradient.addColorStop(0, this.colors.enemyWave);
                    waveGradient.addColorStop(1, 'transparent');
                    this.ctx.fillStyle = waveGradient;
                    this.ctx.fill();
                    break;
                    
                default: // basic
                    // Базовый враг с простым эффектом свечения
                    this.ctx.fillStyle = this.colors.enemyBasic;
                    this.ctx.shadowColor = this.colors.enemyBasic;
                    this.ctx.shadowBlur = 5;
                    this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                    
                    // Обводка
                    this.ctx.strokeStyle = '#FF6347';
                    this.ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
                    break;
            }
            
            this.ctx.restore();
        });
    }

    drawBullets(bullets, color) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 5;
        
        bullets.forEach(bullet => {
            // Рисуем пулю
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            
            // Добавляем след
            const gradient = this.ctx.createLinearGradient(
                bullet.x + bullet.width/2, 
                bullet.y, 
                bullet.x + bullet.width/2, 
                bullet.y + (bullet.speedY > 0 ? bullet.height * 2 : -bullet.height * 2)
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                bullet.x + bullet.width/2 - 1,
                bullet.y + (bullet.speedY > 0 ? bullet.height : -bullet.height),
                2,
                bullet.height
            );
        });
        this.ctx.restore();
    }

    drawStartScreen(canvas) {
        this.ctx.save();
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ARCADE COLLECTOR', canvas.width/2, canvas.height/3);
        
        // Draw instructions
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press SPACE to start', canvas.width/2, canvas.height/2);
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Use arrow keys to move', canvas.width/2, canvas.height/2 + 40);
        this.ctx.fillText('Space to shoot', canvas.width/2, canvas.height/2 + 70);
        
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