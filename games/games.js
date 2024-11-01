document.addEventListener('DOMContentLoaded', () => {
    const dino = document.getElementById("dino");
    const cactus = document.getElementById("cactus");
    const scoreElement = document.getElementById("score");

    let score = 0;

    // Добавляем анимацию движения кактуса
    cactus.style.animation = "cactusMove 1.5s infinite linear";

    function jump() {
        if (!dino.classList.contains("jump")) {
            dino.classList.add("jump");
            setTimeout(() => {
                dino.classList.remove("jump");
            }, 500);
        }
    }

    // Проверка столкновений
    let checkAlive = setInterval(() => {
        let dinoTop = parseInt(window.getComputedStyle(dino).getPropertyValue("bottom"));
        let cactusLeft = parseInt(window.getComputedStyle(cactus).getPropertyValue("left"));

        // Проверяем столкновение
        if (cactusLeft < 50 && cactusLeft > 0 && dinoTop <= 50) {
            // При столкновении сбрасываем счет
            score = 0;
            scoreElement.textContent = "Счёт: 0";
            
            // Перезапускаем анимацию кактуса
            cactus.style.animation = "none";
            setTimeout(() => {
                cactus.style.animation = "cactusMove 1.5s infinite linear";
            }, 10);
        } else {
            score++;
            scoreElement.textContent = "Счёт: " + Math.floor(score/10);
        }
    }, 10);

    // Обработка нажатия пробела
    document.addEventListener("keydown", (event) => {
        if (event.code === "Space") {
            jump();
            event.preventDefault(); // Предотвращаем прокрутку страницы
        }
    });
});
