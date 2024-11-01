const dino = document.getElementById("dino");
const cactus = document.getElementById("cactus");
const scoreElement = document.getElementById("score");

let score = 0;
let isAlive = setInterval(function() {
    // Получаем текущую позицию динозавра и кактуса
    let dinoTop = parseInt(window.getComputedStyle(dino).getPropertyValue("bottom"));
    let cactusLeft = parseInt(window.getComputedStyle(cactus).getPropertyValue("left"));

    // Проверяем столкновение
    if (cactusLeft < 50 && cactusLeft > 0 && dinoTop <= 50) {
        // При столкновении сбрасываем счет и начинаем заново
        score = 0;
        scoreElement.textContent = "Счёт: 0";
    } else {
        // Увеличиваем счет
        score++;
        scoreElement.textContent = "Счёт: " + score;
    }
}, 100);

// Функция прыжка
function jump() {
    if (!dino.classList.contains("jump")) {
        dino.classList.add("jump");
        setTimeout(function() {
            dino.classList.remove("jump");
        }, 500);
    }
}

// Слушаем нажатие пробела
document.addEventListener("keydown", function(event) {
    if (event.code === "Space") {
        jump();
    }
});

// Добавляем CSS анимацию для кактуса
const style = document.createElement("style");
style.textContent = `
@keyframes cactusMove {
    0% {
        left: 600px;
    }
    100% {
        left: -20px;
    }
}

#cactus {
    animation: cactusMove 2s infinite linear;
}`;
document.head.appendChild(style);
