document.addEventListener('DOMContentLoaded', function() {
    const image = document.querySelector('.development-image img');
    const container = document.querySelector('.development-image');

    if (image && container) {
        // Устанавливаем начальную позицию
        let currentX = window.innerWidth / 2;
        let currentY = window.innerHeight / 2;
        let targetX = currentX;
        let targetY = currentY;
        let isRunning = false;

        // Сначала удаляем transform, установленный в CSS
        image.style.top = '50%';
        image.style.left = '50%';
        image.style.transform = 'translate(-50%, -50%)';

        // Небольшая задержка перед началом анимации
        setTimeout(() => {
            // Получаем начальную позицию после рендеринга
            const rect = image.getBoundingClientRect();
            currentX = rect.left;
            currentY = rect.top;
            targetX = currentX;
            targetY = currentY;

            // Теперь можно установить абсолютное позиционирование
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

            currentX += (targetX - currentX) * 0.05;
            currentY += (targetY - currentY) * 0.05;

            const bounds = checkBounds(currentX, currentY);
            image.style.left = bounds.x + 'px';
            image.style.top = bounds.y + 'px';

            if (Math.abs(targetX - currentX) < 0.1 && Math.abs(targetY - currentY) < 0.1) {
                isRunning = false;
            } else {
                requestAnimationFrame(animate);
            }
        }

        document.addEventListener('mousemove', (e) => {
            const rect = image.getBoundingClientRect();
            const imageX = rect.left + rect.width / 2;
            const imageY = rect.top + rect.height / 2;
            const deltaX = imageX - e.clientX;
            const deltaY = imageY - e.clientY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance < 300) {
                const angle = Math.atan2(deltaY, deltaX);
                const force = (300 - distance) * 2;
                
                targetX = imageX + Math.cos(angle) * force - rect.width / 2;
                targetY = imageY + Math.sin(angle) * force - rect.height / 2;

                if (!isRunning) {
                    isRunning = true;
                    animate();
                }
            }
        });

        // Случайное движение каждые 3 секунды
        setInterval(() => {
            if (!isRunning) {
                const rect = image.getBoundingClientRect();
                const randomAngle = Math.random() * Math.PI * 2;
                const randomDistance = Math.random() * 100;

                targetX = rect.left + Math.cos(randomAngle) * randomDistance;
                targetY = rect.top + Math.sin(randomAngle) * randomDistance;

                isRunning = true;
                animate();
            }
        }, 3000);

        // Обработка клика
        image.addEventListener('click', () => {
            const rect = image.getBoundingClientRect();
            targetX = Math.random() * (window.innerWidth - rect.width);
            targetY = Math.random() * (window.innerHeight - rect.height);

            if (!isRunning) {
                isRunning = true;
                animate();
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
        });
    }
}); 