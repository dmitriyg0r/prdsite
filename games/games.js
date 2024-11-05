document.addEventListener('DOMContentLoaded', () => {
    const bird = document.getElementById('bird');
    const pipeTop = document.getElementById('pipe-top');
    const pipeBottom = document.getElementById('pipe-bottom');
    const scoreElement = document.getElementById('score');
    const restartButton = document.getElementById('restart-button');
    const gameContainer = document.getElementById('game');
    const GROUND_HEIGHT = 100; // Высота земли
    const GAME_HEIGHT = 600; // Высота игрового поля

    let birdY = 300;
    let velocity = 0;
    let gravity = 0.5;
    let jumpForce = -8;
    let pipeX = 300;
    let score = 0;
    let isGameOver = false;
    let gameSpeed = 3;
    let pipePassed = false;
    let bestScore = localStorage.getItem('bestScore') || 0;

    let lastTime = 0;
    const FPS = 60;
    const frameTime = 1000 / FPS;
    let accumulator = 0;

    let gameStarted = false;
    const startScreen = document.getElementById('start-screen');

    function createPipes() {
        const gap = 170;
        const minHeight = 50;
        const maxHeight = 300;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        pipeTop.style.height = topHeight + 'px';
        pipeBottom.style.height = (GAME_HEIGHT - GROUND_HEIGHT - topHeight - gap) + 'px';
        pipePassed = false;
    }

    function updatePipes() {
        pipeX -= gameSpeed * (frameTime / 1000) * 50;
        pipeTop.style.right = -pipeX + 'px';
        pipeBottom.style.right = -pipeX + 'px';
        
        const birdRect = bird.getBoundingClientRect();
        const pipeRect = pipeTop.getBoundingClientRect();
        
        if (!pipePassed && pipeRect.right < birdRect.left) {
            score++;
            scoreElement.textContent = `Счёт: ${score}`;
            pipePassed = true;
            
            if (score % 3 === 0) {
                gameSpeed *= 2;
            }
        }
        
        if (pipeRect.right < 200) {
            pipeX = 0;
            createPipes();
        }
    }

    function resetGame() {
        birdY = 300;
        velocity = 0;
        score = 0;
        isGameOver = false;
        pipeX = 300;
        gameSpeed = 3;
        pipePassed = false;
        scoreElement.textContent = `Счёт: ${score}`;
        restartButton.style.display = 'none';
        startScreen.style.display = 'none';
        bird.style.transform = 'rotate(0deg)';
        createPipes();
        
        if (!gameStarted) {
            gameStarted = true;
            requestAnimationFrame(gameLoop);
        }
    }

    function checkCollision() {
        const birdRect = bird.getBoundingClientRect();
        const topPipeRect = pipeTop.getBoundingClientRect();
        const bottomPipeRect = pipeBottom.getBoundingClientRect();
        
        if (
            birdRect.top <= 0 || // Столкновение с потолком
            birdY > GAME_HEIGHT - GROUND_HEIGHT - 40 || // Столкновение с землей
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
        if (!isGameOver) {
            isGameOver = true;
            gameStarted = false;
            restartButton.style.display = 'block';
            
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('bestScore', bestScore);
                document.getElementById('best-score').textContent = `Рекорд: ${bestScore}`;
            }

            gameContainer.classList.add('shake');
            setTimeout(() => {
                gameContainer.classList.remove('shake');
            }, 500);
        }
    }

    function updateBirdPosition() {
        velocity += gravity * (frameTime / 1000);
        birdY += velocity * (frameTime / 1000) * 50;
        
        if (birdY > GAME_HEIGHT - GROUND_HEIGHT - 40) { // 40 - высота птицы
            gameOver();
            birdY = GAME_HEIGHT - GROUND_HEIGHT - 40; // Фиксируем птицу на земле
        }
        
        if (birdY < 0) {
            birdY = 0;
            velocity = 0;
        }
        
        bird.style.top = birdY + 'px';
        
        const rotation = Math.min(Math.max(velocity * 3, -45), 45);
        bird.style.transform = `rotate(${rotation}deg)`;
    }

    function gameLoop(currentTime) {
        if (!gameStarted) {
            lastTime = 0;
            return;
        }
        
        if (!isGameOver) {
            if (!lastTime) lastTime = currentTime;
            
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            accumulator += deltaTime;
            
            while (accumulator >= frameTime) {
                updateBirdPosition();
                updatePipes();
                checkCollision();
                accumulator -= frameTime;
            }
            
            requestAnimationFrame(gameLoop);
        }
    }

    function startGame() {
        if (!gameStarted) {
            gameStarted = true;
            startScreen.style.display = 'none';
            resetGame();
            requestAnimationFrame(gameLoop);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!gameStarted) {
                startGame();
            } else if (!isGameOver) {
                velocity = jumpForce;
            }
        }
    });

    restartButton.addEventListener('click', resetGame);

    createPipes();
    startScreen.style.display = 'block';
});
