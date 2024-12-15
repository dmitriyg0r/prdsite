const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

const mapSize = 4000;
const camera = {
    x: 0,
    y: 0,
    zoom: 1
};

const game = {
    state: 'playing',
    minFoodSize: 4,
    maxFoodSize: 8,
    foodColors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    backgroundColor: '#000000',
    gridSize: 50,
    powerUps: []
};

const player = {
    x: mapSize / 2,
    y: mapSize / 2,
    radius: 20,
    color: '#3498db',
    score: 0,
    speed: 3,
    velocityX: 0,
    velocityY: 0,
    acceleration: 0.2,
    friction: 0.98,
    name: 'Player',
    level: 1,
    experience: 0,
    maxExperience: 100,
    abilities: {
        dash: {
            active: false,
            cooldown: 5000,
            lastUsed: 0
        },
        shield: {
            active: false,
            duration: 3000,
            cooldown: 10000,
            lastUsed: 0
        }
    }
};

const foods = [];
const foodCount = 500;

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

const bots = [];
const botCount = 10;

const particles = [];

function createFood() {
    return {
        x: Math.random() * mapSize,
        y: Math.random() * mapSize,
        radius: 5 + Math.random() * 5,
        color: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
    };
}

for (let i = 0; i < foodCount; i++) {
    foods.push(createFood());
}

function createBot() {
    return {
        x: Math.random() * mapSize,
        y: Math.random() * mapSize,
        radius: 20 + Math.random() * 30,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        velocityX: 0,
        velocityY: 0,
        target: null,
        state: 'wandering',
        name: `Bot ${Math.floor(Math.random() * 1000)}`
    };
}

for (let i = 0; i < botCount; i++) {
    bots.push(createBot());
}

function drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

function updateCamera() {
    camera.x = player.x - canvas.width / 2 / camera.zoom;
    camera.y = player.y - canvas.height / 2 / camera.zoom;
    camera.zoom = 1 / (player.radius / 40);
}

function worldToScreen(x, y) {
    return {
        x: (x - camera.x) * camera.zoom,
        y: (y - camera.y) * camera.zoom
    };
}

function updatePlayer() {
    const maxSpeed = player.speed / (player.radius / 20);
    
    if (keys.w) player.velocityY -= player.acceleration;
    if (keys.s) player.velocityY += player.acceleration;
    if (keys.a) player.velocityX -= player.acceleration;
    if (keys.d) player.velocityX += player.acceleration;
    
    const currentSpeed = Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY);
    if (currentSpeed > maxSpeed) {
        const ratio = maxSpeed / currentSpeed;
        player.velocityX *= ratio;
        player.velocityY *= ratio;
    }
    
    player.velocityX *= player.friction;
    player.velocityY *= player.friction;
    
    player.x = Math.max(player.radius, Math.min(mapSize - player.radius, player.x + player.velocityX));
    player.y = Math.max(player.radius, Math.min(mapSize - player.radius, player.y + player.velocityY));
}

function updateBots() {
    bots.forEach(bot => {
        const distanceToPlayer = Math.hypot(player.x - bot.x, player.y - bot.y);
        
        if (distanceToPlayer < 300) {
            if (bot.radius > player.radius * 1.2) {
                bot.state = 'hunting';
                bot.target = player;
            } else if (bot.radius * 1.2 < player.radius) {
                bot.state = 'fleeing';
                bot.target = player;
            }
        } else {
            bot.state = 'wandering';
        }
        
        switch (bot.state) {
            case 'hunting':
                if (bot.target) {
                    const angle = Math.atan2(bot.target.y - bot.y, bot.target.x - bot.x);
                    bot.velocityX += Math.cos(angle) * 0.2;
                    bot.velocityY += Math.sin(angle) * 0.2;
                }
                break;
                
            case 'fleeing':
                if (bot.target) {
                    const angle = Math.atan2(bot.target.y - bot.y, bot.target.x - bot.x);
                    bot.velocityX -= Math.cos(angle) * 0.3;
                    bot.velocityY -= Math.sin(angle) * 0.3;
                }
                break;
                
            case 'wandering':
                let nearestFood = null;
                let minDistance = Infinity;
                
                foods.forEach(food => {
                    const dist = Math.hypot(food.x - bot.x, food.y - bot.y);
                    if (dist < minDistance && dist < 200) {
                        minDistance = dist;
                        nearestFood = food;
                    }
                });
                
                if (nearestFood) {
                    const angle = Math.atan2(nearestFood.y - bot.y, nearestFood.x - bot.x);
                    bot.velocityX += Math.cos(angle) * 0.1;
                    bot.velocityY += Math.sin(angle) * 0.1;
                }
                break;
        }
        
        const maxSpeed = 2 / (bot.radius / 20);
        const speed = Math.hypot(bot.velocityX, bot.velocityY);
        if (speed > maxSpeed) {
            const ratio = maxSpeed / speed;
            bot.velocityX *= ratio;
            bot.velocityY *= ratio;
        }
        
        bot.velocityX *= 0.98;
        bot.velocityY *= 0.98;
        
        bot.x = Math.max(bot.radius, Math.min(mapSize - bot.radius, bot.x + bot.velocityX));
        bot.y = Math.max(bot.radius, Math.min(mapSize - bot.radius, bot.y + bot.velocityY));
        
        foods.forEach((food, index) => {
            const dx = bot.x - food.x;
            const dy = bot.y - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bot.radius + food.radius) {
                bot.radius += food.radius * 0.1;
                foods.splice(index, 1);
                foods.push(createFood());
            }
        });
    });
}

