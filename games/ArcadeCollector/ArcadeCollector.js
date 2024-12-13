import { GameState } from './GameState.js';
import { Player } from './Player.js';
import { EnemyManager } from './Enemy.js';
import { BulletManager } from './Bullet.js';
import { Bullet } from './Bullet.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Renderer } from './Renderer.js';

class ArcadeCollector {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Инициализация менеджеров
        this.gameState = new GameState();
        this.player = new Player(this.canvas);
        this.enemyManager = new EnemyManager();
        this.bulletManager = new BulletManager();
        this.particleSystem = new ParticleSystem();
        this.renderer = new Renderer(this.ctx);
        
        // UI элементы
        this.initializeUI();
        
        // Добавим вывод для отладки
        console.log('Game initialized');
        
        this.shootCooldown = 250; // Задержка между выстрелами (в миллисекундах)
        this.lastShootTime = 0;
        
        this.bindEvents();
        this.lastTime = performance.now();
        this.animate(this.lastTime);
        
        // Добавляем обработчик для включения/выключения режима отладки
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyD') {
                this.renderer.debugMode = !this.renderer.debugMode;
            }
        });
    }

    initializeUI() {
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.pauseMenu = document.getElementById('pauseMenu');
        this.gameOverMenu = document.getElementById('gameOverMenu');
        this.finalScoreElement = document.getElementById('finalScore');
        this.startMenu = document.getElementById('startMenu');
    }

    animate(currentTime) {
        this.deltaTime = Utils.calculateDeltaTime(currentTime, this.lastTime);
        this.lastTime = currentTime;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Добавим вывод состояния для отладки
        console.log('Game state:', this.gameState.state);

        if (this.gameState.isPlaying()) {
            this.update(this.deltaTime);
            this.renderer.draw(this);
        } else if (this.gameState.isStartScreen()) {
            this.renderer.drawStartScreen(this.canvas);
        }

        requestAnimationFrame((time) => this.animate(time));
    }

    update(dt) {
        if (!this.gameState.isPlaying()) {
            console.log('Game is not in playing state');
            return;
        }
        
        this.gameState.updateDifficulty(dt);
        this.player.update(dt);
        this.enemyManager.update(dt, this);
        this.bulletManager.update(dt, this);
        this.particleSystem.update(dt);

        // Проверяем нажатие пробела для стрельбы
        if (this.player.keys['Space']) {
            this.tryShoot();
        }
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            // Обработка нажатий клавиш
            if (this.gameState.isPlaying()) {
                if (e.code === 'Space' && !this.player.keys['Space']) {
                    this.player.keys['Space'] = true;
                    this.tryShoot();
                }
            } else if (this.gameState.isStartScreen() && e.code === 'Space') {
                this.gameState.startGame(this);
            }

            // Добавляем остальные клавиши управления
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
                this.player.keys[e.code] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
                this.player.keys[e.code] = false;
            }
        });
    }

    tryShoot() {
        const currentTime = performance.now();
        if (currentTime - this.lastShootTime >= this.shootCooldown) {
            // Создаем новую пулю
            const bullet = new Bullet(
                this.player.x + this.player.width/2 - 2.5,
                this.player.y,
                400
            );
            this.bulletManager.addBullet(bullet);
            this.lastShootTime = currentTime;
        }
    }
}

// Создание экземпляра игры при загрузке страницы
window.addEventListener('load', () => {
    new ArcadeCollector();
}); 