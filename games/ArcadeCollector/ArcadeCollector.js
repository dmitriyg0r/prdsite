import { Player } from './Player.js';
import { EnemyManager } from './Enemy.js';
import { BulletManager } from './Bullet.js';
import { ParticleSystem } from './Particle.js';
import { GameState } from './GameState.js';
import { Renderer } from './Renderer.js';
import { Utils } from './Utils.js';

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
        
        this.bindEvents();
        this.lastTime = performance.now();
        this.animate(this.lastTime);
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

        if (this.gameState.isPlaying()) {
            this.update(this.deltaTime);
            this.renderer.draw(this);
        } else if (this.gameState.isStartScreen()) {
            this.renderer.drawStartScreen(this.canvas);
        }

        requestAnimationFrame((time) => this.animate(time));
    }

    update(dt) {
        if (!this.gameState.isPlaying()) return;
        
        this.gameState.updateDifficulty(dt);
        this.player.update(dt);
        this.enemyManager.update(dt, this);
        this.bulletManager.update(dt, this);
        this.particleSystem.update(dt);
    }

    bindEvents() {
        // Основные обработчики событий
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // UI обработчики
        document.getElementById('resumeBtn').addEventListener('click', () => this.gameState.resumeGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.gameState.restartGame(this));
        document.getElementById('playAgainBtn').addEventListener('click', () => this.gameState.restartGame(this));
    }

    handleKeyDown(e) {
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
        
        if (this.player.keys.hasOwnProperty(e.code)) {
            this.player.keys[e.code] = true;
            if (e.code === 'Escape') this.gameState.togglePause();
            if (e.code === 'Space' && this.gameState.isStartScreen()) {
                this.gameState.startGame(this);
            }
        }
    }

    handleKeyUp(e) {
        if (this.player.keys.hasOwnProperty(e.code)) {
            this.player.keys[e.code] = false;
        }
    }
}

// Создание экземпляра игры при загрузке страницы
window.addEventListener('load', () => {
    new ArcadeCollector();
}); 