function createParticle(x, y, color) {
    return {
        x: x,
        y: y,
        color: color,
        velocity: {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2
        },
        life: 1,
        decay: 0.02
    };
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        particle.life -= particle.decay;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.globalAlpha = particle.life;
        drawCircle(particle.x, particle.y, 3, particle.color);
        ctx.globalAlpha = 1;
    });
}

function createPowerUp() {
    const types = ['speed', 'size', 'shield'];
    return {
        x: Math.random() * mapSize,
        y: Math.random() * mapSize,
        radius: 15,
        type: types[Math.floor(Math.random() * types.length)],
        color: '#ffff00'
    };
}

setInterval(() => {
    if (game.powerUps.length < 5) {
        game.powerUps.push(createPowerUp());
    }
}, 10000);

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    for (let i = 0; i <= mapSize; i += game.gridSize) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, mapSize);
        ctx.moveTo(0, i);
        ctx.lineTo(mapSize, i);
    }
    ctx.stroke();
}

function update() {
    if (game.state !== 'playing') return;
    
    ctx.fillStyle = game.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    updatePlayer();
    checkFoodCollisions();
    checkBotCollisions();
    updateBots();
    updateCamera();
    updateParticles();
    
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    drawGrid();
    
    game.powerUps.forEach(powerUp => {
        drawCircle(powerUp.x, powerUp.y, powerUp.radius, powerUp.color);
    });
    
    foods.forEach(food => {
        drawCircle(food.x, food.y, food.radius, food.color);
    });
    
    bots.forEach(bot => {
        drawCircle(bot.x, bot.y, bot.radius, bot.color);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 5);
    });
    
    drawCircle(player.x, player.y, player.radius, player.color);
    if (player.abilities.shield.active) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawParticles();
    
    ctx.restore();
    
    drawUI();
    
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${player.score}`, 10, 30);
    ctx.fillText(`Level: ${player.level}`, 10, 60);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(10, 70, 200, 10);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(10, 70, (player.experience / player.maxExperience) * 200, 10);
    
    drawAbilityCooldown('Dash (Space)', player.abilities.dash, 10, 90);
    drawAbilityCooldown('Shield (Q)', player.abilities.shield, 10, 120);
}

function drawAbilityCooldown(name, ability, x, y) {
    const now = Date.now();
    const cooldownLeft = Math.max(0, ability.cooldown - (now - ability.lastUsed));
    ctx.fillStyle = cooldownLeft > 0 ? 'red' : 'green';
    ctx.fillText(`${name}: ${Math.ceil(cooldownLeft / 1000)}s`, x, y);
}

window.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case ' ':
            if (Date.now() - player.abilities.dash.lastUsed >= player.abilities.dash.cooldown) {
                player.velocityX *= 2;
                player.velocityY *= 2;
                player.abilities.dash.lastUsed = Date.now();
            }
            break;
        case 'q':
            if (Date.now() - player.abilities.shield.lastUsed >= player.abilities.shield.cooldown) {
                player.abilities.shield.active = true;
                player.abilities.shield.lastUsed = Date.now();
                setTimeout(() => {
                    player.abilities.shield.active = false;
                }, player.abilities.shield.duration);
            }
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
    }
});

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

player.speed = 5 / (player.radius / 20);

function gameOver() {
    game.state = 'ended';
    const finalScore = player.score;
    setTimeout(() => {
        if (confirm(`Игра окончена! Ваш счет: ${finalScore}. Хотите начать заново?`)) {
            resetGame();
        }
    }, 100);
}

function resetGame() {
    game.state = 'playing';
    player.x = mapSize / 2;
    player.y = mapSize / 2;
    player.radius = 20;
    player.score = 0;
    player.level = 1;
    player.experience = 0;
    bots.length = 0;
    for (let i = 0; i < botCount; i++) {
        bots.push(createBot());
    }
}

function checkFoodCollisions() {
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        const dx = player.x - food.x;
        const dy = player.y - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + food.radius) {
            for (let j = 0; j < 3; j++) {
                particles.push(createParticle(food.x, food.y, food.color));
            }
            
            player.radius += food.radius * 0.1;
            player.score += Math.floor(food.radius);
            player.experience += Math.floor(food.radius);
            
            if (player.experience >= player.maxExperience) {
                player.level++;
                player.experience = 0;
                player.maxExperience *= 1.2;
            }
            
            foods.splice(i, 1);
            foods.push(createFood());
        }
    }
}

function checkBotCollisions() {
    for (let i = bots.length - 1; i >= 0; i--) {
        const bot = bots[i];
        const dx = player.x - bot.x;
        const dy = player.y - bot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + bot.radius) {
            if (player.radius > bot.radius * 1.1) {
                // Игрок поглощает бота
                player.radius += bot.radius * 0.3;
                player.score += Math.floor(bot.radius);
                bots.splice(i, 1);
                bots.push(createBot());
            } else if (bot.radius > player.radius * 1.1) {
                // Бот поглощ��ет игрока
                gameOver();
            }
        }
    }
}

update();

