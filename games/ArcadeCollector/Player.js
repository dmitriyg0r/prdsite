export class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 40;
        this.height = 40;
        
        // Начальная позиция игрока (центр нижней части экрана)
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        
        // Параметры движения
        this.speed = 300;
        this.dx = 0;
        this.dy = 0;
        
        // Состояние клавиш
        this.keys = {
            'ArrowLeft': false,
            'ArrowRight': false,
            'ArrowUp': false,
            'ArrowDown': false,
            'Space': false,
            'Escape': false
        };
        
        // Параметры игрока
        this.lives = 3;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 2000; // 2 секунды
        this.invulnerabilityTimer = 0;
    }

    update(dt) {
        // Обновление таймера неуязвимости
        if (this.isInvulnerable) {
            this.invulnerabilityTimer += dt;
            if (this.invulnerabilityTimer >= this.invulnerabilityTime) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }

        // Сброс скорости
        this.dx = 0;
        this.dy = 0;

        // Обработка движения
        if (this.keys['ArrowLeft']) this.dx = -this.speed;
        if (this.keys['ArrowRight']) this.dx = this.speed;
        if (this.keys['ArrowUp']) this.dy = -this.speed;
        if (this.keys['ArrowDown']) this.dy = this.speed;

        // Применение движения с учетом deltaTime
        this.x += this.dx * (dt / 1000);
        this.y += this.dy * (dt / 1000);

        // Ограничение движения в пределах canvas
        this.x = Math.max(0, Math.min(this.x, this.canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, this.canvas.height - this.height));
    }

    hit() {
        if (!this.isInvulnerable) {
            this.lives--;
            this.isInvulnerable = true;
            this.invulnerabilityTimer = 0;
            return true;
        }
        return false;
    }

    reset() {
        this.x = this.canvas.width / 2 - this.width / 2;
        this.y = this.canvas.height - this.height - 20;
        this.lives = 3;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
    }
} 