// adagar.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');

// Устанавливаем размер canvas на полный экран
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const mapSize = 4000;
const camera = {
    x: 0,
    y: 0,
    zoom: 1
};

const player = {
    name: '',
    x: mapSize / 2,
    y: mapSize / 2,
    radius: 20,
    color: '#3498db',
    score: 0,
    speed: 3,
    maxRadius: 200 // Добавляем максимальный размер
};

// Улучшаем создание еды
function createFood() {
    const hue = Math.random() * 360;
    return {
        x: Math.random() * mapSize,
        y: Math.random() * mapSize,
        radius: 3 + Math.random() * 4,
        color: `hsl(${hue}, 70%, 50%)`
    };
}

const foods = Array(500).fill().map(() => createFood());

// Улучшаем отрисовку
function drawCircle(x, y, radius, color, name = '') {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    if (name) {
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${radius/2}px Arial`;
        ctx.fillText(name, x, y);
    }
}

function startGame() {
    const nameInput = document.getElementById('playerName');
    player.name = nameInput.value.trim() || 'Player';
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    update();
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Плавное движение
    const acceleration = 0.5;
    if (keys.w) player.y = Math.max(player.radius, player.y - player.speed);
    if (keys.s) player.y = Math.min(mapSize - player.radius, player.y + player.speed);
    if (keys.a) player.x = Math.max(player.radius, player.x - player.speed);
    if (keys.d) player.x = Math.min(mapSize - player.radius, player.x + player.speed);

    // Обновляем камеру
    camera.zoom = Math.min(1, 40 / player.radius);
    camera.x = player.x - canvas.width / (2 * camera.zoom);
    camera.y = player.y - canvas.height / (2 * camera.zoom);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Отрисовка сетки
    const gridSize = 100;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    for (let x = 0; x <= mapSize; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapSize);
    }
    for (let y = 0; y <= mapSize; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(mapSize, y);
    }
    ctx.stroke();

    // Обработка еды
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        drawCircle(food.x, food.y, food.radius, food.color);

        const dx = player.x - food.x;
        const dy = player.y - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + food.radius) {
            const growth = food.radius / 5;
            if (player.radius < player.maxRadius) {
                player.radius += growth;
                player.score += Math.floor(food.radius);
            }
            foods[i] = createFood();
        }
    }

    // Отрисовка игрока
    drawCircle(player.x, player.y, player.radius, player.color, player.name);

    ctx.restore();

    // Обновление UI
    scoreElement.textContent = player.score;
    document.getElementById('sizeValue').textContent = Math.round(player.radius);
    
    requestAnimationFrame(update);
}
