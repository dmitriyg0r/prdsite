document.addEventListener('DOMContentLoaded', () => {
    const bird = document.getElementById('bird');
    const pipeTop = document.getElementById('pipe-top');
    const pipeBottom = document.getElementById('pipe-bottom');
    const scoreElement = document.getElementById('score');
    const restartButton = document.getElementById('restart-button');
    const gameContainer = document.getElementById('game');

    let birdY = 300;
    let velocity = 0;
    let gravity = 0.5;
    let jumpForce = -10;
    let pipeX = 400;
    let score = 0;
    let isGameOver = false;
    let gameSpeed = 2;
    let bestScore = localStorage.getItem('bestScore') || 0;

    // Добавляем элемент для лучшего счета
    const bestScoreElement = document.createElement('span');
    bestScoreElement.id = 'best-score';
    bestScoreElement.textContent = `Рекорд: ${bestScore}`;
    document.querySelector('.game-controls').appendChild(bestScoreElement);

    function createPipes() {
        const gap = 200;
        const minHeight = 50;
        const maxHeight = 400;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        pipeTop.style.height = topHeight + 'px';
        pipeBottom.style.height = (600 - topHeight - gap) + 'px';
    }

    function updateBirdPosition() {
        velocity += gravity;
        birdY += velocity;
        bird.style.top = birdY + 'px';
        
        // Добавляем вращение птицы в зависимости от скорости падения
        const rotation = velocity * 2;
        bird.style.transform = `rotate(${rotation}deg)`;
    }

    function checkCollision() {
        const birdRect = bird.getBoundingClientRect();
        const topPipeRect = pipeTop.getBoundingClientRect();
        const bottomPipeRect = pipeBottom.getBoundingClientRect();
        
        if (
            birdRect.bottom >= 600 || // Столкновение с землей
            birdRect.top <= 0 || // Столкновение с потолком
            (
                birdRect.right >= topPipeRect.left &&
                birdRect.left <= topPipeRect.right &&
                (birdRect.top <= topPipeRect.bottom || birdRect.bottom >= bottomPipeRect.top)
            )
        ) {
            gameOver();
        }
    }

    function gameOver() {
        isGameOver = true;
        restartButton.style.display = 'block';
        
        // Обновляем рекорд
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('bestScore', bestScore);
            bestScoreElement.textContent = `Рекорд: ${bestScore}`;
        }

        // Добавляем эффект встряски при проигрыше
        gameContainer.classList.add('shake');
        setTimeout(() => {
            gameContainer.classList.remove('shake');
        }, 500);
    }

    function updatePipes() {
        pipeX -= gameSpeed;
        pipeTop.style.right = -pipeX + 'px';
        pipeBottom.style.right = -pipeX + 'px';
        
        if (pipeX >= 400) {
            pipeX = 0;
            createPipes();
            score++;
            scoreElement.textContent = `Счёт: ${score}`;
            
            // Увеличиваем скорость игры каждые 5 очков
            if (score % 5 === 0) {
                gameSpeed += 0.5;
            }
        }
    }

    function resetGame() {
        birdY = 300;
        velocity = 0;
        score = 0;
        isGameOver = false;
        pipeX = 400;
        gameSpeed = 2;
        scoreElement.textContent = `Счёт: ${score}`;
        restartButton.style.display = 'none';
        bird.style.transform = 'rotate(0deg)';
        createPipes();
        gameLoop();
    }

    function gameLoop() {
        if (!isGameOver) {
            updateBirdPosition();
            updatePipes();
            checkCollision();
            requestAnimationFrame(gameLoop);
        }
    }

    // Обработчики событий
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            if (!isGameOver) {
                velocity = jumpForce;
            }
        }
    });

    document.addEventListener('click', (e) => {
        // Проверяем, что клик был не по кнопке перезапуска
        if (!isGameOver && e.target !== restartButton) {
            velocity = jumpForce;
        }
    });

    restartButton.addEventListener('click', resetGame);

    // Начинаем игру
    createPipes();
    gameLoop();
});
