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

        // Добавляем больше типов врагов
        this.enemyTypes = {
            basic: {
                width: 60,
                height: 60,
                speed: 120,
                color: '#ef4444',
                health: 2,
                points: 15,
                shootRate: 2500,
                bulletSpeed: 200,
                behavior: 'straight',
                damage: 10,
                bulletDamage: 5,
            },
            shooter: {
                width: 80,
                height: 80,
                speed: 90,
                color: '#fb923c',
                health: 3,
                points: 25,
                shootRate: 2000,
                bulletSpeed: 250,
                behavior: 'strafe',
                damage: 15,
                bulletDamage: 8,
            },
            boss: {
                width: 120,
                height: 120,
                speed: 60,
                color: '#dc2626',
                health: 8,
                points: 75,
                shootRate: 1500,
                bulletSpeed: 300,
                behavior: 'sine',
                damage: 25,
                bulletDamage: 12,
            },
            fast: {
                width: 50,
                height: 50,
                speed: 150,
                color: '#3b82f6',
                health: 1,
                points: 10,
                shootRate: 3000,
                bulletSpeed: 150,
                behavior: 'straight',
                damage: 5,
                bulletDamage: 3,
            },
            tank: {
                width: 100,
                height: 100,
                speed: 50,
                color: '#22c55e',
                health: 5,
                points: 50,
                shootRate: 2500,
                bulletSpeed: 100,
                behavior: 'straight',
                damage: 20,
                bulletDamage: 10,
            },
            zigzag: {
                width: 70,
                height: 70,
                speed: 100,
                color: '#8b5cf6',
                health: 2,
                points: 20,
                shootRate: 2000,
                bulletSpeed: 200,
                behavior: 'zigzag',
                damage: 10,
                bulletDamage: 5,
            },
            kamikaze: {
                width: 60,
                height: 60,
                speed: 200,
                color: '#f59e0b',
                health: 1,
                points: 30,
                shootRate: 0,
                bulletSpeed: 0,
                behavior: 'kamikaze',
                damage: 50,
                bulletDamage: 0,
            },
            sniper: {
                width: 70,
                height: 70,
                speed: 80,
                color: '#10b981',
                health: 3,
                points: 40,
                shootRate: 4000,
                bulletSpeed: 300,
                behavior: 'straight',
                damage: 15,
                bulletDamage: 20,
            },
            bomber: {
                width: 90,
                height: 90,
                speed: 70,
                color: '#f87171',
                health: 4,
                points: 60,
                shootRate: 3000,
                bulletSpeed: 150,
                behavior: 'bomb',
                damage: 20,
                bulletDamage: 15,
            },
            stealth: {
                width: 80,
                height: 80,
                speed: 110,
                color: '#9ca3af',
                health: 2,
                points: 35,
                shootRate: 2500,
                bulletSpeed: 200,
                behavior: 'stealth',
                damage: 10,
                bulletDamage: 5,
            },
            shielded: {
                width: 100,
                height: 100,
                speed: 60,
                color: '#d97706',
                health: 6,
                points: 70,
                shootRate: 2000,
                bulletSpeed: 150,
                behavior: 'straight',
                damage: 25,
                bulletDamage: 10,
            },
            healer: {
                width: 80,
                height: 80,
                speed: 90,
                color: '#34d399',
                health: 3,
                points: 45,
                shootRate: 3000,
                bulletSpeed: 200,
                behavior: 'heal',
                damage: 0,
                bulletDamage: 0,
            },
            drone: {
                width: 50,
                height: 50,
                speed: 130,
                color: '#60a5fa',
                health: 1,
                points: 15,
                shootRate: 1500,
                bulletSpeed: 250,
                behavior: 'drone',
                damage: 5,
                bulletDamage: 5,
            },
            swarm: {
                width: 40,
                height: 40,
                speed: 140,
                color: '#f472b6',
                health: 1,
                points: 5,
                shootRate: 1000,
                bulletSpeed: 200,
                behavior: 'swarm',
                damage: 5,
                bulletDamage: 3,
            },
            heavy: {
                width: 120,
                height: 120,
                speed: 50,
                color: '#6b7280',
                health: 7,
                points: 80,
                shootRate: 3500,
                bulletSpeed: 100,
                behavior: 'straight',
                damage: 30,
                bulletDamage: 20,
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
        this.startButton = document.getElementById('startButton');
        this.skillsButton = document.getElementById('skillsButton');
        this.leadersButton = document.getElementById('leadersButton');
        
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
                width: 80,  // Увеличиваем с 40 до 50
                height: 80, // Увеличиваем с 40 до 50
                color: '#ef4444',
                effect: () => this.applyHealthPerk(),
                spawnRate: 15000,
                lastSpawn: 0
            },
            weapon: {
                width: 70,  // Увеличиваем с 40 до 50
                height: 70, // Увеличиваем с 40 до 50
                color: '#3b82f6',
                effect: () => this.applyWeaponPerk('shotgun'),
                duration: 10,
                spawnRate: 20000,
                lastSpawn: 0
            },
            weapon2: {
                width: 70,  // Увеличиваем с 40 до 50
                height: 70, // Увеличиваем с 40 до 50
                color: '#22c55e',
                effect: () => this.applyWeaponPerk('triple'),
                duration: 10,
                spawnRate: 20000,
                lastSpawn: 0
            }
        };
        
        // Загружаем изображения для перков
        this.perkImages = {
            health: new Image(),
            weapon: new Image(),
            weapon2: new Image()  // Новый перк
        };
        this.perkImages.health.src = '../ArcadeCollector/assets/med_perk.png';
        this.perkImages.weapon.src = '../ArcadeCollector/assets/w3_perk.png';
        this.perkImages.weapon2.src = '../ArcadeCollector/assets/w2_perk.png';  // Путь к новому изображению
        
        // Добавляем обработчики ошибок загрузки изображений
        this.perkImages.health.onerror = () => console.error('Error loading health perk image');
        this.perkImages.weapon.onerror = () => console.error('Error loading weapon perk image');
        this.perkImages.weapon2.onerror = () => console.error('Error loading weapon2 perk image');
        
        // Добавляем проверку загрузки изображений
        this.perkImages.health.onload = () => console.log('Health perk image loaded');
        this.perkImages.weapon.onload = () => console.log('Weapon perk image loaded');
        this.perkImages.weapon2.onload = () => console.log('Weapon2 perk image loaded');
        
        // Изменяем параметры улучшения оружия
        this.weaponPowerup = {
            active: false,
            timeLeft: 0,
            type: 'normal' // 'normal' или 'shotgun'
        };
        
        // Добавляем параметры для боссов
        this.bossConfig = {
            scoreThreshold: 1000, // Первый босс появляется при 1000 очках
            subsequentThreshold: 1500, // Последующие боссы появляются каждые 1500 очков
            active: false,
            lastBossScore: 0,
            boss: null
        };
        
        // Обновляем типы боссов
        this.bossTypes = {
            basic: {
                width: 120,
                height: 120,
                maxHealth: 150,
                health: 150,
                color: '#dc2626',
                points: 500,
                shootRate: 2000,
                lastShot: 0,
                currentPattern: 0,
                bulletPatterns: ['circle', 'spiral', 'wave', 'cross'],
                bulletSpeed: 200,
                bulletDamage: 15,
                name: 'Красный страж'
            },
            laser: {
                width: 140,
                height: 140,
                maxHealth: 200,
                health: 200,
                color: '#3b82f6',
                points: 750,
                shootRate: 2500,
                lastShot: 0,
                currentPattern: 0,
                bulletPatterns: ['laser', 'crossLaser', 'spinningLaser'],
                bulletSpeed: 250,
                bulletDamage: 20,
                name: 'Лазерный титан'
            },
            swarm: {
                width: 100,
                height: 100,
                maxHealth: 180,
                health: 180,
                color: '#8b5cf6',
                points: 650,
                shootRate: 1800,
                lastShot: 0,
                currentPattern: 0,
                bulletPatterns: ['swarm', 'multiSwarm', 'chaosSwarm'],
                bulletSpeed: 180,
                bulletDamage: 12,
                name: 'Повелитель роя'
            },
            tank: {
                width: 160,
                height: 160,
                maxHealth: 300,
                health: 300,
                color: '#f59e0b',
                points: 1000,
                shootRate: 3000,
                lastShot: 0,
                currentPattern: 0,
                bulletPatterns: ['heavyShot', 'artillery', 'bombard'],
                bulletSpeed: 150,
                bulletDamage: 25,
                name: 'Тяжелый разрушитель'
            }
        };
        
        // Добавим порядок появления б������сов
        this.bossOrder = ['basic']; // Первый босс всегда basic
        this.currentBossIndex = 0;
        
        // Инициализируем состояние пользователя
        this.currentUser = null;
        
        // Определяем методы класса до их использования
        this.restartGame = this.restartGame.bind(this);
        this.checkAuth = this.checkAuth.bind(this);
        this.saveScore = this.saveScore.bind(this);
        this.showLoginPrompt = this.showLoginPrompt.bind(this);
        this.loadImages = this.loadImages.bind(this);
        this.init = this.init.bind(this);
        
        // Запускаем инициализа��ию
        this.init();
    }

    async init() {
        try {
            // Сначала загружаем изображения
            await this.loadImages().catch(err => {
                console.warn('Ошибка загрузки изображений, используем заглушки:', err);
                this.createFallbackImages();
            });
            
            // Затем проверяем авторизацию
            await this.checkAuth();
            
            // Инициализируем остальные компоненты
            this.bindEvents();
            this.startGame();
        } catch (err) {
            console.error('Ошибка инициализации игры:', err);
            // Продолжаем работу игры даже при ошибках инициализации
            this.bindEvents();
            this.startGame();
        }
    }

    async loadImages() {
        try {
            // Загрузка изображений бонусов с правильными путями
            this.healthPerkImage = await this.loadImage('./assets/med_perk.png');
            this.weaponPerkImage = await this.loadImage('./assets/w3_perk.png');
            this.weapon2PerkImage = await this.loadImage('./assets/w2_perk.png');

            // Загрузка изображений врагов
            for (const enemyType of Object.keys(this.enemyTypes)) {
                try {
                    const image = await this.loadImage(`./assets/enemies/${enemyType}.png`);
                    this.enemyTypes[enemyType].image = image;
                    console.log(`${enemyType} enemy image loaded successfully`);
                } catch (err) {
                    console.warn(`Не удалось загрузить изображение для ${enemyType}:`, err);
                    // Создаем заглушку для отсутствующего изображения
                    const fallbackImage = new Image();
                    fallbackImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                    this.enemyTypes[enemyType].image = fallbackImage;
                }
            }

            console.log('Все изображения загружены успешно');
        } catch (err) {
            console.error('Ошибка загрузки изображений:', err);
            // Создаем заглушки для отсутствующих изображений перков
            this.createFallbackImages();
        }
    }

    createFallbackImages() {
        // Создаем заглушки для всех изображений перков
        const fallbackImage = new Image();
        fallbackImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        
        this.healthPerkImage = fallbackImage.cloneNode();
        this.weaponPerkImage = fallbackImage.cloneNode();
        this.weapon2PerkImage = fallbackImage.cloneNode();
        
        console.warn('Используются заглушки изображений из-за ошибки загрузки');
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                console.log(`Изображение загружено: ${src}`);
                resolve(img);
            };
            
            img.onerror = () => {
                console.error(`Ошибка загрузки изображения: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };

            // Добавляем обработку таймаута
            const timeout = setTimeout(() => {
                img.src = ''; // Отменяем загрузку
                reject(new Error(`Timeout loading image: ${src}`));
            }, 5000); // 5 секунд таймаут

            img.onload = () => {
                clearTimeout(timeout);
                console.log(`Изображение загружено: ${src}`);
                resolve(img);
            };

            img.onerror = () => {
                clearTimeout(timeout);
                console.error(`Ошибка загрузки изображения: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };

            // Используем относительный путь от текущей директории
            img.src = src;
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/check-auth', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 500) {
                console.warn('Сервер временно недоступен');
                return;
            }

            if (!response.ok) {
                throw new Error(`Ошибка проверки авторизации: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.authenticated && data.user) {
                this.currentUser = data.user;
                console.log('Пользователь авторизован:', this.currentUser);
                this.updateAuthUI();
            } else {
                this.currentUser = null;
                console.log('Пользователь не авторизован');
                this.updateAuthUI();
            }
        } catch (err) {
            console.error('Ошибка при проверке авторизации:', err);
            // Не выбрасываем ошибку дальше, чтобы не прерывать инициализацию игры
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.updateScore(0);
        this.gameLoop();
    }

    bindEvents() {
        // Привязываем обработчики событий
        const restartButtons = document.querySelectorAll('.restart-button');
        restartButtons.forEach(button => {
            button.removeEventListener('click', this.restartGame); // Удаляем старый обработчик
            button.addEventListener('click', this.restartGame); // Добавляем новый
        });

        // ... остальные обработчики событий ...
    }

    restartGame() {
        console.log('Перезапуск игры...');
        
        // Сбрасываем состояние игры
        this.score = 0;
        this.gameState = 'playing';
        this.gameTime = 0;
        this.difficulty = 1;
        
        // Сбрасываем состояние игрока
        this.player.health = this.player.maxHealth;
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 50;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        
        // Очищаем массивы
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerUps = [];
        
        // Скрываем меню
        const gameOverMenu = document.getElementById('gameOverMenu');
        if (gameOverMenu) {
            gameOverMenu.style.display = 'none';
        }
        
        // Обновляем UI
        this.updateScore(0);
        this.drawUI();
        
        // Запускаем игр��вой цикл
        requestAnimationFrame(() => this.gameLoop());
        
        console.log('Игра перезапущена');
    }

    async saveScore(score) {
        if (!this.currentUser) {
            await this.checkAuth(); // Повторная проверка авторизации
        }

        if (!this.currentUser || !this.currentUser.id) {
            console.warn('Невозможно сохранить рекорд: пользователь не авторизован');
            this.showLoginPrompt();
            return;
        }

        try {
            const response = await fetch('/api/scores/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    score: Math.round(score),
                    gameName: 'ArcadeCollector'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('Рекорд сохранен успешно:', data);
                this.showNotification(`Рекорд сохранен! Ваше место: ${data.rank}`);
                await this.updateLeaderboard();
            } else {
                throw new Error(data.error || 'Ошибка сохранения рекорда');
            }
        } catch (err) {
            console.error('Ошибка сохранения рекорда:', err);
            this.showNotification('Ошибка сохранения рекорда', 'error');
        }
    }

    showLoginPrompt() {
        const loginPrompt = document.getElementById('loginPrompt');
        if (loginPrompt) {
            loginPrompt.style.display = 'block';
        }
    }

    initializeMenuHandlers() {
        // Кнопка Play - начинает игру
        this.startButton.addEventListener('click', () => {
            this.startGame();
        });

        // Кнопка Skills - открывает меню скиллов
        this.skillsButton.addEventListener('click', () => {
            // Здесь будет логика открытия меню скиллов
            console.log('Skills menu clicked');
        });

        // Кнопка Leaders - открывает таблицу лидеров
        this.leadersButton.addEventListener('click', () => {
            // Здесь будет логика открытия таблицы лидеров
            console.log('Leaders board clicked');
        });
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
        // Предотврщем прокрутку страницы
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

    updateDifficulty() {
        // Убеждаемся, что работаем с числами
        const currentTime = Number(this.gameTime || 0);
        const currentScore = Number(this.score || 0);
        
        // Базовая сложность
        let newDifficulty = 1;
        
        // Увеличение сложности от времени (каждые 60 секунд +0.5)
        newDifficulty += Math.floor(currentTime / 60) * 0.5;
        
        // Увеличение сложности от очков (каждые 500 очков +0.2)
        newDifficulty += Math.floor(currentScore / 500) * 0.2;
        
        // Ограничиваем сложность и сохраняем
        this.difficulty = Math.max(1, Math.min(newDifficulty, 10));
        
        // Обновляем отображение уровня
        if (this.levelElement) {
            this.levelElement.textContent = Number(this.difficulty).toFixed(1);
        }
    }

    shoot() {
        if (this.weaponPowerup.type === 'shotgun') {
            // Стрельба дробью (7 пуль веером)
            const bulletCount = 7;
            const spreadAngle = Math.PI / 6; // Уменьшаем разброс до 30 градусов
            const speed = 500;
            
            for (let i = 0; i < bulletCount; i++) {
                // Центрируем веер относительно направления вверху
                const angle = (i - (bulletCount - 1) / 2) * (spreadAngle / (bulletCount - 1));
                
                // Рассчитываем компоненты скорости
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
                    damage: 8
                });
            }
        } else if (this.weaponPowerup.type === 'triple') {
            // Тройной выстрел (3 пули)
            const bulletCount = 3;
            const spreadAngle = Math.PI / 8; // Менший разброс
            const speed = 500;
            
            for (let i = 0; i < bulletCount; i++) {
                const angle = (i - (bulletCount - 1) / 2) * (spreadAngle / (bulletCount - 1));
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
                    damage: 12 // Больше урона чем у дроби
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
            bullet.x += bullet.speedX * dt;
            bullet.y += bullet.speedY * dt;
            
            // Проверяем попадание в босса
            if (this.bossConfig.active && this.bossConfig.boss) {
                if (this.checkCollision(bullet, this.bossConfig.boss)) {
                    this.bossConfig.boss.health -= bullet.damage;
                    this.createHitEffect(this.bossConfig.boss);
                    
                    if (this.bossConfig.boss.health <= 0) {
                        // Изменяем начисление очков за босса
                        const bossPoints = this.bossConfig.boss.points || 1000;
                        this.score += bossPoints;
                        this.scoreElement.textContent = this.score;
                        this.createDestroyEffect(this.bossConfig.boss);
                        this.bossConfig.active = false;
                        this.bossConfig.boss = null;
                    }
                    return false;
                }
            }
            
            // Проверяем столкновения с врагами
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (this.checkCollision(bullet, enemy)) {
                    enemy.health -= bullet.damage || 1;
                    if (enemy.health <= 0) {
                        // Изменяем начисление очков за врага
                        const enemyPoints = this.enemyTypes[enemy.type].points || 100;
                        this.score += enemyPoints;
                        this.scoreElement.textContent = this.score;
                        this.enemies.splice(i, 1);
                        this.createDestroyEffect(enemy);
                    } else {
                        this.createHitEffect(enemy);
                    }
                    return false;
                }
            }
            
            // Удаляем пули, вышедшие за пределы экрана
            return bullet.y > -bullet.height && 
                   bullet.y < this.canvas.height && 
                   bullet.x > -bullet.width && 
                   bullet.x < this.canvas.width;
        });
    }

    createDestroyEffect(enemy) {
        const particleCount = 10;
        const color = this.enemyTypes[enemy.type].color;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100 + Math.random() * 50;
            
            this.particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 2,
                color: color,
                lifetime: 0.5 + Math.random() * 0.3,
                time: 0
            });
        }
    }

    createHitEffect(enemy) {
        const particleCount = 5;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                size: 2 + Math.random() * 2,
                color: '#ffffff',
                lifetime: 0.2,
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
        // Получаем доступные типы врагов в зависимости от текущей сложности
        const availableTypes = this.getAvailableEnemyTypes();
        if (availableTypes.length === 0) return;

        // Выбираем случайный тип из доступных
        const enemyType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const enemyConfig = this.enemyTypes[enemyType];

        // Рассчитываем случайную позицию по X
        const x = Math.random() * (this.canvas.width - enemyConfig.width);

        // Создаем врага
        const enemy = {
            x: x,
            y: -enemyConfig.height,
            width: enemyConfig.width,
            height: enemyConfig.height,
            type: enemyType,
            health: enemyConfig.health,
            speed: enemyConfig.speed,
            behavior: enemyConfig.behavior,
            time: 0,
            lastShot: 0
        };

        this.enemies.push(enemy);
    }

    // Добавьте новый метод для определения доступных типов врагов
    getAvailableEnemyTypes() {
        let availableTypes = [];
        
        // Проходим по прогрессии и добавляем типы врагов, доступные для текущей сложности
        this.enemyProgression.forEach(level => {
            if (this.difficulty >= level.difficulty) {
                availableTypes = [...availableTypes, ...level.types];
            }
        });

        // Всегда добавляем базовый тип
        if (!availableTypes.includes('basic')) {
            availableTypes.push('basic');
        }

        return availableTypes;
    }

    updateEnemies(dt) {
        this.enemies = this.enemies.filter(enemy => {
            // Добавляем время с последнего выстрела, если его нет
            enemy.lastShot = enemy.lastShot || 0;
            enemy.lastShot += dt * 1000; // Конвертируем в миллисекунды

            // Обновляем поведение в зависимости от типа
            switch (enemy.behavior) {
                case 'straight':
                    enemy.y += enemy.speed * dt;
                    break;
                case 'sine':
                    enemy.time = enemy.time || 0;
                    enemy.time += dt;
                    enemy.x += Math.sin(enemy.time * 2) * enemy.speed * dt;
                    enemy.y += enemy.speed * dt * 0.5;
                    break;
                case 'strafe':
                    enemy.time = enemy.time || 0;
                    enemy.time += dt;
                    enemy.x += Math.sin(enemy.time) * enemy.speed * dt * 2;
                    enemy.y += enemy.speed * dt * 0.3;
                    break;
                case 'zigzag':
                    enemy.time = enemy.time || 0;
                    enemy.time += dt;
                    enemy.x += Math.sin(enemy.time * 3) * enemy.speed * dt * 1.5;
                    enemy.y += enemy.speed * dt * 0.7;
                    break;
                case 'kamikaze':
                    this.updateKamikazeBehavior(enemy);
                    break;
                case 'heal':
                    enemy.y += enemy.speed * dt * 0.5;
                    this.healNearbyEnemies(enemy);
                    break;
                case 'drone':
                    this.updateDroneBehavior(enemy);
                    break;
                case 'swarm':
                    this.updateSwarmBehavior(enemy);
                    break;
                case 'stealth':
                    this.updateStealthBehavior(enemy);
                    break;
            }

            // Стрельба для всех врагов, у которых есть shootRate
            if (enemy.lastShot >= this.enemyTypes[enemy.type].shootRate) {
                this.enemyShoot(enemy);
                enemy.lastShot = 0;
            }

            // Проверяем столкновение с игроком
            if (this.checkCollision(enemy, this.player)) {
                this.player.health -= this.enemyTypes[enemy.type].damage;
                this.updateHealthDisplay();
                return false;
            }

            return enemy.y < this.canvas.height;
        });
    }

    // Добавьте новый метод для стрельбы врагов
    enemyShoot(enemy) {
        const type = this.enemyTypes[enemy.type];
        
        // Пропускаем стрельбу для типов врагов, которые не должны стрелять
        if (type.shootRate === 0 || type.bulletSpeed === 0) return;

        switch(enemy.type) {
            case 'sniper':
                // Снайпер стреляет прямо в игрока
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.createEnemyBullet(
                    enemy,
                    (dx / distance) * type.bulletSpeed,
                    (dy / distance) * type.bulletSpeed
                );
                break;

            case 'bomber':
                // Бомбардировщик выпускает несколько пуль по дуге
                for (let i = -1; i <= 1; i++) {
                    this.createEnemyBullet(
                        enemy,
                        type.bulletSpeed * i * 0.5,
                        type.bulletSpeed
                    );
                }
                break;

            case 'shooter':
                // Стрелок выпускает две пули
                this.createEnemyBullet(enemy, -type.bulletSpeed * 0.3, type.bulletSpeed);
                this.createEnemyBullet(enemy, type.bulletSpeed * 0.3, type.bulletSpeed);
                break;

            case 'drone':
                // Дрон стреляет в сторону игрока с небольшим разбросом
                const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                const spread = (Math.random() - 0.5) * 0.5;
                this.createEnemyBullet(
                    enemy,
                    Math.cos(angle + spread) * type.bulletSpeed,
                    Math.sin(angle + spread) * type.bulletSpeed
                );
                break;

            default:
                // Стандартная стрельба вниз
                this.createEnemyBullet(enemy, 0, type.bulletSpeed);
                break;
        }
    }

    // Вспомогательный метод для создания пуль врагов
    createEnemyBullet(enemy, speedX, speedY) {
        const type = this.enemyTypes[enemy.type];
        this.enemyBullets.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            width: 6,
            height: 6,
            speedX: speedX,
            speedY: speedY,
            color: type.color,
            damage: type.bulletDamage
        });

        // Добавляем эффект выстрела
        this.createEnemyShootEffect(enemy);
    }

    // Добавляем эффект выстрела врага
    createEnemyShootEffect(enemy) {
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                vx: (Math.random() - 0.5) * 50,
                vy: Math.random() * 50 + 50,
                size: 2 + Math.random() * 2,
                color: this.enemyTypes[enemy.type].color,
                lifetime: 0.2,
                time: 0
            });
        }
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
        
        // Обновляем время и сложность
        this.gameTime += dt;
        this.updateDifficulty();
        
        // Обновляем босса
        this.updateBoss(dt);
        
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
        
        // Обновляем след рывка
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

        // Обновление частиц двигателей противников
        this.updateEnemyEngineParticles(dt);

        // Проверяем здоровье в начале обновления
        if (this.player.health <= 0) {
            this.gameOver();
            return;
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

        // ормализация диагонального движения
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

        // Обновление таймера рывка
        if (this.player.dashCooldownTimer > 0) {
            this.player.dashCooldownTimer -= dt;
        }

        if (this.player.isDashing) {
            this.player.dashTimer -= dt;
            this.player.ghostTimer -= dt;
            
            // Создаем призрачный сле����
            if (this.player.ghostTimer <= 0) {
                this.createDashGhost();
                this.player.ghostTimer = this.player.ghostInterval;
            }
            
            if (this.player.dashTimer <= 0) {
                this.player.isDashing = false;
            }
        }

        // Применяем бычное движение, если не в рвке
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

        // Ограничение движения игрока
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
        // Обновляем таймер спавна врагов только если нет активного босса
        if (!this.bossConfig.active) {
            this.enemySpawnTimer += dt * 1000;
            if (this.enemySpawnTimer >= this.enemySpawnRate) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
            }
        }
        
        // Обновляем таймер спавна монет
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
        
        // Обновле��ие препя��ствий
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
        this.ctx.save();
        
        // Применяем прозрачность для стелс-врагов
        if (enemy.behavior === 'stealth') {
            this.ctx.globalAlpha = enemy.alpha || 1;
        }
        
        // Добавляем свечение
        this.ctx.shadowColor = enemy.color;
        this.ctx.shadowBlur = 10;
        
        const image = this.enemyImages[enemy.type];
        if (image && image.complete) {
            this.ctx.drawImage(
                image,
                enemy.x,
                enemy.y,
                enemy.width,
                enemy.height
            );
        } else {
            // Fallback отрисовка
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
        
        this.ctx.restore();
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
                // Добав��яем ��вечение во время рывка
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

        // О��рисовка монет
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

        // Сначала отрисовываем частицы двигат��ля
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
            const perkImage = this.perkImages[perk.type];
            if (perkImage && perkImage.complete && perkImage.naturalWidth !== 0) {
                this.ctx.save();
                // Добавляем свечение
                this.ctx.shadowColor = perk.color;
                this.ctx.shadowBlur = 15;
                // Отрисовываем изображение
                this.ctx.drawImage(
                    perkImage,
                    perk.x,
                    perk.y,
                    perk.width,
                    perk.height
                );
                this.ctx.restore();
            } else {
                // Fallback: рисуем цветной прямоугольник, если изображение не ��агрузилось
                this.ctx.fillStyle = perk.color;
                this.ctx.fillRect(perk.x, perk.y, perk.width, perk.height);
            }
        });

        // Отрисовка босса
        if (this.bossConfig.active && this.bossConfig.boss) {
            const boss = this.bossConfig.boss;
            
            // Добавляем эффект свечения
            this.ctx.save();
            this.ctx.shadowColor = boss.color;
            this.ctx.shadowBlur = 20;
            
            // Рисуем ��осса
            this.ctx.fillStyle = boss.color;
            this.ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
            
            // Полоска здоровья
            const healthBarWidth = boss.width;
            const healthBarHeight = 10;
            const healthPercentage = boss.health / boss.maxHealth;
            
            // Фон полоски здоровья
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(
                boss.x,
                boss.y - healthBarHeight - 5,
                healthBarWidth,
                healthBarHeight
            );
            
            // Текущее здоровье
            this.ctx.fillStyle = '#22c55e';
            this.ctx.fillRect(
                boss.x,
                boss.y - healthBarHeight - 5,
                healthBarWidth * healthPercentage,
                healthBarHeight
            );
            
            this.ctx.restore();
        }

        // Отрисовка частиц двигателей противников
        this.enemyEngineParticles.forEach(particle => {
            const alpha = (1 - particle.time / particle.lifetime) * 0.7;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            // Добавляем свечение в зависимости от типа противника
            this.ctx.shadowBlur = particle.type === 'boss' ? 15 : 8;
            this.ctx.shadowColor = particle.color;
            
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    checkCollision(rect1, rect2) {
        // Если первый объект - игрок, испол��зуем его хитбокс
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
        if (this.gameState === 'gameover') return; // Предотвращаем повторный вызов

        this.gameState = 'gameover';
        this.player.health = 0; // Устанавливаем здоровье в 0
        
        // Показываем меню окончания игры
        const gameOverMenu = document.getElementById('gameOverMenu');
        if (gameOverMenu) {
            const finalScore = document.getElementById('finalScore');
            if (finalScore) {
                finalScore.textContent = Math.round(this.score);
            }
            gameOverMenu.style.display = 'flex';
        }

        // Сохраняем рекорд
        this.saveScore(this.score);
    }

    reset() {
        this.gameState = 'start';
        this.startMenu.style.display = 'flex';
        // ... остальной код сброса ...
    }

    startGame() {
        // Скрываем меню
        this.startMenu.style.display = 'none';
        // Запус��аем игру
        this.gameState = 'playing';
        // Явно устанавливаем score как число
        this.score = 0;
        this.scoreElement.textContent = '0';
        this.player.health = this.player.maxHealth;
        this.enemies = [];
        this.bullets = [];
        this.coins = [];
        this.updateHealthDisplay();
    }

    createDashEffect() {
        const particles = 30;
        // Используем оттенки зеленого, соответствующие цвету корабля
        const colors = ['#4ade80', '#86efac', '#22c55e', '#ffffff'];
        const angleSpread = Math.PI / 3; // 60 градусов раброс
        
        // Определяем направление ��вижения
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
        this.updateHealthDisplay(); // Обновляем отображение после получения урона
        
        if (this.player.health <= 0) {
            this.gameOver();
        }
    }

    createDamageEffect() {
        // Создаем красные частицы при получении урона
        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * 200,
                vy: Math.sin(angle) * 200,
                size: 5,
                color: '#ef4444',
                lifetime: 0.5,
                time: 0
            });
        }
    }

    updateHealthDisplay() {
        if (this.livesElement) {
            this.livesElement.textContent = Math.ceil(this.player.health);
        }
    }

    // Добавим новый метод для создания частицы двигателя
    createEngineParticles() {
        // Определяем интенсивность на основе движения
        const movingUp = this.keys.ArrowUp;
        const particleCount = movingUp ? 3 : 2; // Больше частиц при двжении вверх
        const baseSpeed = movingUp ? 200 : 150; // Быстрее при двжении вверх

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

    // Добавим мето обновления частиц двигателя
    updateEngineParticles(dt) {
        this.engineParticles = this.engineParticles.filter(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.time += dt;
            particle.size -= dt * 3; // Замедляем уменьшение рзмера частиц
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
        
        // движение и коллизии перков
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
        const healAmount = 30;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
        this.updateHealthDisplay(); // Обновляем отображение после лечения
        
        // Создаем визуальный эффект лечения
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

    // Эффект улучшения оржия
    applyWeaponPerk(type) {
        this.weaponPowerup = {
            active: true,
            timeLeft: this.perkTypes[type === 'shotgun' ? 'weapon' : 'weapon2'].duration,
            type: type
        };
        
        // Создаем визуальный эффект получения улучшения
        const particles = 20;
        const colors = type === 'shotgun' ? 
            ['#3b82f6', '#60a5fa', '#ffffff'] : 
            ['#22c55e', '#4ade80', '#ffffff'];
        
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
                this.weaponPowerup = {
                    active: false,
                    timeLeft: 0,
                    type: 'normal'
                };  // Добавляем точку с запятой
            }
        }
    }

    // Добавляем метод создания эффекта ��ыстрела
    createShootEffect() {
        const muzzleFlash = {
            x: this.player.x + this.player.width/2,
            y: this.player.y,
            size: 15,
            lifetime: 0.1,
            time: 0,
            isFlash: true,
            alpha: 0.8,
            color: '#4ade80'
        };  // Добавляем точку с запятой
        
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

    // Добавляем метод создания босса
    createBoss() {
        // Выбираем тип босса в зависимости от сложности
        let availableBossTypes = ['basic'];
        
        if (this.difficulty >= 2) availableBossTypes.push('laser');
        if (this.difficulty >= 3) availableBossTypes.push('swarm');
        if (this.difficulty >= 4) availableBossTypes.push('tank');
        
        const bossType = availableBossTypes[Math.floor(Math.random() * availableBossTypes.length)];
        
        this.enemies = []; // Очищаем врагов
        
        this.bossConfig.boss = {
            ...bossType,
            x: this.canvas.width / 2 - bossType.width / 2,
            y: 50,
            health: bossType.maxHealth,
            lastShot: 0,
            currentPattern: 0
        };
        
        this.bossConfig.active = true;
        this.currentBossIndex++;
        
        // Создаем эффект появления босса
        this.createBossSpawnEffect();
        
        // Показываем имя босса
        this.showBossName(bossType.name);
    }

    // Добавим метод для отображения имени босса
    showBossName(name) {
        const bossNameDiv = document.createElement('div');
        bossNameDiv.style.position = 'absolute';
        bossNameDiv.style.top = '20%';
        bossNameDiv.style.left = '50%';
        bossNameDiv.style.transform = 'translate(-50%, -50%)';
        bossNameDiv.style.color = '#ffffff';
        bossNameDiv.style.fontSize = '24px';
        bossNameDiv.style.fontWeight = 'bold';
        bossNameDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        bossNameDiv.textContent = name;
        
        document.body.appendChild(bossNameDiv);
        
        // Удаляем элемент через 3 секунды
        setTimeout(() => {
            bossNameDiv.remove();
        }, 3000);
    }

    // Добавляем метод для эфекта появления босса
    createBossSpawnEffect() {
        const particles = 30;
        const colors = ['#dc2626', '#ef4444', '#ffffff'];
        
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            const speed = 150 + Math.random() * 100;
            
            this.particles.push({
                x: this.bossConfig.boss.x + this.bossConfig.boss.width / 2,
                y: this.bossConfig.boss.y + this.bossConfig.boss.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                lifetime: 1,
                time: 0
            });
        }
    }

    // Добавляем метод обновлени боса
    updateBoss(dt) {
        if (!this.bossConfig.active || !this.bossConfig.boss) return;
        
        const boss = this.bossConfig.boss;
        
        // Обновляем таймер стрельбы
        boss.lastShot += dt * 1000;
        
        // Стреляем, если прошло достаточно времени
        if (boss.lastShot >= boss.shootRate) {
            this.bossShooting(boss);
            boss.lastShot = 0;
        }
    }

    // Добавляем метод стрельбы босса с разными паттернам
    bossShooting(boss) {
        const pattern = boss.bulletPatterns[boss.currentPattern];
        
        switch(pattern) {
            // Базовые атаки
            case 'circle': this.bossCircleShot(boss); break;
            case 'spiral': this.bossSpiralShot(boss); break;
            case 'wave': this.bossWaveShot(boss); break;
            case 'cross': this.bossCrossShot(boss); break;
            
            // Лазерные атаки
            case 'laser': this.bossLaserShot(boss); break;
            case 'crossLaser': this.bossCrossLaserShot(boss); break;
            case 'spinningLaser': this.bossSpinningLaserShot(boss); break;
            
            // Атаки роя
            case 'swarm': this.bossSwarmShot(boss); break;
            case 'multiSwarm': this.bossMultiSwarmShot(boss); break;
            case 'chaosSwarm': this.bossChaosSwarmShot(boss); break;
            
            // Атаки танка
            case 'heavyShot': this.bossHeavyShot(boss); break;
            case 'artillery': this.bossArtilleryShot(boss); break;
            case 'bombard': this.bossBombardShot(boss); break;
        }
        
        // Меняем паттерн атаки
        boss.currentPattern = (boss.currentPattern + 1) % boss.bulletPatterns.length;
    }

    // Круговая атака
    bossCircleShot(boss) {
        const bulletCount = 16;
        const angleStep = (Math.PI * 2) / bulletCount;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = i * angleStep;
            const speedX = Math.cos(angle) * boss.bulletSpeed;
            const speedY = Math.sin(angle) * boss.bulletSpeed;
            
            this.createBossBullet(boss, speedX, speedY);
        }
    }

    // Спиральная атака
    bossSpiralShot(boss) {
        const bulletCount = 8;
        const spiralCount = 3; // Количество спиралей
        
        for (let i = 0; i < bulletCount; i++) {
            for (let j = 0; j < spiralCount; j++) {
                const angle = (i / bulletCount) * Math.PI * 2 + (j * (Math.PI * 2) / spiralCount);
                const speedX = Math.cos(angle) * boss.bulletSpeed;
                const speedY = Math.sin(angle) * boss.bulletSpeed;
                
                this.createBossBullet(boss, speedX, speedY);
            }
        }
    }

    // Волновая атака
    bossWaveShot(boss) {
        const bulletCount = 12;
        const waveAmplitude = 100;
        const waveFrequency = 0.2;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = -Math.PI/2 + (Math.PI / (bulletCount-1)) * i;
            const speedX = Math.cos(angle) * boss.bulletSpeed;
            const speedY = Math.sin(angle) * boss.bulletSpeed;
            
            this.createBossBullet(boss, speedX, speedY + Math.sin(i * waveFrequency) * waveAmplitude);
        }
    }

    // Крестообразная атака
    bossCrossShot(boss) {
        const directions = [
            {x: 1, y: 0}, {x: -1, y: 0},
            {x: 0, y: 1}, {x: 0, y: -1},
            {x: 1, y: 1}, {x: -1, y: -1},
            {x: 1, y: -1}, {x: -1, y: 1}
        ];
        
        directions.forEach(dir => {
            const speedX = dir.x * boss.bulletSpeed;
            const speedY = dir.y * boss.bulletSpeed;
            
            this.createBossBullet(boss, speedX, speedY);
        });
    }

    // Метод создания пули босса
    createBossBullet(boss, speedX, speedY, isHeavy = false) {
        this.enemyBullets.push({
            x: boss.x + boss.width/2,
            y: boss.y + boss.height/2,
            width: isHeavy ? 12 : 8,
            height: isHeavy ? 12 : 8,
            speedX: speedX,
            speedY: speedY,
            color: boss.color,
            damage: isHeavy ? boss.bulletDamage * 1.5 : boss.bulletDamage
        });  // Добавляем точку с запятой
    }

    // Добавим новые методы для атак лазерного босса
    bossLaserShot(boss) {
        // Прямо лазерный луч
        const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
        for(let i = 0; i < 5; i++) {
            const speedX = Math.cos(angle) * boss.bulletSpeed;
            const speedY = Math.sin(angle) * boss.bulletSpeed;
            setTimeout(() => {
                this.createBossBullet(boss, speedX, speedY);
            }, i * 100);
        }
    }

    bossCrossLaserShot(boss) {
        // Крестообразные лазерные лучи
        const angles = [0, Math.PI/2, Math.PI, Math.PI*3/2];
        angles.forEach(angle => {
            for(let i = 0; i < 3; i++) {
                const speedX = Math.cos(angle) * boss.bulletSpeed;
                const speedY = Math.sin(angle) * boss.bulletSpeed;
                setTimeout(() => {
                    this.createBossBullet(boss, speedX, speedY);
                }, i * 100);
            }
        });
    }

    bossSpinningLaserShot(boss) {
        // Вращающийся лазер
        const bulletCount = 8;
        const rotationSpeed = Math.PI / 32;
        let currentAngle = 0;
        
        const interval = setInterval(() => {
            if(!this.bossConfig.active) {
                clearInterval(interval);
                return;
            }
            
            for(let i = 0; i < bulletCount; i++) {
                const angle = currentAngle + (i * Math.PI * 2 / bulletCount);
                const speedX = Math.cos(angle) * boss.bulletSpeed;
                const speedY = Math.sin(angle) * boss.bulletSpeed;
                this.createBossBullet(boss, speedX, speedY);
            }
            
            currentAngle += rotationSpeed;
        }, 200);
        
        setTimeout(() => clearInterval(interval), 2000);
    }

    // Добавим методы для атак босса роя
    bossSwarmShot(boss) {
        // Выпускает группу маленьких пуль
        const bulletCount = 12;
        for(let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 * i / bulletCount) + Math.random() * 0.5;
            const speed = boss.bulletSpeed * (0.8 + Math.random() * 0.4);
            const speedX = Math.cos(angle) * speed;
            const speedY = Math.sin(angle) * speed;
            this.createBossBullet(boss, speedX, speedY);
        }
    }

    bossMultiSwarmShot(boss) {
        // Несколько волнов роя
        for(let wave = 0; wave < 3; wave++) {
            setTimeout(() => {
                this.bossSwarmShot(boss);
            }, wave * 300);
        }
    }

    bossChaosSwarmShot(boss) {
        // Хаотичная атака роем
        const bulletCount = 20;
        for(let i = 0; i < bulletCount; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const speed = boss.bulletSpeed * (0.6 + Math.random() * 0.8);
                const speedX = Math.cos(angle) * speed;
                const speedY = Math.sin(angle) * speed;
                this.createBossBullet(boss, speedX, speedY);
            }, i * 100);
        }
    }

    // Добавим методы для атак танка-босса
    bossHeavyShot(boss) {
        // Мощный одиночный выстрел
        const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
        const speedX = Math.cos(angle) * boss.bulletSpeed * 1.5;
        const speedY = Math.sin(angle) * boss.bulletSpeed * 1.5;
        
        this.createBossBullet(boss, speedX, speedY, true); // true для увеличенного урона
    }

    bossArtilleryShot(boss) {
        // Залп снарядов по дуге
        const bulletCount = 5;
        for(let i = 0; i < bulletCount; i++) {
            const angle = -Math.PI/3 + (Math.PI/3 * 2 * i/(bulletCount-1));
            const speedX = Math.cos(angle) * boss.bulletSpeed;
            const speedY = Math.sin(angle) * boss.bulletSpeed;
            this.createBossBullet(boss, speedX, speedY);
        }
    }

    bossBombardShot(boss) {
        // Бомбардировка области
        const targetX = this.player.x;
        const targetY = this.player.y;
        
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                const spread = 100;
                const offsetX = (Math.random() - 0.5) * spread;
                const offsetY = (Math.random() - 0.5) * spread;
                const angle = Math.atan2(targetY + offsetY - boss.y, targetX + offsetX - boss.x);
                const speedX = Math.cos(angle) * boss.bulletSpeed;
                const speedY = Math.sin(angle) * boss.bulletSpeed;
                this.createBossBullet(boss, speedX, speedY);
            }, i * 200);
        }
    }

    // Добавим новый метод для создания частиц двигателя противников
    createEnemyEngineParticles(enemy) {
        let enginePositions;
        let particleConfig;

        // Определяем конфигурацию в зависимости от типа врага
        switch(enemy.type) {
            case 'basic':
                enginePositions = [
                    { x: enemy.x + enemy.width * 0.30, y: enemy.y + 5 },
                    { x: enemy.x + enemy.width * 0.40, y: enemy.y + 5 },
                    { x: enemy.x + enemy.width * 0.50, y: enemy.y + 5 },
                    { x: enemy.x + enemy.width * 0.60, y: enemy.y + 5 }
                ];
                particleConfig = {
                    count: 1,
                    baseSpeed: -80,
                    size: { min: 1, max: 2 },
                    lifetime: { min: 0.1, max: 0.2 }
                };
                break;

            case 'shooter':
                enginePositions = [
                    { x: enemy.x + enemy.width * 0.4, y: enemy.y + 5 },
                    { x: enemy.x + enemy.width * 0.6, y: enemy.y + 5 }
                ];
                particleConfig = {
                    count: 2,
                    baseSpeed: -120,
                    size: { min: 2, max: 3 },
                    lifetime: { min: 0.2, max: 0.3 }
                };
                break;

            case 'boss':
                enginePositions = [
                    { x: enemy.x + enemy.width * 0.5, y: enemy.y + 5 }
                ];
                particleConfig = {
                    count: 4,
                    baseSpeed: -150,
                    size: { min: 3, max: 5 },
                    lifetime: { min: 0.3, max: 0.4 }
                };
                break;

            // Добавляем конфигурацию по умолчанию для всех остальн типов
            default:
                enginePositions = [
                    { x: enemy.x + enemy.width * 0.5, y: enemy.y + 5 }
                ];
                particleConfig = {
                    count: 1,
                    baseSpeed: -100,
                    size: { min: 1.5, max: 2.5 },
                    lifetime: { min: 0.15, max: 0.25 }
                };
                break;
        }

        // Создаем частицы для каждой позиции двигателя
        enginePositions.forEach(pos => {
            for (let i = 0; i < particleConfig.count; i++) {
                const spread = (Math.random() - 0.5) * 4;
                const size = particleConfig.size.min + Math.random() * (particleConfig.size.max - particleConfig.size.min);
                const lifetime = particleConfig.lifetime.min + Math.random() * (particleConfig.lifetime.max - particleConfig.lifetime.min);
                
                this.enemyEngineParticles.push({
                    x: pos.x + spread,
                    y: pos.y,
                    vx: (Math.random() - 0.5) * 15,
                    vy: particleConfig.baseSpeed - Math.random() * 50,
                    size: size,
                    lifetime: lifetime,
                    time: 0,
                    color: enemy.color,
                    type: enemy.type
                });
            }
        });
    }

    // Добавим метод обновления частиц двигателей противников
    updateEnemyEngineParticles(dt) {
        this.enemyEngineParticles = this.enemyEngineParticles.filter(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.time += dt;
            particle.size -= dt * 3;
            return particle.time < particle.lifetime && particle.size > 0;
        });

        // Создаем овые частицы для каждого противника
        if (this.gameState === 'playing') {
            this.enemies.forEach(enemy => {
                this.createEnemyEngineParticles(enemy);
            });
        }
    }

    updateSwarmBehavior(enemy) {
        // Находим ближайших врагов
        const nearbyEnemies = this.enemies.filter(other => {
            if (other === enemy) return false;
            const dx = other.x - enemy.x;
            const dy = other.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < 150; // Радиус роя
        });

        if (nearbyEnemies.length > 0) {
            // Вычисляем среднюю позицию роя
            let centerX = 0;
            let centerY = 0;
            nearbyEnemies.forEach(other => {
                centerX += other.x;
                centerY += other.y;
            });
            centerX /= nearbyEnemies.length;
            centerY /= nearbyEnemies.length;

            // Двигаемся к центру роя
            const dx = centerX - enemy.x;
            const dy = centerY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed * this.deltaTime * 0.5;
                enemy.y += (dy / distance) * enemy.speed * this.deltaTime * 0.5;
            }
        } else {
            // Если нет ближайших врагов, двигаемся вниз
            enemy.y += enemy.speed * this.deltaTime;
        }
    }

    updateDroneBehavior(enemy) {
        // Дроны двигаются зигзагом и следуют за игроком
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        enemy.time += this.deltaTime;
        
        // Добавляем зигзагообразное движение
        const zigzag = Math.sin(enemy.time * 5) * 50;
        
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed * this.deltaTime + zigzag * this.deltaTime;
            enemy.y += (dy / distance) * enemy.speed * this.deltaTime;
        }
    }

    updateStealthBehavior(enemy) {
        // Стелс-враги периодически становятся полупрозрачными
        enemy.time += this.deltaTime;
        enemy.alpha = 0.3 + Math.abs(Math.sin(enemy.time * 2)) * 0.7;
        
        // Прямое движение вниз
        enemy.y += enemy.speed * this.deltaTime;
    }

    healNearbyEnemies(healer) {
        const healRadius = 100;
        const healAmount = 1;
        
        this.enemies.forEach(enemy => {
            if (enemy !== healer) {
                const dx = enemy.x - healer.x;
                const dy = enemy.y - healer.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < healRadius) {
                    const maxHealth = this.enemyTypes[enemy.type].health;
                    enemy.health = Math.min(enemy.health + healAmount * this.deltaTime, maxHealth);
                    this.createHealEffect(enemy);
                }
            }
        });
    }

    updateKamikazeBehavior(enemy) {
        // Камикадзе быстро движутся к игроку
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed * this.deltaTime;
            enemy.y += (dy / distance) * enemy.speed * this.deltaTime;
        }
    }

    createHealEffect(enemy) {
        // Создаем зеленые частицы вокруг врага
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            this.particles.push({
                x: enemy.x + enemy.width / 2 + Math.cos(angle) * 20,
                y: enemy.y + enemy.height / 2 + Math.sin(angle) * 20,
                vx: Math.cos(angle) * 50,
                vy: Math.sin(angle) * 50,
                size: 4,
                color: '#34d399',
                lifetime: 0.5,
                time: 0
            });
        }
    }

    handleEnemyDestruction(enemy) {
        if (!enemy || !enemy.type || !this.enemyTypes[enemy.type]) {
            console.error('Invalid enemy object:', enemy);
            return;
        }
        
        const points = parseInt(this.enemyTypes[enemy.type].points) || 0;
        console.log('Enemy destroyed:', {
            type: enemy.type,
            points: points,
            currentScore: this.score
        });
        
        this.updateScore(points);
        this.createDestroyEffect(enemy);
    }

    updateBulletCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (this.checkCollision(bullet, enemy)) {
                    console.log('Bullet hit enemy:', {
                        enemyType: enemy.type,
                        enemyHealth: enemy.health,
                        bulletDamage: bullet.damage
                    });
                    
                    // Удаляем пулю
                    this.bullets.splice(i, 1);
                    
                    // Уменьшаем здоровье врага
                    enemy.health -= bullet.damage || 1;
                    
                    console.log('Enemy health after hit:', enemy.health);
                    
                    // Если враг уничтожен
                    if (enemy.health <= 0) {
                        console.log('Enemy destroyed, getting points:', {
                            enemyType: enemy.type,
                            points: this.enemyTypes[enemy.type].points
                        });
                        
                        const points = parseInt(this.enemyTypes[enemy.type].points) || 0;
                        const oldScore = this.score;
                        
                        this.updateScore(points);
                        
                        console.log('Score after update:', {
                            oldScore: oldScore,
                            addedPoints: points,
                            newScore: this.score
                        });
                        
                        this.enemies.splice(j, 1);
                        this.createDestroyEffect(enemy);
                    }
                    
                    break;
                }
            }
        }
    }

    // Добавляем метод для безопасного обновления счета
    updateScore(points) {
        console.log('UpdateScore called with points:', points);
        
        // Проверяем типы
        if (typeof this.score !== 'number') {
            console.warn('Score was not a number:', this.score);
            this.score = 0;
        }
        
        if (typeof points !== 'number') {
            console.warn('Points was not a number:', points);
            points = parseInt(points) || 0;
        }
        
        // Обновляем счет
        this.score += points;
        
        // Проверяем результат
        if (isNaN(this.score)) {
            console.error('Score became NaN!');
            this.score = 0;
        }
        
        console.log('Score updated:', {
            points: points,
            newScore: this.score,
            scoreElement: this.scoreElement,
            scoreElementExists: !!this.scoreElement
        });
        
        // Обновляем отображение
        if (this.scoreElement) {
            this.scoreElement.textContent = Math.round(this.score);
            console.log('Score display updated:', this.scoreElement.textContent);
        } else {
            console.error('Score element not found!');
        }
        
        return this.score;
    }

    // Добавим метод для показа уведомлений
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
} // Закрывающая скобка класса

// Создание экземпляра игры при загрузке страницы
window.addEventListener('load', () => {
    new ArcadeCollector();
}); // Добавляем точку с запятой