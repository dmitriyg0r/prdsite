export class GameState {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.difficulty = 1;
        this.state = 'start'; // 'start', 'playing', 'paused', 'gameOver'
        this.difficultyIncreaseInterval = 30000; // 30 секунд
        this.timeSinceLastDifficultyIncrease = 0;
    }

    isPlaying() {
        return this.state === 'playing';
    }

    isPaused() {
        return this.state === 'paused';
    }

    isGameOver() {
        return this.state === 'gameOver';
    }

    isStartScreen() {
        return this.state === 'start';
    }

    startGame(game) {
        this.state = 'playing';
        this.resetGame(game);
        document.getElementById('startMenu').style.display = 'none';
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pauseMenu').style.display = 'flex';
        } else if (this.state === 'paused') {
            this.resumeGame();
        }
    }

    resumeGame() {
        this.state = 'playing';
        document.getElementById('pauseMenu').style.display = 'none';
    }

    gameOver(game) {
        this.state = 'gameOver';
        document.getElementById('gameOverMenu').style.display = 'flex';
        document.getElementById('finalScore').textContent = this.score;
    }

    restartGame(game) {
        this.resetGame(game);
        this.state = 'playing';
        document.getElementById('gameOverMenu').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'none';
    }

    resetGame(game) {
        this.score = 0;
        this.level = 1;
        this.difficulty = 1;
        this.timeSinceLastDifficultyIncrease = 0;
        
        game.player.reset();
        game.enemyManager.reset();
        game.bulletManager.reset();
        game.particleSystem.reset();
        
        this.updateUI(game);
    }

    updateDifficulty(dt) {
        this.timeSinceLastDifficultyIncrease += dt;
        if (this.timeSinceLastDifficultyIncrease >= this.difficultyIncreaseInterval) {
            this.difficulty += 0.1;
            this.level = Math.floor(this.difficulty);
            this.timeSinceLastDifficultyIncrease = 0;
        }
    }

    updateUI(game) {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = game.player.lives;
        document.getElementById('level').textContent = this.level;
    }

    addScore(points) {
        this.score += points;
        document.getElementById('score').textContent = this.score;
    }
} 