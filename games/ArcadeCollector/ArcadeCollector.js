import { GameState } from './GameState.js';
import { Player } from './Player.js';
import { EnemyManager } from './Enemy.js';
import { BulletManager, Bullet } from './Bullet.js';
import { ParticleSystem } from './Particle.js';
import { Renderer } from './Renderer.js';

class ArcadeCollector {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Инициализация игровых объектов
        this.gameState = new GameState();
        this.player = new Player(this.canvas);
        this.enemyManager = new EnemyManager();
        this.bulletManager = new BulletManager();
        this.particleSystem = new ParticleSystem();
        this.renderer = new Renderer(this.ctx);
        
        // Параметры стрельбы
        this.shootCooldown = 250;
        this.lastShootTime = 0;
        
        // Параметры времени
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.timestep = 1000 / 60; // 60 FPS фиксированный шаг
        
        console.log('Game initialized');
        
        // Предотвращаем прокрутку страницы
        window.addEventListener('keydown', (e) => {
            if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        }, false);
        
        this.bindEvents();
        this.animate();
    }

    animate(currentTime = performance.now()) {
        // Расчет дельты времени
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Накапливаем время
        this.accumulator += deltaTime;
        
        // Обновляем игру с фиксированным шагом
        while (this.accumulator >= this.timestep) {
            if (this.gameState.isPlaying()) {
                this.update(this.timestep);
            }
            this.accumulator -= this.timestep;
        }
        
        // Рендерим с текущей частотой кадров
        if (this.gameState.isPlaying()) {
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

        if (this.player.keys['Space']) {
            this.tryShoot();
        }
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            // Предотвращаем действия по умолчанию для игровых клавиш
            if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            
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
            // Сздаем новую пулю
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

// Создаем и экспортируем экземпляр игры
const game = new ArcadeCollector();
export default game; 