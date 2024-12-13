class ArcadeCollector {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Состояние игры
        this.gameState = 'playing';
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
            lives: 3,
            color: '#6366f1',
            shootCooldown: 0,
            shootRate: 250 // миллисекунд между выстрелами
        };
        
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
        
        this.bindEvents();
        this.animate(0);
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
                if (e.code === 'Escape') this.togglePause();
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

    update(dt) {
        if (this.gameState !== 'playing') return;
        
        this.updateDifficulty(dt);
        this.updatePlayerPosition(dt);
        this.updateSpawnTimers(dt);
        this.updateGameObjects(dt);
        this.updateBullets(dt);
        
        // Стрельба
        if (this.keys.Space) {
            this.shoot();
        }
    }

    updatePlayerPosition(dt) {
        // Расчет скорости движения
        const moveSpeed = this.player.baseSpeed * dt;
        
        // Обновление позиции на основе нажатых клавиш
        if (this.keys.ArrowLeft) this.player.x -= moveSpeed;
        if (this.keys.ArrowRight) this.player.x += moveSpeed;
        if (this.keys.ArrowUp) this.player.y -= moveSpeed;
        if (this.keys.ArrowDown) this.player.y += moveSpeed;
        
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
        
        // Отрисовка пуль
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Отрисовка монет
        this.coins.forEach(coin => {
            this.ctx.fillStyle = coin.color;
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Отрисовка препятствий
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
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
}

// Создание экземпляра игры при загрузке страницы
window.addEventListener('load', () => {
    new ArcadeCollector();
}); 