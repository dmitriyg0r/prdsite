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
    let pipePassed = false;

    function createPipes() {
        const gap = 200;
        const minHeight = 50;
        const maxHeight = 300;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        pipeTop.style.height = topHeight + 'px';
        pipeBottom.style.height = (500 - topHeight - gap) + 'px';
        pipePassed = false;
    }

    function updatePipes() {
        pipeX -= gameSpeed;
        pipeTop.style.right = -pipeX + 'px';
        pipeBottom.style.right = -pipeX + 'px';
        
        const birdRect = bird.getBoundingClientRect();
        const pipeRect = pipeTop.getBoundingClientRect();
        
        if (!pipePassed && pipeRect.right < birdRect.left) {
            score++;
            scoreElement.textContent = `Счёт: ${score}`;
            pipePassed = true;
            
            if (score % 5 === 0) {
                gameSpeed += 0.5;
            }
        }
        
        if (pipeRect.right < 0) {
            pipeX = 0;
            createPipes();
        }
    }

    function resetGame() {
        birdY = 300;
        velocity = 0;
        score = 0;
        isGameOver = false;
        pipeX = 400;
        gameSpeed = 2;
        pipePassed = false;
        scoreElement.textContent = `Счёт: ${score}`;
        restartButton.style.display = 'none';
        bird.style.transform = 'rotate(0deg)';
        createPipes();
        gameLoop();
    }

    function checkCollision() {
        const birdRect = bird.getBoundingClientRect();
        const topPipeRect = pipeTop.getBoundingClientRect();
        const bottomPipeRect = pipeBottom.getBoundingClientRect();
        const gameRect = document.getElementById('game').getBoundingClientRect();
        
        if (
            birdRect.bottom >= gameRect.bottom - 100 ||
            birdRect.top <= 0 ||
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

    function updateBirdPosition() {
        velocity += gravity;
        birdY += velocity;
        
        const maxY = 500;
        if (birdY > maxY) {
            birdY = maxY;
            velocity = 0;
        }
        
        bird.style.top = birdY + 'px';
        const rotation = velocity * 2;
        bird.style.transform = `rotate(${rotation}deg)`;
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
        if (e.code === 'Space') {
            if (!isGameOver) {
                velocity = jumpForce;
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!isGameOver && e.target !== restartButton) {
            velocity = jumpForce;
        }
    });

    restartButton.addEventListener('click', resetGame);

    createPipes();
    gameLoop();
});
