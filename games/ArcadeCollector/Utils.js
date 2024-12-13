export class Utils {
    static calculateDeltaTime(currentTime, lastTime) {
        return Math.min(currentTime - lastTime, 50); // Ограничение в 50мс для стабильности
    }

    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
} 