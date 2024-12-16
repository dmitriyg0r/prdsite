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
            width: 80,
            height: 80,
            hitboxWidth: 60,
            hitboxHeight: 60,
            velocityX: 0,
            velocityY: 0,
            baseSpeed: 300,
            color: '#4ade80', // Зеленый цвет корабля
            // Параметры рывка
            dashForce: 2000,
            dashDuration: 0.15,
            dashCooldown: 0.8,
            dashTimer: 0,
            dashCooldownTimer: 0,
            isDashing: false,
            // Параметры следа
            dashGhosts: [],
            ghostInterval: 0.02,
            ghostTimer: 0,
            ghostDuration: 0.3, // Длительность существования следа
            friction: 0.92,
            // Параметры стрельбы
            shootCooldown: 0,
            shootRate: 250, // Уменьшим задержку между выстрелами
            maxHealth: 100,
            health: 100,
        };
        
        // Типы противников
        this.enemyTypes = {
            basic: {
                width: 30,
                height: 30,
                speed: 120, // Уменьшаем с 150 до 120
                color: '#ef4444',
                health: 2, // Увеличиваем с 1 до 2
                points: 15, // Увеличиваем с 10 до 15
                shootRate: 2500, // Увеличиваем с 2000 до 2500
                bulletSpeed: 200,
                behavior: 'straight',
                damage: 10, // Базовый урон
                bulletDamage: 5, // Урон от пуль
            },
            shooter: {
                width: 40,
                height: 40,
                speed: 90, // Уменьшаем с 100 до 80
                color: '#fb923c',
                health: 3, // Увеличиваем с 2 до 3
                points: 25, // Увеличиваем с 20 до 25
                shootRate: 2000, // Увеличиваем с 1500 до 2000
                bulletSpeed: 250,
                behavior: 'strafe',
                damage: 15, // Повышенный урон при столкновении
                bulletDamage: 8, // Повышенный урон от пуль
            },
            boss: {
                width: 60,
                height: 60,
                speed: 60, // Уменьшаем с 80 до 60
                color: '#dc2626',
                health: 8, // Увеличиваем с 5 до 8
                points: 75, // Увеличиваем с 50 до 75
                shootRate: 1500, // Увеличиваем с 1000 до 1500
                bulletSpeed: 300,
                behavior: 'sine',
                damage: 25, // Сильный урон при столкновении
                bulletDamage: 12, // Сильный урон от пуль
            }
        };

        this.enemies = [];
        this.enemyBullets = [];
        
        // Игровые объекты
        this.coins = [];
        this.obstacles = [];
        this.bullets = [];
        this.score = 0;
        
        // араметры спавна
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 2500; // Увеличиваем с 2000 до 2500
        this.coinSpawnTimer = 0;
        this.coinSpawnRate = 1500; // Увеличиваем с 1000 до 1500
        
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
            KeyE: false,    // Для стрельбы
            KeyW: false,    // Для рывка
            Space: false,   // Для запуска игры
            Escape: false
        };
        
        // Добавляем стартовое меню
        this.startMenu = document.getElementById('startMenu');
        
        // Добавляем массив для частиц
        this.particles = [];
        
        // Загрузка изображения корабля
        this.playerImage = new Image();
        this.playerImage.src = 'assets/Frendly_ship.png'; // Путь к вашему изображению
        
        // Добавим в конструктор массив для частиц двигателя
        this.engineParticles = [];
        
        // Добавляем массив для перков
        this.perks = [];
        
        // Добавляем типы перков
        this.perkTypes = {
            health: {
                width: 30,
                height: 30,
                color: '#ef4444', // Красный цвет для аптечки
                effect: () => this.applyHealthPerk(),
                spawnRate: 15000, // Раз в 15 секунд
                lastSpawn: 0
            },
            weapon: {
                width: 30,
                height: 30,
                color: '#3b82f6', // Синий цвет для оружия
                effect: () => this.applyWeaponPerk(),
                duration: 10, // Длительность эффекта в секундах
                spawnRate: 20000, // Раз в 20 секунд
                lastSpawn: 0
            }
        };
        
        // Загружаем изображения для перков
        this.perkImages = {
            health: new Image(),
            weapon: new Image()
        };
        this.perkImages.health.src = './games/ArcadeCollector/assets/med_perk.png';
        this.perkImages.weapon.src = './games/ArcadeCollector/assets/w3_perk.png';
        
        // Изменяем параметры улучшения оружия
        this.weaponPowerup = {
            active: false,
            timeLeft: 0,
            type: 'normal' // 'normal' или 'shotgun'
        };
        
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
        // Предотврщаем прокрутку страницы
        window.addEventListener('keydown', (e) => {
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'KeyW', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
            }

            // Запуск игры по пробелу
            if (e.code === 'Space' && this.gameState === 'start') {
                this.startGame();
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
        // Замедляем рост сложности
        this.difficulty = 1 + Math.floor(this.gameTime / 45) * 0.15; // ыло 30 сек и 0.2
        
        // Уменьшаем влияние очков на сложность
        this.difficulty += Math.floor(this.score / 150) * 0.08; // Было 100 и 0.1
        
        // Более плавное изменение частоты спавна
        this.enemySpawnRate = Math.max(800, 2500 - this.difficulty * 150); // Корректируем значения
        this.coinSpawnRate = Math.max(600, 1500 - this.difficulty * 75);
        
        if (this.levelElement) {
            this.levelElement.textContent = Math.floor(this.difficulty * 10) / 10;
        }
    }

    shoot() {
        if (this.weaponPowerup.type === 'shotgun') {
            // Стрельба дробью (7 пуль веером)
            const bulletCount = 7;
            const spreadAngle = Math.PI / 3; // 60 градусов общий разброс
            
            for (let i = 0; i < bulletCount; i++) {
                const angle = (i - (bulletCount - 1) / 2) * (spreadAngle / (bulletCount - 1));
                const speed = 500;
                
                const speedX = Math.sin(angle) * speed;
                const speedY = -Math.cos(angle) * speed;
                
                this.bullets.push({
                    x: this.player.x + this.player.width/2 - 2,
                    y: this.player.y,
                    width: 4,
                    height: 8,
                    speedX: speedX,
                    speedY: speedY,
                    color: '#4ade80',
                    damage: 8 // Уменьшенный урон для каждой пули дроби
                });
            }
        } else {
            // Обычная стрельба
            this.bullets.push({
                x: this.player.x + this.player.width/2 - 2,
                y: this.player.y,
                width: 4,
                height: 8,
                speedX: 0,
                speedY: -500,
                color: '#4ade80',
                damage: 15
            });
        }

        this.createShootEffect();
    }

    updateBullets(dt) {
        this.bullets = this.bullets.filter(bullet => {
            bullet.y += bullet.speedY * dt;
            
            // Проверяем столкновения с врагами
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (this.checkCollision(bullet, enemy)) {
                    enemy.health--;
                    if (enemy.health <= 0) {
                        this.score += enemy.points;
                        this.scoreElement.textContent = this.score;
                        this.enemies.splice(i, 1);
                    }
                    return false;
                }
            }
            
            return bullet.y > -bullet.height;
        });
    }

    createDestroyEffect(enemy) {
        // Создаем эффект взрыва
        const particles = 12;
        const colors = ['#fcd34d', '#f59e0b', '#dc2626', '#ffffff'];
        
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            const speed = 100 + Math.random() * 100;
            const size = 4 + Math.random() * 4;
            const lifetime = 0.5 + Math.random() * 0.5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                lifetime: lifetime,
                time: 0
            });
        }
    }

    createHitEffect(enemy) {
        // Создаем эффект поадания
        const particles = 6;
        const colors = ['#ffffff', '#fcd34d'];
        
        for (let i = 0; i < particles; i++) {
            const angle = -Math.PI/2 + (Math.random() - 0.5);
            const speed = 50 + Math.random() * 50;
            const size = 2 + Math.random() * 2;
            const lifetime = 0.2 + Math.random() * 0.2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                lifetime: lifetime,
                time: 0
            });
        }
    }

    updateParticles(dt) {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.time += dt;
            return particle.time < particle.lifetime;
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
            color: enemy.color,
            damage: enemy.bulletDamage
        });
    }

    updateEnemyBullets(dt) {
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.x += bullet.speedX * dt;
            bullet.y += bullet.speedY * dt;

            // Проверка столкновения с игроком
            if (this.checkCollision(this.player, bullet)) {
                this.damagePlayer(bullet.damage); // Используем урон из пули
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
        this.updateParticles(dt);
        this.updateEngineParticles(dt);
        this.updatePerks(dt);
        this.updateWeaponPowerup(dt);
        
        // О��новляем след рывка
        this.player.dashGhosts = this.player.dashGhosts.filter(ghost => {
            ghost.time += dt;
            return ghost.time < ghost.lifetime;
        });

        // Обработка стрельбы
        if (this.keys.KeyE && this.player.shootCooldown <= 0) {
            this.shoot();
            this.player.shootCooldown = this.player.shootRate;
        }

        // Обновление кулдауна стрельбы
        if (this.player.shootCooldown > 0) {
            this.player.shootCooldown -= dt * 1000;
        }
    }

    updatePlayerPosition(dt) {
        let moveX = 0;
        let moveY = 0;

        // Определяем направление движения
        if (this.keys.ArrowLeft) moveX -= 1;
        if (this.keys.ArrowRight) moveX += 1;
        if (this.keys.ArrowUp) moveY -= 1;
        if (this.keys.ArrowDown) moveY += 1;

        // Нормализация диагонального движения
        if (moveX !== 0 && moveY !== 0) {
            const normalizer = 1 / Math.sqrt(2);
            moveX *= normalizer;
            moveY *= normalizer;
        }

        // Рывок на клавишу W
        if (this.keys.KeyW && this.player.dashCooldownTimer <= 0 && !this.player.isDashing && (moveX !== 0 || moveY !== 0)) {
            console.log('Dash activated!'); // Для отладки
            this.player.isDashing = true;
            this.player.dashTimer = this.player.dashDuration;
            this.player.dashCooldownTimer = this.player.dashCooldown;
            
            // Применяем импульс в направлении движения
            this.player.velocityX = moveX * this.player.dashForce;
            this.player.velocityY = moveY * this.player.dashForce;
            
            this.createDashEffect();
        }

        // Обновление таймеров рывка
        if (this.player.dashCooldownTimer > 0) {
            this.player.dashCooldownTimer -= dt;
        }

        if (this.player.isDashing) {
            this.player.dashTimer -= dt;
            this.player.ghostTimer -= dt;
            
            // Создаем призрачный след
            if (this.player.ghostTimer <= 0) {
                this.createDashGhost();
                this.player.ghostTimer = this.player.ghostInterval;
            }
            
            if (this.player.dashTimer <= 0) {
                this.player.isDashing = false;
            }
        }

        // Применяем обычное движение, если не в рывке
        if (!this.player.isDashing) {
            this.player.velocityX = moveX * this.player.baseSpeed;
            this.player.velocityY = moveY * this.player.baseSpeed;
        }

        // Применяем трение
        this.player.velocityX *= this.player.friction;
        this.player.velocityY *= this.player.friction;

        // Обновляем позицию
        this.player.x += this.player.velocityX * dt;
        this.player.y += this.player.velocityY * dt;

        // Ограничение движения игрка
        if (this.player.x < 0) {
            this.player.x = 0;
            this.player.velocityX = 0;
        }
        if (this.player.x > this.canvas.width - this.player.width) {
            this.player.x = this.canvas.width - this.player.width;
            this.player.velocityX = 0;
        }
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocityY = 0;
        }
        if (this.player.y > this.canvas.height - this.player.height) {
            this.player.y = this.canvas.height - this.player.height;
            this.player.velocityY = 0;
        }
    }

    updateSpawnTimers(dt) {
        // Спавн враов
        this.enemySpawnTimer += dt * 1000;
        if (this.enemySpawnTimer >= this.enemySpawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Спавн монет
        this.coinSpawnTimer += dt * 1000;
        if (this.coinSpawnTimer >= this.coinSpawnRate) {
            this.spawnCoin();
            this.coinSpawnTimer = 0;
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

    drawEnemy(enemy) {
        switch(enemy.type) {
            case 'basic':
                // Треугольный враг
                this.ctx.fillStyle = enemy.color;
                this.ctx.beginPath();
                this.ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
                this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
                this.ctx.lineTo(enemy.x, enemy.y + enemy.height);
                this.ctx.closePath();
                this.ctx.fill();

                // Добавляем свечение
                this.ctx.shadowColor = enemy.color;
                this.ctx.shadowBlur = 10;
                this.ctx.strokeStyle = '#fff';
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
                break;

            case 'shooter':
                // Шестиугольный враг с градиентом
                const shooterGradient = this.ctx.createLinearGradient(
                    enemy.x, enemy.y, 
                    enemy.x + enemy.width, enemy.y + enemy.height
                );
                shooterGradient.addColorStop(0, enemy.color);
                shooterGradient.addColorStop(1, '#fbbf24');

                this.ctx.fillStyle = shooterGradient;
                this.ctx.beginPath();
                this.drawHexagon(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    enemy.width / 2
                );
                this.ctx.fill();

                // Добавляем пульсирующее оржие
                const gunSize = 8;
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(enemy.x - gunSize/2, enemy.y + enemy.height - gunSize/2, gunSize, gunSize);
                this.ctx.fillRect(enemy.x + enemy.width - gunSize/2, enemy.y + enemy.height - gunSize/2, gunSize, gunSize);
                break;

            case 'boss':
                // Сложна форма босса с градиентом
                const bossGradient = this.ctx.createRadialGradient(
                    enemy.x + enemy.width/2, enemy.y + enemy.height/2, 0,
                    enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width/2
                );
                bossGradient.addColorStop(0, '#dc2626');
                bossGradient.addColorStop(0.5, enemy.color);
                bossGradient.addColorStop(1, '#991b1b');

                // Основное тело
                this.ctx.fillStyle = bossGradient;
                this.ctx.beginPath();
                this.drawBossShape(enemy);
                this.ctx.fill();

                // Энергетическое поле
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(enemy.time * 5) * 0.2})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // Полоса здоровья
                const healthPercentage = enemy.health / this.enemyTypes.boss.health;
                const healthBarWidth = enemy.width * 1.2;
                const healthBarHeight = 8;
                const healthBarX = enemy.x + (enemy.width - healthBarWidth) / 2;
                const healthBarY = enemy.y - healthBarHeight - 5;

                // Фон полоски здоровья
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

                // Заполнение полоски здоровья
                const healthGradient = this.ctx.createLinearGradient(
                    healthBarX, healthBarY,
                    healthBarX + healthBarWidth, healthBarY
                );
                healthGradient.addColorStop(0, '#22c55e');
                healthGradient.addColorStop(1, '#4ade80');
                
                this.ctx.fillStyle = healthGradient;
                this.ctx.fillRect(
                    healthBarX,
                    healthBarY,
                    healthBarWidth * healthPercentage,
                    healthBarHeight
                );
                break;
        }
    }

    drawHexagon(x, y, size) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const xPoint = x + size * Math.cos(angle);
            const yPoint = y + size * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(xPoint, yPoint);
            } else {
                this.ctx.lineTo(xPoint, yPoint);
            }
        }
        this.ctx.closePath();
    }

    drawBossShape(enemy) {
        const x = enemy.x;
        const y = enemy.y;
        const w = enemy.width;
        const h = enemy.height;
        const time = enemy.time;

        // Создаем пульсирующий эффект
        const pulse = 1 + Math.sin(time * 3) * 0.1;

        this.ctx.beginPath();
        this.ctx.moveTo(x + w/2, y);
        this.ctx.lineTo(x + w, y + h/3);
        this.ctx.lineTo(x + w * pulse, y + h/2);
        this.ctx.lineTo(x + w, y + h * 2/3);
        this.ctx.lineTo(x + w/2, y + h);
        this.ctx.lineTo(x, y + h * 2/3);
        this.ctx.lineTo(x - w * (pulse - 1), y + h/2);
        this.ctx.lineTo(x, y + h/3);
        this.ctx.closePath();
    }

    draw() {
        // Сначала отрисовываем след
        this.player.dashGhosts.forEach(ghost => {
            const alpha = 0.3 * (1 - (ghost.time / ghost.lifetime));
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(
                this.playerImage,
                ghost.x,
                ghost.y,
                ghost.width,
                ghost.height
            );
            this.ctx.restore();
        });

        // Отрисовка частиц
        this.particles.forEach(particle => {
            if (particle.isFlash) {
                const alpha = (1 - particle.time / particle.lifetime) * particle.alpha;
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * (1 - particle.time / particle.lifetime), 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                const alpha = (1 - particle.time / particle.lifetime);
                this.ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Отрисовка игрока
        if (this.playerImage.complete) { // Проверяем, загрузилось ли изображение
            this.ctx.save();
            if (this.player.isDashing) {
                // Добавляем свечение во время рывка
                this.ctx.shadowColor = '#86efac';
                this.ctx.shadowBlur = 20;
            }
            this.ctx.drawImage(
                this.playerImage,
                this.player.x,
                this.player.y,
                this.player.width,
                this.player.height
            );
            this.ctx.restore();
        }

        // Отрисовка пуль
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color;
            this.ctx.beginPath();
            this.ctx.ellipse(
                bullet.x + bullet.width/2,
                bullet.y + bullet.height/2,
                bullet.width/2,
                bullet.height/2,
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
        });

        // Отрисовка пуль противников
        this.enemyBullets.forEach(bullet => {
            const gradient = this.ctx.createLinearGradient(
                bullet.x, bullet.y,
                bullet.x, bullet.y + bullet.height
            );
            gradient.addColorStop(0, bullet.color);
            gradient.addColorStop(1, '#fff');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.ellipse(
                bullet.x + bullet.width/2,
                bullet.y + bullet.height/2,
                bullet.width/2,
                bullet.height/2,
                0, 0, Math.PI * 2
            );
            this.ctx.fill();
        });

        // Отрисовка противников
        this.enemies.forEach(enemy => this.drawEnemy(enemy));

        // Отрисовка монет
        this.coins.forEach(coin => {
            const coinGradient = this.ctx.createRadialGradient(
                coin.x + coin.width/2, coin.y + coin.height/2, 0,
                coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2
            );
            coinGradient.addColorStop(0, '#fcd34d');
            coinGradient.addColorStop(1, '#f59e0b');

            this.ctx.fillStyle = coinGradient;
            this.ctx.beginPath();
            this.ctx.arc(
                coin.x + coin.width/2,
                coin.y + coin.height/2,
                coin.width/2,
                0, Math.PI * 2
            );
            this.ctx.fill();

            // Бик на монете
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(
                coin.x + coin.width/3,
                coin.y + coin.height/3,
                coin.width/6,
                0, Math.PI * 2
            );
            this.ctx.fill();
        });

        // Добавляем индикатор отката рывка
        if (this.player.dashCooldownTimer > 0) {
            const dashCooldownPercent = this.player.dashCooldownTimer / this.player.dashCooldown;
            const dashBarWidth = 30;
            const dashBarHeight = 4;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(
                this.player.x + (this.player.width - dashBarWidth) / 2,
                this.player.y - 10,
                dashBarWidth,
                dashBarHeight
            );
            
            this.ctx.fillStyle = '#6366f1';
            this.ctx.fillRect(
                this.player.x + (this.player.width - dashBarWidth) / 2,
                this.player.y - 10,
                dashBarWidth * (1 - dashCooldownPercent),
                dashBarHeight
            );
        }

        // Сначала отрисовываем частицы двигателя
        this.engineParticles.forEach(particle => {
            const alpha = (1 - particle.time / particle.lifetime) * 0.7;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Отрисовка перков
        this.perks.forEach(perk => {
            if (this.perkImages[perk.type] && this.perkImages[perk.type].complete) {
                this.ctx.save();
                // Добавляем свечение
                this.ctx.shadowColor = perk.color;
                this.ctx.shadowBlur = 10;
                // Отрисовываем изображение
                this.ctx.drawImage(
                    this.perkImages[perk.type],
                    perk.x,
                    perk.y,
                    perk.width,
                    perk.height
                );
                this.ctx.restore();
            }
        });
    }

    checkCollision(rect1, rect2) {
        // Если первый объект - игрок, используем его хитбокс
        const rect1X = rect1 === this.player ? rect1.x + (rect1.width - rect1.hitboxWidth) / 2 : rect1.x;
        const rect1Y = rect1 === this.player ? rect1.y + (rect1.height - rect1.hitboxHeight) / 2 : rect1.y;
        const rect1Width = rect1 === this.player ? rect1.hitboxWidth : rect1.width;
        const rect1Height = rect1 === this.player ? rect1.hitboxHeight : rect1.height;

        return rect1X < rect2.x + rect2.width &&
               rect1X + rect1Width > rect2.x &&
               rect1Y < rect2.y + rect2.height &&
               rect1Y + rect1Height > rect2.y;
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
        // Полный сброс состояния игры
        this.gameState = 'playing';
        this.score = 0;
        this.player.lives = 3;
        this.difficulty = 1;
        this.gameTime = 0;
        this.enemySpawnTimer = 0;
        this.coinSpawnTimer = 0;
        
        // чищаем все массивы
        this.coins = [];
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        
        // Сбрасываем позицию игрока
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height - 50;
        
        // Сбрасываем все таймеры и кулдауны
        this.player.shootCooldown = 0;
        this.timeAccumulator = 0;
        this.lastTime = performance.now();
        
        // бновляем UI
        this.scoreElement.textContent = '0';
        this.livesElement.textContent = '3';
        this.levelElement.textContent = '1.0';
        
        // Скрывам все меню
        this.pauseMenu.style.display = 'none';
        this.gameOverMenu.style.display = 'none';
        
        // Сбрасываем состояни клавиш
        Object.keys(this.keys).forEach(key => {
            this.keys[key] = false;
        });
        
        // Сбрасываем параметры рывка
        this.player.dashTimer = 0;
        this.player.dashCooldownTimer = 0;
        this.player.isDashing = false;
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.gameTime = 0;
        this.difficulty = 1;
        this.player.lives = 5;
        
        // Обновляем UI
        if (this.scoreElement) this.scoreElement.textContent = this.score;
        if (this.livesElement) this.livesElement.textContent = this.player.lives;
        if (this.levelElement) this.levelElement.textContent = this.difficulty;
        
        // Скрываем стартовое меню
        if (this.startMenu) {
            this.startMenu.style.display = 'none';
        }
    }

    createDashEffect() {
        const particles = 30;
        // Используем оттенки зеленого, соответствующие цвету корабля
        const colors = ['#4ade80', '#86efac', '#22c55e', '#ffffff'];
        const angleSpread = Math.PI / 3; // 60 градусов раброс
        
        // Определяем направление движения
        const angle = Math.atan2(this.player.velocityY, this.player.velocityX);
        
        for (let i = 0; i < particles; i++) {
            const particleAngle = angle + (Math.random() - 0.5) * angleSpread;
            const speed = 300 + Math.random() * 400;
            
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: -Math.cos(particleAngle) * speed,
                vy: -Math.sin(particleAngle) * speed,
                size: 4 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                lifetime: 0.3 + Math.random() * 0.2,
                time: 0
            });
        }

        // Добавляем вспышку в цвет корабля
        this.particles.push({
            x: this.player.x + this.player.width / 2,
            y: this.player.y + this.player.height / 2,
            vx: 0,
            vy: 0,
            size: this.player.width * 2,
            color: '#4ade80',
            lifetime: 0.15,
            time: 0,
            isFlash: true,
            alpha: 0.7
        });
    }

    createDashGhost() {
        this.player.dashGhosts.push({
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height,
            lifetime: this.player.ghostDuration,
            time: 0,
            image: this.playerImage // Добавляем ссылку на изображение
        });
    }

    damagePlayer(damage) {
        this.player.health -= damage;
        
        // Создаем эффект получения урона
        this.createDamageEffect();
        
        // Обновляем отображение здоровья
        this.updateHealthDisplay();
        
        // Проверяем условие смерти
        if (this.player.health <= 0) {
            this.gameOver();
        }
    }

    createDamageEffect() {
        // Визуальный эффект получения рона
        const particles = 15;
        const colors = ['#ef4444', '#dc2626', '#ffffff'];
        
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            const speed = 100 + Math.random() * 100;
            
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                lifetime: 0.3 + Math.random() * 0.2,
                time: 0
            });
        }
    }

    updateHealthDisplay() {
        // Обновляем отображение здоровья в UI
        if (this.livesElement) {
            this.livesElement.textContent = Math.max(0, Math.ceil(this.player.health));
        }
    }

    // Добавим новый метод для создания частиц двигателя
    createEngineParticles() {
        // Определяем интенсивность на основе движения
        const movingUp = this.keys.ArrowUp;
        const particleCount = movingUp ? 3 : 2; // Больше частиц при движении вверх
        const baseSpeed = movingUp ? 200 : 150; // Быстрее при дв��жении вверх

        // Корректируем позиции двигателей в соответствии со спрайтом
        const enginePositions = [
            { x: this.player.x + 10, y: this.player.y + this.player.height - 20 },  // Левый двигатель (сместили левее)
            { x: this.player.x + this.player.width - 15, y: this.player.y + this.player.height - 20 }  // Правый двигатель
        ];

        enginePositions.forEach(pos => {
            for (let i = 0; i < particleCount; i++) {
                const spread = (Math.random() - 0.5) * 4; // Уменьшаем разброс
                this.engineParticles.push({
                    x: pos.x + spread,
                    y: pos.y,
                    vx: (Math.random() - 0.5) * 15,
                    vy: baseSpeed + Math.random() * 50,
                    size: 2 + Math.random() * 2, // Немного уменьшаем размер частиц
                    lifetime: 0.2 + Math.random() * 0.1,
                    time: 0,
                    color: Math.random() > 0.5 ? '#4ade80' : '#22c55e'
                });
            }
        });
    }

    // Добавим метод обновления частиц двигателя
    updateEngineParticles(dt) {
        this.engineParticles = this.engineParticles.filter(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.time += dt;
            particle.size -= dt * 3; // Замедляем уменьшение размера частиц
            return particle.time < particle.lifetime && particle.size > 0;
        });

        // Добавляем новые частицы
        if (this.gameState === 'playing') {
            this.createEngineParticles();
        }
    }

    // Добавляем метод создания перка
    spawnPerk(type) {
        const perkType = this.perkTypes[type];
        this.perks.push({
            x: Math.random() * (this.canvas.width - perkType.width),
            y: -perkType.height,
            width: perkType.width,
            height: perkType.height,
            type: type,
            color: perkType.color,
            speed: 100
        });
    }

    // Обновление перков
    updatePerks(dt) {
        // Спавн перков
        Object.entries(this.perkTypes).forEach(([type, perk]) => {
            if (this.gameTime * 1000 - perk.lastSpawn > perk.spawnRate) {
                this.spawnPerk(type);
                perk.lastSpawn = this.gameTime * 1000;
            }
        });
        
        // ��вижение и коллизии перков
        this.perks = this.perks.filter(perk => {
            perk.y += perk.speed * dt;
            
            // Проверка коллизии с игроком
            if (this.checkCollision(this.player, perk)) {
                this.perkTypes[perk.type].effect();
                return false;
            }
            
            return perk.y < this.canvas.height;
        });
        
        // Обновление длительности эффекта оружия
        if (this.weaponPowerup.active) {
            this.weaponPowerup.timeLeft -= dt;
            if (this.weaponPowerup.timeLeft <= 0) {
                this.weaponPowerup.active = false;
                this.weaponPowerup.type = 'normal';
            }
        }
    }

    // Эффект аптечки
    applyHealthPerk() {
        const healAmount = 30; // Количество восстанавливаемого здоровья
        this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
        
        // Создаем эффект лечения
        this.createHealEffect();
    }

    // Эффект улучшения оружия
    applyWeaponPerk() {
        this.weaponPowerup.active = true;
        this.weaponPowerup.timeLeft = this.perkTypes.weapon.duration;
        this.weaponPowerup.type = 'shotgun';
        
        // Создаем эффект получения улучшения
        this.createWeaponPowerupEffect();
    }

    // Визуальный эффект лечения
    createHealEffect() {
        const particles = 20;
        const colors = ['#22c55e', '#4ade80', '#ffffff'];
        
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            const speed = 100 + Math.random() * 50;
            
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                lifetime: 0.5,
                time: 0
            });
        }
    }

    // Визуальный эффект улучшения оружия
    createWeaponPowerupEffect() {
        const particles = 20;
        const colors = ['#3b82f6', '#60a5fa', '#ffffff'];
        
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            const speed = 100 + Math.random() * 50;
            
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                lifetime: 0.5,
                time: 0
            });
        }
    }

    // В методе update или updateWeaponPowerup
    updateWeaponPowerup(dt) {
        if (this.weaponPowerup.active) {
            this.weaponPowerup.timeLeft -= dt;
            if (this.weaponPowerup.timeLeft <= 0) {
                this.weaponPowerup.active = false;
                this.weaponPowerup.type = 'normal';
            }
        }
    }

    // Добавляем метод создания эффекта выстрела
    createShootEffect() {
        // Создаем вспышку выстрела
        const muzzleFlash = {
            x: this.player.x + this.player.width/2,
            y: this.player.y,
            size: 15,
            lifetime: 0.1,
            time: 0,
            isFlash: true,
            alpha: 0.8,
            color: '#4ade80'
        };
        
        // Добавляем частицы выстрела
        const particleCount = this.weaponPowerup.type === 'shotgun' ? 10 : 5;
        const spreadAngle = this.weaponPowerup.type === 'shotgun' ? Math.PI/4 : Math.PI/8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = -Math.PI/2 + (Math.random() - 0.5) * spreadAngle;
            const speed = 200 + Math.random() * 100;
            
            this.particles.push({
                x: this.player.x + this.player.width/2,
                y: this.player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                color: '#4ade80',
                lifetime: 0.2 + Math.random() * 0.1,
                time: 0
            });
        }
        
        this.particles.push(muzzleFlash);
    }
}

// Создание экземпляра игры при загрузке страницы
window.addEventListener('load', () => {
    new ArcadeCollector();
}); 