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
let leaderboard = JSON.parse(localStorage.getItem('dinoLeaderboard')) || [];

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
    
    // Создание препятствий с проверкой минимального расстояния
    const minDistance = 150; // Уменьшили минимальное расстояние до 150
    const lastObstacle = obstacles[obstacles.length - 1];
    const canCreateObstacle = !lastObstacle || 
                             (canvas.width - lastObstacle.x) >= minDistance;
    
    // Увеличиваем вероятность появления препятствий в зависимости от счёта
    const baseSpawnChance = 0.01;
    const scoreMultiplier = 1 + (score / 50); // Каждые 50 очков увеличивают шанс на 100%
    const spawnChance = Math.min(baseSpawnChance * scoreMultiplier, 0.05); // Максимальный шанс 5%
    
    if (Math.random() < spawnChance && canCreateObstacle) {
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
    updateLeaderboard(score);
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

async function updateLeaderboard(newScore) {
    const userData = JSON.parse(localStorage.getItem('user'));
    const username = userData?.data?.username || 'Гость';
    
    try {
        // Отправляем новый рекорд на сервер
        const response = await fetch('https://adminflow.ru/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                score: Math.floor(newScore)
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении рекорда');
        }

        // Обновляем отображение таблицы рекордов
        await displayLeaderboard();
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

async function displayLeaderboard() {
    try {
        const response = await fetch('https://adminflow.ru/api/scores');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error('Ошибка при получении рекордов');
        }

        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';
        
        data.data.forEach((record, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${record.username}</td>
                <td>${record.score}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error displaying leaderboard:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    displayLeaderboard();
});