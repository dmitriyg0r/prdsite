const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');

canvas.width = 800;
canvas.height = 600;

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    color: '#3498db',
    score: 0
};

const foods = [];
const foodCount = 50;

function createFood() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
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

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move player towards mouse
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            player.x += dx / distance;
            player.y += dy / distance;
        }
    });

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

    // Update score
    scoreElement.textContent = player.score;

    requestAnimationFrame(update);
}

update();

