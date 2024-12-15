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
    started: false,
    paused: false
};

const player = {
    name: '',
    x: mapSize / 2,
    y: mapSize / 2,
    radius: 20,
    color: '#3498db',
    score: 0,
    speed: 3
};

const foods = [];
const foodCount = 500;

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

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

function startGame() {
    console.log('Функция startGame вызвана');
    const playerName = document.getElementById('playerName').value;
    player.name = playerName || 'Player';
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    game.started = true;
}

function drawMinimap() {
    const minimap = document.getElementById('minimap');
    const minimapCtx = minimap.getContext('2d');
    const scale = minimap.width / mapSize;

    minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
    
    // Рисуем еду
    foods.forEach(food => {
        minimapCtx.fillStyle = food.color;
        minimapCtx.fillRect(food.x * scale, food.y * scale, 2, 2);
    });

    // Рисуем игрока
    minimapCtx.fillStyle = player.color;
    minimapCtx.beginPath();
    minimapCtx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
    minimapCtx.fill();
}

function update() {
    if (!game.started) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Обновляем скорость в зависимости от размера
    player.speed = 5 - (player.radius / 100);
    player.speed = Math.max(player.speed, 0.5);

    // Move player based on WASD keys
    if (keys.w && player.y - player.speed > 0) player.y -= player.speed;
    if (keys.s && player.y + player.speed < mapSize) player.y += player.speed;
    if (keys.a && player.x - player.speed > 0) player.x -= player.speed;
    if (keys.d && player.x + player.speed < mapSize) player.x += player.speed;

    updateCamera();

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Draw map border
    ctx.strokeStyle = 'white';
    ctx.strokeRect(0, 0, mapSize, mapSize);

    // Draw player
    drawCircle(player.x, player.y, player.radius, player.color);

    // Draw and check collision with food
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        drawCircle(food.x, food.y, food.radius, food.color);

        const dx = player.x - food.x;
        const dy = player.y - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + food.radius) {
            player.radius += food.radius / 10;
            player.score += Math.floor(food.radius);
            foods.splice(i, 1);
            foods.push(createFood());
        }
    }

    ctx.restore();

    // Update score
    scoreElement.textContent = player.score;
    document.getElementById('scoreValue').textContent = player.score;
    document.getElementById('sizeValue').textContent = Math.round(player.radius);
    drawMinimap();

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

// Добавляем обработчики событий
document.getElementById('startButton').addEventListener('click', startGame);

// Инициализация
const minimap = document.getElementById('minimap');
minimap.width = 150;
minimap.height = 150;

console.log('startButton:', document.getElementById('startButton'));
console.log('startMenu:', document.getElementById('startMenu'));
console.log('gameUI:', document.getElementById('gameUI'));

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', () => {
        startGame();
    });
});

update();

