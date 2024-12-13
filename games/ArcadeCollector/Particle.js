export class Particle {
    constructor(x, y, color = '#FFA500') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 5;
        this.speedY = (Math.random() - 0.5) * 5;
        this.lifetime = 1000; // время жизни в миллисекундах
        this.age = 0;
    }

    update(dt) {
        this.x += this.speedX;
        this.y += this.speedY;
        this.age += dt;
        this.opacity = 1 - (this.age / this.lifetime);
    }

    isDead() {
        return this.age >= this.lifetime;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(dt);
            
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    createExplosion(x, y, particleCount = 15) {
        const colors = ['#FFA500', '#FF4500', '#FFD700'];
        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, color));
        }
    }

    reset() {
        this.particles = [];
    }
} 