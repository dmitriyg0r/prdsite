export class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 30;
        this.height = 30;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 300;
        this.lives = 3;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 2000; // 2 секунды неуязвимости после попадания
        this.invulnerabilityTimer = 0;
        this.keys = {};
    }

    update(dt) {
        // Обновление неуязвимости
        if (this.isInvulnerable) {
            this.invulnerabilityTimer += dt;
            if (this.invulnerabilityTimer >= this.invulnerabilityTime) {
                this.isInvulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }

        // Движение
        if (this.keys['ArrowLeft']) {
            this.x -= this.speed * (dt / 1000);
        }
        if (this.keys['ArrowRight']) {
            this.x += this.speed * (dt / 1000);
        }
        if (this.keys['ArrowUp']) {
            this.y -= this.speed * (dt / 1000);
        }
        if (this.keys['ArrowDown']) {
            this.y += this.speed * (dt / 1000);
        }

        // Ограничение движения в пределах canvas
        this.x = Math.max(0, Math.min(this.x, this.canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, this.canvas.height - this.height));
    }

    hit() {
        if (this.isInvulnerable) return false;
        
        this.lives--;
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 0;
        return true;
    }

    reset() {
        this.x = this.canvas.width / 2 - this.width / 2;
        this.y = this.canvas.height - this.height - 10;
        this.lives = 3;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.keys = {};
    }
} 