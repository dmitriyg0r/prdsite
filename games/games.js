let character = document.getElementById("character");
let obstacle = document.getElementById("obstacle");
let score = document.getElementById("score");
let counter = 0;
let isJumping = false;

// Функция прыжка
function jump() {
    if (!isJumping) {
        isJumping = true;
        let jumpCount = 0;
        let jumpInterval = setInterval(function() {
            if (jumpCount < 15) {
                character.style.bottom = (parseInt(character.style.bottom || 0) + 10) + "px";
            } else if (jumpCount < 30) {
                character.style.bottom = (parseInt(character.style.bottom || 0) - 10) + "px";
            } else {
                clearInterval(jumpInterval);
                isJumping = false;
                character.style.bottom = "0px";
            }
            jumpCount++;
        }, 20);
    }
}

// Обработчик нажатия клавиш
document.addEventListener("keydown", function(event) {
    if (event.code === "Space") {
        jump();
    }
});

// Движение препятствия
let gameLoop = setInterval(function() {
    let obstacleLeft = parseInt(window.getComputedStyle(obstacle).getPropertyValue("left"));
    
    if (obstacleLeft < -20) {
        obstacle.style.left = "600px";
        counter++;
        score.textContent = "Score: " + counter;
    } else {
        obstacle.style.left = (obstacleLeft - 5) + "px";
    }

    // Проверка столкновения
    let characterBottom = parseInt(character.style.bottom || 0);
    if (obstacleLeft < 50 && obstacleLeft > 0 && characterBottom < 40) {
        alert("Game Over! Score: " + counter);
        counter = 0;
        score.textContent = "Score: 0";
        obstacle.style.left = "600px";
    }
}, 20);

// Начальная позиция препятствия
obstacle.style.left = "600px";
