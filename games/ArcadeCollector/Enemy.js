export class Enemy {
    constructor(canvas, x, y, type = 'basic') {
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Базовые параметры противника
        this.width = 30;
        this.height = 30;
        this.speed = 150;
        this.points = 100;
        
        // Настройка параметров в зависимости от типа
        this.setupType();
    }

    setupType() {
        switch(this.type) {
            case 'fast':
                this.speed = 250;
                this.points = 150;
                this.width = 25;
                this.height = 25;
                break;
            case 'tank':
                this.speed = 100;
                this.points = 200;
                this.width = 40;
                this.height = 40;
                break;
            default: // basic
                break;
        }
    }

    update(dt) {
        this.y += this.speed * (dt / 1000);
    }

    isOffScreen() {
        return this.y > this.canvas.height;
    }
}

export class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1000; // 1 секунда
        this.enemyTypes = ['basic', 'fast', 'tank'];
    }

    update(dt, game) {
        // Обновление таймера спавна
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnEnemy(game.canvas, game.gameState.difficulty);
            this.spawnTimer = 0;
            // Уменьшаем интервал спавна с ростом сложности
            this.spawnInterval = Math.max(300, 1000 - (game.gameState.difficulty * 50));
        }

        // Обновление существующих противников
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt);

            // Удаление противников, вышедших за пределы экрана
            if (enemy.isOffScreen()) {
                this.enemies.splice(i, 1);
                game.player.hit(); // Игрок теряет жизнь
                game.gameState.updateUI(game);
                
                if (game.player.lives <= 0) {
                    game.gameState.gameOver(game);
                }
            }
        }
    }

    spawnEnemy(canvas, difficulty) {
        // Выбор типа противника
        let type = 'basic';
        const rand = Math.random();
        if (difficulty >= 2) {
            if (rand < 0.3) type = 'fast';
            else if (rand < 0.5) type = 'tank';
        }

        // Случайная позиция по X
        const x = Math.random() * (canvas.width - 30);
        const enemy = new Enemy(canvas, x, -30, type);
        this.enemies.push(enemy);
    }

    reset() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1000;
    }
} 