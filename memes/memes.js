document.addEventListener('DOMContentLoaded', function() {
    const image = document.querySelector('.development-image img');
    const container = document.querySelector('.development-image');

    if (image && container) {
        let currentX = window.innerWidth / 2;
        let currentY = window.innerHeight / 2;
        let targetX = currentX;
        let targetY = currentY;
        let velocityX = 0;
        let velocityY = 0;
        let isRunning = false;
        const TRIGGER_DISTANCE = 200;
        const BOUNCE_FACTOR = 0.7; // Коэффициент отскока (0-1)
        const FRICTION = 0.95; // Коэффициент трения
        const BOUNDS = {
            left: 100,   // Левая граница
            right: window.innerWidth - 100,  // Правая граница
            top: 100,    // Верхняя граница
            bottom: window.innerHeight - 100 // Нижняя граница
        };

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

        function checkBoundsAndBounce(x, y, vx, vy) {
            const rect = image.getBoundingClientRect();
            let newX = x;
            let newY = y;
            let newVX = vx;
            let newVY = vy;

            // Проверка горизонтальных границ
            if (x < BOUNDS.left) {
                newX = BOUNDS.left;
                newVX = Math.abs(vx) * BOUNCE_FACTOR; // Отскок вправо
            } else if (x + rect.width > BOUNDS.right) {
                newX = BOUNDS.right - rect.width;
                newVX = -Math.abs(vx) * BOUNCE_FACTOR; // Отскок влево
            }

            // Проверка вертикальных границ
            if (y < BOUNDS.top) {
                newY = BOUNDS.top;
                newVY = Math.abs(vy) * BOUNCE_FACTOR; // Отскок вниз
            } else if (y + rect.height > BOUNDS.bottom) {
                newY = BOUNDS.bottom - rect.height;
                newVY = -Math.abs(vy) * BOUNCE_FACTOR; // Отскок вверх
            }

            return { x: newX, y: newY, vx: newVX, vy: newVY };
        }

        function animate() {
            if (!isRunning) return;

            // Обновляем скорость
            velocityX = (targetX - currentX) * 0.1;
            velocityY = (targetY - currentY) * 0.1;

            // Применяем трение
            velocityX *= FRICTION;
            velocityY *= FRICTION;

            // Обновляем позицию
            currentX += velocityX;
            currentY += velocityY;

            // Проверяем границы и применяем отскок
            const bounced = checkBoundsAndBounce(currentX, currentY, velocityX, velocityY);
            currentX = bounced.x;
            currentY = bounced.y;
            velocityX = bounced.vx;
            velocityY = bounced.vy;

            // Применяем новую позицию
            image.style.left = currentX + 'px';
            image.style.top = currentY + 'px';

            // Добавляем небольшой наклон в зависимости от движения
            const tiltX = velocityY * 2;
            const tiltY = -velocityX * 2;
            image.style.transform = `rotate3d(${tiltX}, ${tiltY}, 0, ${Math.min(Math.max(Math.sqrt(velocityX * velocityX + velocityY * velocityY) * 2, -20), 20)}deg)`;

            // Проверяем, нужно ли продолжать анимацию
            if (Math.abs(velocityX) < 0.1 && Math.abs(velocityY) < 0.1 && 
                Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
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

        // Обновляем границы при изменении размера окна
        window.addEventListener('resize', () => {
            BOUNDS.right = window.innerWidth - 100;
            BOUNDS.bottom = window.innerHeight - 100;

            const bounced = checkBoundsAndBounce(currentX, currentY, velocityX, velocityY);
            currentX = bounced.x;
            currentY = bounced.y;
            velocityX = bounced.vx;
            velocityY = bounced.vy;

            image.style.left = currentX + 'px';
            image.style.top = currentY + 'px';

            // Обновляем начальную позицию
            const rect = image.getBoundingClientRect();
            initialX = rect.left + rect.width / 2;
            initialY = rect.top + rect.height / 2;
        });
    }
}); 