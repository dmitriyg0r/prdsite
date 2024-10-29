document.addEventListener('DOMContentLoaded', function() {
    const image = document.querySelector('.development-image img');
    const container = document.querySelector('.development-image');

    if (image && container) {
        let currentX = window.innerWidth / 2;
        let currentY = window.innerHeight / 2;
        let targetX = currentX;
        let targetY = currentY;
        let isRunning = false;

        // Функция для проверки границ
        function checkBounds(x, y) {
            const margin = 20; // отступ от краев экрана
            const rect = image.getBoundingClientRect();
            
            return {
                x: Math.min(Math.max(x, margin), window.innerWidth - rect.width - margin),
                y: Math.min(Math.max(y, margin), window.innerHeight - rect.height - margin)
            };
        }

        // Функция анимации
        function animate() {
            if (!isRunning) return;

            // Вычисляем новую позицию с плавным переходом
            currentX += (targetX - currentX) * 0.05;
            currentY += (targetY - currentY) * 0.05;

            // Применяем позицию к изображению
            const bounds = checkBounds(currentX, currentY);
            image.style.transform = `translate(${bounds.x}px, ${bounds.y}px)`;

            requestAnimationFrame(animate);
        }

        // Обработчик движения мыши
        document.addEventListener('mousemove', (e) => {
            const rect = image.getBoundingClientRect();
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const imageX = rect.left + rect.width / 2;
            const imageY = rect.top + rect.height / 2;

            // Вычисляем вектор от мыши к изображению
            const deltaX = imageX - mouseX;
            const deltaY = imageY - mouseY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Определяем новую целевую позицию
            if (distance < 300) { // Расстояние, на котором изображение начинает убегать
                const angle = Math.atan2(deltaY, deltaX);
                const force = (300 - distance) * 2; // Сила убегания
                
                targetX = imageX + Math.cos(angle) * force;
                targetY = imageY + Math.sin(angle) * force;

                if (!isRunning) {
                    isRunning = true;
                    animate();
                }
            }
        });

        // Добавляем случайное движение
        function addRandomMovement() {
            if (!isRunning) {
                const rect = image.getBoundingClientRect();
                const randomAngle = Math.random() * Math.PI * 2;
                const randomDistance = Math.random() * 100;

                targetX = rect.left + Math.cos(randomAngle) * randomDistance;
                targetY = rect.top + Math.sin(randomAngle) * randomDistance;

                isRunning = true;
                animate();
            }
        }

        // Запускаем случайное движение каждые 3 секунды
        setInterval(addRandomMovement, 3000);

        // Обработчик изменения размера окна
        window.addEventListener('resize', () => {
            const bounds = checkBounds(currentX, currentY);
            currentX = bounds.x;
            currentY = bounds.y;
            targetX = bounds.x;
            targetY = bounds.y;
        });

        // Добавляем поведение при клике
        image.addEventListener('click', () => {
            const randomX = Math.random() * (window.innerWidth - image.width);
            const randomY = Math.random() * (window.innerHeight - image.height);
            
            targetX = randomX;
            targetY = randomY;

            if (!isRunning) {
                isRunning = true;
                animate();
            }
        });

        // Инициализация начальной позиции
        const rect = image.getBoundingClientRect();
        currentX = window.innerWidth / 2 - rect.width / 2;
        currentY = window.innerHeight / 2 - rect.height / 2;
        targetX = currentX;
        targetY = currentY;
        
        const bounds = checkBounds(currentX, currentY);
        image.style.transform = `translate(${bounds.x}px, ${bounds.y}px)`;
    }
}); 