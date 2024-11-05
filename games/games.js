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

// Улучшенная функция прыжка с физикой
function jump() {
    if (!isJumping && !isGameOver) {
        isJumping = true;
        let jumpForce = 15;
        let gravity = 0.6;
        let velocity = jumpForce;

        let jumpInterval = setInterval(function() {
            // Применяем физику
            let currentBottom = parseInt(character.style.bottom || 0);
            
            if (currentBottom > 0 || velocity > 0) {
                velocity -= gravity;
                character.style.bottom = (currentBottom + velocity) + "px";
            } else {
                character.style.bottom = "0px";
                clearInterval(jumpInterval);
                isJumping = false;
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

// Функция окончания игры
function gameOver() {
    isGameOver = true;
    if (counter > highScore) {
        highScore = counter;
        localStorage.setItem('highScore', highScore);
    }
    
    obstacle.style.animationPlayState = 'paused';
    alert(`Game Over!\nScore: ${counter}\nHigh Score: ${highScore}\n\nPress R to restart`);
}

// Функция перезапуска игры
function resetGame() {
    isGameOver = false;
    counter = 0;
    gameSpeed = 3;
    score.innerHTML = `Score: ${counter} | High Score: ${highScore}`;
    obstacle.style.left = "600px";
    obstacle.style.animationPlayState = 'running';
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
