document.addEventListener('DOMContentLoaded', function() {
    const image = document.querySelector('.development-image img');
    const container = document.querySelector('.development-image');

    if (image && container) {
        let currentX = window.innerWidth / 2;
        let currentY = window.innerHeight / 2;
        let targetX = currentX;
        let targetY = currentY;
        let isRunning = false;
        const TRIGGER_DISTANCE = 200; // Расстояние, на котором картинка начинает реагировать
        const RETURN_SPEED = 0.1; // Скорость возврата в исходное положение

        // Инициализация начальной позиции
        setTimeout(() => {
            const rect = image.getBoundingClientRect();
            currentX = rect.left;
            currentY = rect.top;
            targetX = currentX;
            targetY = currentY;

            image.style.top = currentY + 'px';
            image.style.left = currentX + 'px';
            image.style.transform = 'none';
        }, 100);

        function checkBounds(x, y) {
            const margin = 20;
            const rect = image.getBoundingClientRect();
            return {
                x: Math.min(Math.max(x, margin), window.innerWidth - rect.width - margin),
                y: Math.min(Math.max(y, margin), window.innerHeight - rect.height - margin)
            };
        }

        function animate() {
            if (!isRunning) return;

            currentX += (targetX - currentX) * 0.1;
            currentY += (targetY - currentY) * 0.1;

            const bounds = checkBounds(currentX, currentY);
            image.style.left = bounds.x + 'px';
            image.style.top = bounds.y + 'px';

            // Проверяем, нужно ли продолжать анимацию
            if (Math.abs(targetX - currentX) < 0.5 && Math.abs(targetY - currentY) < 0.5) {
                isRunning = false;
            } else {
                requestAnimationFrame(animate);
            }
        }

        // Начальная позиция
        let initialX, initialY;

        document.addEventListener('mousemove', (e) => {
            const rect = image.getBoundingClientRect();
            const imageX = rect.left + rect.width / 2;
            const imageY = rect.top + rect.height / 2;

            // Сохраняем начальную позицию при первом движении
            if (!initialX) initialX = imageX;
            if (!initialY) initialY = imageY;

            const deltaX = imageX - e.clientX;
            const deltaY = imageY - e.clientY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance < TRIGGER_DISTANCE) {
                // Убегаем от курсора
                const angle = Math.atan2(deltaY, deltaX);
                const force = (TRIGGER_DISTANCE - distance) * 1.5;
                
                targetX = imageX + Math.cos(angle) * force - rect.width / 2;
                targetY = imageY + Math.sin(angle) * force - rect.height / 2;

                if (!isRunning) {
                    isRunning = true;
                    animate();
                }
            } else {
                // Возвращаемся в исходную позицию
                targetX = initialX - rect.width / 2;
                targetY = initialY - rect.height / 2;

                if (!isRunning) {
                    isRunning = true;
                    animate();
                }
            }
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            const bounds = checkBounds(currentX, currentY);
            currentX = bounds.x;
            currentY = bounds.y;
            targetX = bounds.x;
            targetY = bounds.y;
            image.style.left = currentX + 'px';
            image.style.top = currentY + 'px';

            // Обновляем начальную позицию
            const rect = image.getBoundingClientRect();
            initialX = rect.left + rect.width / 2;
            initialY = rect.top + rect.height / 2;
        });
    }
}); 