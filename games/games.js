const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const dino = {
    x: 50,
    y: canvas.height - 40,
    width: 40,
    height: 40,
    jumping: false,
    velocity: 0,
    gravity: 0.6
};

let obstacles = [];
let score = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;
let gameSpeed = 5;
let gameStarted = false;

function drawDino() {
    ctx.fillStyle = document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#000';
    ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
}

function createObstacle() {
    return {
        x: canvas.width,
        y: canvas.height - 40,
        width: 20,
        height: 40
    };
}

function drawObstacle(obstacle) {
    ctx.fillStyle = document.body.getAttribute('data-theme') === 'dark' ? '#fff' : '#000';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
}

function updateScore() {
    document.querySelector('.score').textContent = `Счёт: ${Math.floor(score)}`;
    document.querySelector('.high-score').textContent = `Рекорд: ${Math.floor(highScore)}`;
}

function jump() {
    if (!dino.jumping) {
        dino.jumping = true;
        dino.velocity = -12;
    }
}

function gameLoop() {
    if (!gameStarted) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Обновление динозавра
    if (dino.jumping) {
        dino.velocity += dino.gravity;
        dino.y += dino.velocity;
        
        if (dino.y > canvas.height - 40) {
            dino.y = canvas.height - 40;
            dino.jumping = false;
        }
    }
    
    // Создание препятствий
    if (Math.random() < 0.02) {
        obstacles.push(createObstacle());
    }
    
    // Обновление препятствий
    obstacles = obstacles.filter(obstacle => {
        obstacle.x -= gameSpeed;
        
        // Проверка столкновений
        if (dino.x < obstacle.x + obstacle.width &&
            dino.x + dino.width > obstacle.x &&
            dino.y < obstacle.y + obstacle.height &&
            dino.y + dino.height > obstacle.y) {
            gameOver();
            return false;
        }
        
        return obstacle.x > -obstacle.width;
    });
    
    // Отрисовка
    drawDino();
    obstacles.forEach(drawObstacle);
    
    // Обновление счета
    score += 0.1;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dinoHighScore', highScore);
    }
    updateScore();
    
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameStarted = false;
    score = 0;
    obstacles = [];
    document.querySelector('.game-start').style.display = 'block';
}

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        document.querySelector('.game-start').style.display = 'none';
        gameLoop();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameStarted) {
            startGame();
        } else {
            jump();
        }
    }
});

// Мобильное управление
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameStarted) {
        startGame();
    } else {
        jump();
    }
});