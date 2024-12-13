export class GameState {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.difficulty = 1;
        this.state = 'start';
        this.difficultyIncreaseInterval = 30000;
        this.timeSinceLastDifficultyIncrease = 0;
        this.scoreToNextLevel = 1000;
        
        this.difficultyMultipliers = {
            enemySpeed: 1,
            enemySpawnRate: 1,
            enemyBulletSpeed: 1,
            scoreMultiplier: 1
        };
    }

    startGame(game) {
        this.state = 'playing';
        this.resetGame(game);
    }

    updateDifficulty(dt) {
        this.timeSinceLastDifficultyIncrease += dt;
        
        if (this.score >= this.scoreToNextLevel) {
            this.levelUp();
        }

        if (this.timeSinceLastDifficultyIncrease >= this.difficultyIncreaseInterval) {
            this.difficulty += 0.5;
            this.timeSinceLastDifficultyIncrease = 0;
            this.updateDifficultyMultipliers();
            console.log(`Difficulty increased to ${this.difficulty}`);
        }
    }

    levelUp() {
        this.level++;
        this.scoreToNextLevel += 1000 * this.level;
        this.difficulty += 0.5;
        this.updateDifficultyMultipliers();
        console.log(`Level up! Level: ${this.level}, Difficulty: ${this.difficulty}`);
    }

    updateDifficultyMultipliers() {
        this.difficultyMultipliers = {
            enemySpeed: 1 + (this.difficulty - 1) * 0.2,
            enemySpawnRate: 1 + (this.difficulty - 1) * 0.3,
            enemyBulletSpeed: 1 + (this.difficulty - 1) * 0.15,
            scoreMultiplier: 1 + (this.level - 1) * 0.5
        };
    }

    addScore(points, game) {
        this.score += Math.floor(points * this.difficultyMultipliers.scoreMultiplier);
        if (game) {
            this.updateUI(game);
        }
    }

    updateUI(game) {
        if (!game) return;

        const scoreElement = document.getElementById('score');
        const levelElement = document.getElementById('level');
        const livesElement = document.getElementById('lives');
        
        if (scoreElement) scoreElement.textContent = `Score: ${this.score}`;
        if (levelElement) levelElement.textContent = `Level: ${this.level}`;
        if (livesElement && game.player) livesElement.textContent = `Lives: ${game.player.lives}`;
    }

    resetGame(game) {
        this.score = 0;
        this.level = 1;
        this.difficulty = 1;
        this.timeSinceLastDifficultyIncrease = 0;
        this.scoreToNextLevel = 1000;
        this.updateDifficultyMultipliers();
        
        game.player.reset();
        game.enemyManager.reset();
        game.bulletManager.reset();
        game.particleSystem.reset();
        
        this.updateUI(game);
    }

    isPlaying() {
        return this.state === 'playing';
    }

    isStartScreen() {
        return this.state === 'start';
    }

    gameOver(game) {
        this.state = 'gameover';
        console.log('Game Over! Final score:', this.score);
    }

    isPaused() {
        return this.state === 'paused';
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

    restartGame(game) {
        this.resetGame(game);
        this.state = 'playing';
        document.getElementById('gameOverMenu').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'none';
    }
} 