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

        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.livesElement = document.getElementById('lives');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.finalScoreElement = document.getElementById('finalScore');
    }

    startGame(game) {
        this.state = 'playing';
        this.resetGame(game);
    }

    updateDifficulty(dt) {
        if (!this.isPlaying()) return;

        this.timeSinceLastDifficultyIncrease += dt;
        
        if (this.timeSinceLastDifficultyIncrease >= this.difficultyIncreaseInterval) {
            this.difficulty += 0.5;
            this.timeSinceLastDifficultyIncrease = 0;
            this.updateDifficultyMultipliers();
        }
    }

    levelUp() {
        this.level++;
        this.scoreToNextLevel = this.level * 1000;
        this.difficulty += 0.5;
        this.updateDifficultyMultipliers();
        this.updateLevel();
    }

    updateDifficultyMultipliers() {
        const multiplier = 1 + (this.difficulty - 1) * 0.1;
        this.difficultyMultipliers = {
            enemySpeed: multiplier,
            enemySpawnRate: multiplier,
            enemyBulletSpeed: multiplier,
            scoreMultiplier: 1
        };
    }

    addScore(points, game) {
        if (!this.isPlaying() || !points || typeof points !== 'number') return;
        if (!game || !game.player) return;
        
        const scoreToAdd = Math.floor(points);
        this.score += scoreToAdd;
        
        this.updateScore();
        
        if (this.score >= this.scoreToNextLevel) {
            this.levelUp();
        }
    }

    updateScore() {
        if (this.scoreElement) {
            const formattedScore = Math.floor(this.score).toString().padStart(6, '0');
            this.scoreElement.textContent = formattedScore;
        }
    }

    updateLevel() {
        if (this.levelElement) {
            this.levelElement.textContent = this.level.toString();
        }
    }

    updateLives(game) {
        if (this.livesElement && game && game.player) {
            const lives = Math.max(0, game.player.lives);
            this.livesElement.textContent = lives.toString();
        }
    }

    updateUI(game) {
        if (!game || !game.player || !this.isPlaying()) return;
        
        this.updateScore();
        this.updateLevel();
        this.updateLives(game);
    }

    resetGame(game) {
        this.score = 0;
        this.level = 1;
        this.difficulty = 1;
        this.timeSinceLastDifficultyIncrease = 0;
        this.scoreToNextLevel = 1000;
        this.difficultyMultipliers = {
            enemySpeed: 1,
            enemySpawnRate: 1,
            enemyBulletSpeed: 1,
            scoreMultiplier: 1
        };
        
        if (game) {
            game.player.reset();
            game.enemyManager.reset();
            game.bulletManager.reset();
            game.particleSystem.reset();
            this.updateUI(game);
        }
    }

    isPlaying() {
        return this.state === 'playing';
    }

    isStartScreen() {
        return this.state === 'start';
    }

    gameOver(game) {
        if (!game) return;
        
        this.state = 'gameover';
        game.player.lives = 0;
        this.updateUI(game);
        
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'flex';
        }
        
        if (this.finalScoreElement) {
            const formattedScore = Math.floor(this.score).toString().padStart(6, '0');
            this.finalScoreElement.textContent = `Final Score: ${formattedScore}`;
        }
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