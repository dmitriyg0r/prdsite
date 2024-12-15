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

const player = {
    x: mapSize / 2,
    y: mapSize / 2,
    radius: 20,
    color: '#3498db',
    score: 0,
    speed: 3,
    velocityX: 0,
    velocityY: 0,
    acceleration: 0.5,
    friction: 0.95
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
        velocityY: 0
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
    camera.zoom = 1 / (player.radius / 20);
}

function worldToScreen(x, y) {
    return {
        x: (x - camera.x) * camera.zoom,
        y: (y - camera.y) * camera.zoom
    };
}

function updatePlayer() {
    // Обновление скорости на основе нажатых клавиш
    if (keys.w) player.velocityY -= player.acceleration;
    if (keys.s) player.velocityY += player.acceleration;
    if (keys.a) player.velocityX -= player.acceleration;
    if (keys.d) player.velocityX += player.acceleration;
    
    // Применяем трение
    player.velocityX *= player.friction;
    player.velocityY *= player.friction;
    
    // Обновляем позицию
    player.x = Math.max(player.radius, Math.min(mapSize - player.radius, player.x + player.velocityX));
    player.y = Math.max(player.radius, Math.min(mapSize - player.radius, player.y + player.velocityY));
}

function updateBots() {
    bots.forEach(bot => {
        // Простой ИИ для ботов
        const angle = Math.random() * Math.PI * 2;
        bot.velocityX = Math.cos(angle) * 2;
        bot.velocityY = Math.sin(angle) * 2;
        
        bot.x = Math.max(bot.radius, Math.min(mapSize - bot.radius, bot.x + bot.velocityX));
        bot.y = Math.max(bot.radius, Math.min(mapSize - bot.radius, bot.y + bot.velocityY));
        
        // Проверка столкновений с игроком
        const dx = player.x - bot.x;
        const dy = player.y - bot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + bot.radius) {
            if (player.radius > bot.radius * 1.1) {
                player.radius += bot.radius / 4;
                player.score += Math.floor(bot.radius);
                bots.splice(bots.indexOf(bot), 1);
                bots.push(createBot());
            } else if (bot.radius > player.radius * 1.1) {
                // Игра окончена
                gameOver();
            }
        }
    });
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updatePlayer();
    updateBots();
    updateCamera();
    
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    // Отрисовка границы карты
    ctx.strokeStyle = 'white';
    ctx.strokeRect(0, 0, mapSize, mapSize);
    
    // Отрисовка еды
    foods.forEach((food, i) => {
        drawCircle(food.x, food.y, food.radius, food.color);
    });
    
    // Отрисовка ботов
    bots.forEach(bot => {
        drawCircle(bot.x, bot.y, bot.radius, bot.color);
    });
    
    // Отрисовка игрока
    drawCircle(player.x, player.y, player.radius, player.color);
    
    ctx.restore();
    
    scoreElement.textContent = player.score;
    
    requestAnimationFrame(update);
}

// Event listeners for WASD keys
window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = true;
    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 's' || e.key === 'S') keys.s = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
});

player.speed = 5 / (player.radius / 20);

function gameOver() {
    alert(`Игра окончена! Ваш счет: ${player.score}`);
    // Сброс игры
    player.x = mapSize / 2;
    player.y = mapSize / 2;
    player.radius = 20;
    player.score = 0;
    bots.length = 0;
    for (let i = 0; i < botCount; i++) {
        bots.push(createBot());
    }
}

update();

