let character = document.getElementById("character");
let obstacle = document.getElementById("obstacle");
let score = document.getElementById("score");
let counter = 0;
let isJumping = false;
let gameSpeed = 3;
let isGameOver = false;
let highScore = localStorage.getItem('highScore') || 0;

// Добавляем отображение рекорда
score.innerHTML = `Score: ${counter} | High Score: ${highScore}`;

// Улучшенная функция прыжка
function jump() {
    if (!isJumping && !isGameOver) {
        isJumping = true;
        character.classList.add('jump');
        let jumpForce = 15;
        let gravity = 0.6;
        let velocity = jumpForce;
        let maxHeight = 150;

        let jumpInterval = setInterval(function() {
            let currentBottom = parseInt(character.style.bottom || "0");
            
            if ((currentBottom > 0 || velocity > 0) && currentBottom < maxHeight) {
                velocity -= gravity;
                currentBottom += velocity;
                character.style.bottom = Math.max(0, currentBottom) + "px";
            } else {
                character.style.bottom = "0px";
                clearInterval(jumpInterval);
                isJumping = false;
                character.classList.remove('jump');
            }
        }, 8);
    }
}

// Обработчик нажатия клавиш
document.addEventListener("keydown", function(event) {
    if ((event.code === "Space" || event.code === "ArrowUp") && !isGameOver) {
        jump();
    }
    // Добавляем перезапуск игры на R
    if (event.code === "KeyR" && isGameOver) {
        resetGame();
    }
});

// Добавляем поддержку тач-устройств
document.addEventListener("touchstart", function(event) {
    if (!isGameOver) {
        jump();
        event.preventDefault();
    }
});

// Обновленная функция gameOver
function gameOver() {
    isGameOver = true;
    if (counter > highScore) {
        highScore = counter;
        localStorage.setItem('highScore', highScore);
    }
    
    character.classList.add('game-over');
    obstacle.classList.add('game-over');
    setTimeout(() => {
        alert(`Game Over!\nScore: ${counter}\nHigh Score: ${highScore}\n\nPress R to restart`);
    }, 100);
}

// Обновленная функция resetGame
function resetGame() {
    isGameOver = false;
    counter = 0;
    gameSpeed = 3;
    score.innerHTML = `Score: ${counter} | High Score: ${highScore}`;
    obstacle.style.left = "600px";
    character.classList.remove('game-over');
    obstacle.classList.remove('game-over');
    character.style.bottom = "0px";
}

// Улучшенный игровой цикл
let gameLoop = setInterval(function() {
    if (!isGameOver) {
        let obstacleLeft = parseInt(window.getComputedStyle(obstacle).getPropertyValue("left"));
        let characterBottom = parseInt(character.style.bottom || 0);
        
        // Увеличиваем сложность с ростом очков
        if (counter > 0 && counter % 10 === 0) {
            gameSpeed = Math.min(gameSpeed + 0.1, 8);
        }

        if (obstacleLeft < -30) {
            obstacle.style.left = "600px";
            counter++;
            score.innerHTML = `Score: ${counter} | High Score: ${highScore}`;
        } else {
            obstacle.style.left = (obstacleLeft - gameSpeed) + "px";
        }

        // Улучшенная система коллизий
        let characterRect = character.getBoundingClientRect();
        let obstacleRect = obstacle.getBoundingClientRect();

        if (characterRect.right > obstacleRect.left + 10 && 
            characterRect.left < obstacleRect.right - 10 && 
            characterRect.bottom > obstacleRect.top + 10) {
            gameOver();
        }
    }
}, 15);

// Начальная позиция препятствия
obstacle.style.left = "600px";

// Добавляем создание облаков
function createCloud() {
    const cloud = document.createElement('div');
    cloud.className = 'cloud';
    cloud.style.top = Math.random() * 100 + 50 + 'px';
    cloud.style.animationDuration = (Math.random() * 10 + 10) + 's';
    document.querySelector('#game').appendChild(cloud);
    
    // Удаляем облако после завершения анимации
    cloud.addEventListener('animationend', () => cloud.remove());
}

// Создаем облака периодически
setInterval(createCloud, 10000);
