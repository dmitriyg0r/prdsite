document.addEventListener('DOMContentLoaded', () => {
    const bird = document.getElementById('bird');
    const pipeTop = document.getElementById('pipe-top');
    const pipeBottom = document.getElementById('pipe-bottom');
    const scoreElement = document.getElementById('score');
    const restartButton = document.getElementById('restart-button');
    
    let birdY = 300;
    let velocity = 0;
    let gravity = 0.5;
    let jumpForce = -10;
    let score = 0;
    let isGameOver = false;
    let pipeX = 400;
    let gap = 200;
    
    function updateBirdPosition() {
        velocity += gravity;
        birdY += velocity;
        bird.style.top = birdY + 'px';
        bird.style.transform = `rotate(${velocity * 2}deg)`;
    }
    
    function createPipes() {
        let pipeHeight = Math.random() * 300 + 100;
        pipeTop.style.height = pipeHeight + 'px';
        pipeBottom.style.height = (600 - pipeHeight - gap) + 'px';
    }
    
    function updatePipes() {
        pipeX -= 2;
        pipeTop.style.right = -pipeX + 'px';
        pipeBottom.style.right = -pipeX + 'px';
        
        if (pipeX >= 400) {
            pipeX = 0;
            createPipes();
            score++;
            scoreElement.textContent = `Счёт: ${score}`;
        }
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
            isGameOver = true;
            restartButton.style.display = 'block';
        }
    }
    
    function resetGame() {
        birdY = 300;
        velocity = 0;
        score = 0;
        isGameOver = false;
        pipeX = 400;
        scoreElement.textContent = `Счёт: ${score}`;
        restartButton.style.display = 'none';
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
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isGameOver) {
            velocity = jumpForce;
        }
    });
    
    document.addEventListener('click', () => {
        if (!isGameOver) {
            velocity = jumpForce;
        }
    });
    
    restartButton.addEventListener('click', resetGame);
    
    // Начинаем игру
    createPipes();
    gameLoop();
});
