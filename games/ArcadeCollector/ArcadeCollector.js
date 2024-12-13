class ArcadeCollector {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Состояние игры
        this.gameState = 'start';
        this.gameTime = 0; // Время игры в секундах
        this.difficulty = 1; // Множитель сложности
        
        // Временные параметры
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fixedTimeStep = 1000 / 60;
        this.timeAccumulator = 0;
        
        // Игрок
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            width: 40,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            baseSpeed: 300,
            horizontalSpeedMultiplier: 1.5, // Множитель скорости для движения влево/вправо
            lives: 3,
            color: '#6366f1',
            shootCooldown: 0,
            shootRate: 250
        };
        
        // Типы противников
        this.enemyTypes = {
            basic: {
                width: 30,
                height: 30,
                speed: 150,
                color: '#ef4444',
                health: 1,
                points: 10,
                shootRate: 2000,
                bulletSpeed: 200,
                behavior: 'straight'
            },
            shooter: {
                width: 40,
                height: 40,
                speed: 100,
                color: '#fb923c',
                health: 2,
                points: 20,
                shootRate: 1500,
                bulletSpeed: 250,
                behavior: 'strafe'
            },
            boss: {
                width: 60,
                height: 60,
                speed: 80,
                color: '#dc2626',
                health: 5,
                points: 50,
                shootRate: 1000,
                bulletSpeed: 300,
                behavior: 'sine'
            }
        };

        this.enemies = [];
        this.enemyBullets = [];
        
        // Игровые объекты
        this.coins = [];
        this.obstacles = [];
        this.bullets = [];
        this.score = 0;
        
        // Параметры спавна
        this.coinSpawnTimer = 0;
        this.obstacleSpawnTimer = 0;
        this.coinSpawnRate = 1000;
        this.obstacleSpawnRate = 2000;
        
        // UI элементы
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.pauseMenu = document.getElementById('pauseMenu');
        this.gameOverMenu = document.getElementById('gameOverMenu');
        this.finalScoreElement = document.getElementById('finalScore');
        
        // Управление
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false,
            Space: false,
            Escape: false
        };
        
        // Добавляем стартовое меню
        this.startMenu = document.getElementById('startMenu');
        
        this.bindEvents();
        this.lastTime = performance.now();
        this.animate(this.lastTime);
    }

    animate(currentTime) {
        // Расчет deltaTime в секундах
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        // Ограничиваем deltaTime для предотвращения больших скачков
        this.deltaTime = Math.min(this.deltaTime, 0.1);
        this.lastTime = currentTime;

        // Очистка canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'playing') {
            this.timeAccumulator += this.deltaTime * 1000;
            
            // Фиксированный временной шаг для физики
            while (this.timeAccumulator >= this.fixedTimeStep) {
                this.update(this.fixedTimeStep / 1000);
                this.timeAccumulator -= this.fixedTimeStep;
            }
            
            this.draw();
        } else if (this.gameState === 'start') {
            this.drawStartScreen();
        }

        requestAnimationFrame((time) => this.animate(time));
    }

    drawStartScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Arcade Collector', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = '24px Arial';
        this.ctx.fillText('Нажмите ПРОБЕЛ чтобы начать', this.canvas.width / 2, this.canvas.height / 2 + 50);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Управление: Стрелки для движения, ПРОБЕЛ для стрельбы', 
            this.canvas.width / 2, this.canvas.height / 2 + 100);
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
                if (e.code === 'Escape') this.togglePause();
                if (e.code === 'Space' && this.gameState === 'start') {
                    this.startGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
            }
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
    }

    updateDifficulty(dt) {
        this.gameTime += dt;
        // Увеличиваем сложность каждые 30 секунд
        this.difficulty = 1 + Math.floor(this.gameTime / 30) * 0.2;
        
        // Также увеличиваем сложность на основе очков
        this.difficulty += Math.floor(this.score / 100) * 0.1;
        
        // Обновляем частоту появления объектов
        this.obstacleSpawnRate = Math.max(500, 2000 - this.difficulty * 200);
        this.coinSpawnRate = Math.max(400, 1000 - this.difficulty * 100);
        
        // Обновляем скорость объектов
        const baseObstacleSpeed = 200;
        const baseCoinSpeed = 150;
        this.currentObstacleSpeed = baseObstacleSpeed * this.difficulty;
        this.currentCoinSpeed = baseCoinSpeed * this.difficulty;
        
        // Обновляем UI
        if (this.levelElement) {
            this.levelElement.textContent = Math.floor(this.difficulty * 10) / 10;
        }
    }

    shoot() {
        if (this.player.shootCooldown <= 0) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 5,
                y: this.player.y,
                width: 10,
                height: 20,
                speed: 500,
                color: '#4ade80'
            });
            this.player.shootCooldown = this.player.shootRate;
        }
    }

    updateBullets(dt) {
        this.player.shootCooldown = Math.max(0, this.player.shootCooldown - dt * 1000);
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.y -= bullet.speed * dt;
            
            // Проверяем столкновения с препятствиями
            let hitObstacle = false;
            this.obstacles = this.obstacles.filter(obstacle => {
                if (!hitObstacle && this.checkCollision(bullet, obstacle)) {
                    hitObstacle = true;
                    this.score += 5;
                    this.scoreElement.textContent = this.score;
                    return false;
                }
                return true;
            });
            
            return !hitObstacle && bullet.y > 0;
        });
    }

    spawnEnemy() {
        const types = ['basic', 'shooter', 'boss'];
        const weights = [0.6, 0.3, 0.1];
        const type = this.weightedRandom(types, weights);
        const enemyType = this.enemyTypes[type];

        const enemy = {
            ...enemyType,
            x: Math.random() * (this.canvas.width - enemyType.width),
            y: -enemyType.height,
            initialX: 0,
            time: 0,
            lastShot: 0,
            type: type
        };

        enemy.initialX = enemy.x;
        this.enemies.push(enemy);
    }

    weightedRandom(items, weights) {
        const total = weights.reduce((a, b) => a + b);
        let random = Math.random() * total;
        
        for (let i = 0; i < items.length; i++) {
            if (random < weights[i]) return items[i];
            random -= weights[i];
        }
        return items[0];
    }

    updateEnemies(dt) {
        this.enemies = this.enemies.filter(enemy => {
            // Обновление времени для поведения
            enemy.time += dt;

            // Обновление позиции в зависимости от поведения
            switch(enemy.behavior) {
                case 'straight':
                    enemy.y += enemy.speed * dt;
                    break;
                case 'strafe':
                    enemy.y += enemy.speed * dt;
                    enemy.x = enemy.initialX + Math.sin(enemy.time) * 100;
                    break;
                case 'sine':
                    enemy.y += enemy.speed * dt;
                    enemy.x = enemy.initialX + Math.sin(enemy.time * 2) * 150;
                    break;
            }

            // Стрельба противников
            if (enemy.time - enemy.lastShot > enemy.shootRate / 1000) {
                this.enemyShoot(enemy);
                enemy.lastShot = enemy.time;
            }

            return enemy.y < this.canvas.height && enemy.health > 0;
        });
    }

    enemyShoot(enemy) {
        const bulletSpeed = enemy.bulletSpeed * this.difficulty;
        
        switch(enemy.type) {
            case 'basic':
                this.createEnemyBullet(enemy, 0, bulletSpeed);
                break;
            case 'shooter':
                this.createEnemyBullet(enemy, -bulletSpeed/4, bulletSpeed);
                this.createEnemyBullet(enemy, bulletSpeed/4, bulletSpeed);
                break;
            case 'boss':
                for(let i = -2; i <= 2; i++) {
                    this.createEnemyBullet(enemy, bulletSpeed/3 * i, bulletSpeed);
                }
                break;
        }
    }

    createEnemyBullet(enemy, speedX, speedY) {
        this.enemyBullets.push({
            x: enemy.x + enemy.width/2,
            y: enemy.y + enemy.height,
            width: 8,
            height: 12,
            speedX: speedX,
            speedY: speedY,
            color: enemy.color
        });
    }

    updateEnemyBullets(dt) {
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.x += bullet.speedX * dt;
            bullet.y += bullet.speedY * dt;

            // Проверка столкновения с игроком
            if (this.checkCollision(this.player, bullet)) {
                this.player.lives--;
                this.livesElement.textContent = this.player.lives;
                
                if (this.player.lives <= 0) {
                    this.gameOver();
                }
                return false;
            }

            return bullet.y < this.canvas.height && bullet.y > 0 &&
                   bullet.x > 0 && bullet.x < this.canvas.width;
        });
    }

    update(dt) {
        if (this.gameState !== 'playing') return;
        
        this.updateDifficulty(dt);
        this.updatePlayerPosition(dt);
        this.updateSpawnTimers(dt);
        this.updateGameObjects(dt);
        this.updateBullets(dt);
        this.updateEnemies(dt);
        this.updateEnemyBullets(dt);
        
        if (this.keys.Space) {
            this.shoot();
        }
    }

    updatePlayerPosition(dt) {
        const baseSpeed = this.player.baseSpeed * dt;
        
        // Горизонтальное движение быстрее
        if (this.keys.ArrowLeft) {
            this.player.x -= baseSpeed * this.player.horizontalSpeedMultiplier;
        }
        if (this.keys.ArrowRight) {
            this.player.x += baseSpeed * this.player.horizontalSpeedMultiplier;
        }
        if (this.keys.ArrowUp) this.player.y -= baseSpeed;
        if (this.keys.ArrowDown) this.player.y += baseSpeed;
        
        // Ограничение движения игрока
        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));
    }

    updateSpawnTimers(dt) {
        // Обновление таймера монет
        this.coinSpawnTimer += dt * 1000;
        if (this.coinSpawnTimer >= this.coinSpawnRate) {
            this.spawnCoin();
            this.coinSpawnTimer = 0;
        }
        
        // Обновление таймера препятствий
        this.obstacleSpawnTimer += dt * 1000;
        if (this.obstacleSpawnTimer >= this.obstacleSpawnRate) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }
    }

    spawnCoin() {
        this.coins.push({
            x: Math.random() * (this.canvas.width - 20),
            y: -20,
            width: 20,
            height: 20,
            speed: 150, // пикселей в секунду
            color: '#FFD700'
        });
    }

    spawnObstacle() {
        this.obstacles.push({
            x: Math.random() * (this.canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 200, // пикселей в секунду
            color: '#ef4444'
        });
    }

    updateGameObjects(dt) {
        // Обновление монет
        this.coins = this.coins.filter(coin => {
            coin.y += this.currentCoinSpeed * dt;
            
            if (this.checkCollision(this.player, coin)) {
                this.score += 10;
                this.scoreElement.textContent = this.score;
                return false;
            }
            
            return coin.y < this.canvas.height;
        });
        
        // Обновление препятствий
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.y += this.currentObstacleSpeed * dt;
            
            if (this.checkCollision(this.player, obstacle)) {
                this.player.lives--;
                this.livesElement.textContent = this.player.lives;
                
                if (this.player.lives <= 0) {
                    this.gameOver();
                }
                return false;
            }
            
            return obstacle.y < this.canvas.height;
        });
    }

    draw() {
        // Отрисовка игрока
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Отрисовка пуль игрока
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });

        // Отрисовка пуль противников
        this.enemyBullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Отрисовка противников
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Отрисовка полоски здоровья для босса
            if (enemy.type === 'boss') {
                const healthPercentage = enemy.health / this.enemyTypes.boss.health;
                this.ctx.fillStyle = '#22c55e';
                this.ctx.fillRect(
                    enemy.x, 
                    enemy.y - 10, 
                    enemy.width * healthPercentage, 
                    5
                );
            }
        });
        
        // Отрисовка монет
        this.coins.forEach(coin => {
            this.ctx.fillStyle = coin.color;
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pauseMenu.style.display = 'flex';
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }

    resumeGame() {
        this.gameState = 'playing';
        this.pauseMenu.style.display = 'none';
        this.lastTime = performance.now();
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.gameOverMenu.style.display = 'flex';
        this.finalScoreElement.textContent = this.score;
    }

    restartGame() {
        // Сброс состояния игры
        this.score = 0;
        this.player.lives = 3;
        this.coins = [];
        this.obstacles = [];
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 50;
        
        // Обновление UI
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.player.lives;
        this.pauseMenu.style.display = 'none';
        this.gameOverMenu.style.display = 'none';
        
        // Возобновление игры
        this.gameState = 'playing';
        this.lastTime = performance.now();
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.player.lives = 3;
        this.difficulty = 1;
        this.gameTime = 0;
        this.scoreElement.textContent = '0';
        this.livesElement.textContent = '3';
        this.levelElement.textContent = '1.0';
        
        // Очищаем все массивы
        this.coins = [];
        this.obstacles = [];
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        
        // Сбрасываем позицию игрока
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height - 50;
    }
}

// Создание экземпляра игры при загрузке страницы
window.addEventListener('load', () => {
    new ArcadeCollector();
}); 