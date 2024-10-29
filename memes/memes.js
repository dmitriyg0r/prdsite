document.addEventListener('DOMContentLoaded', function() {
    const image = document.querySelector('.development-image img');
    const container = document.querySelector('.development-image');
    const notice = document.querySelector('.development-notice');

    if (image && container) {
        // Дождёмся загрузки изображения
        image.onload = () => {
            // Получаем позицию уведомления
            const noticeRect = notice.getBoundingClientRect();
            
            // Устанавливаем начальную позицию под уведомлением
            let currentX = window.innerWidth / 2;
            let currentY = noticeRect.bottom + 50; // 50px отступ от уведомления
            let targetX = currentX;
            let targetY = currentY;
            let velocityX = 0;
            let velocityY = 0;
            let isRunning = false;

            // Устанавливаем начальную позицию
            image.style.top = currentY + 'px';
            image.style.left = currentX + 'px';
            image.style.transform = 'translate(-50%, 0)';

            // Остальной код остается тем же
            // ... (весь предыдущий код с границами и отскоком) ...

            // Обновляем initialX и initialY
            initialX = currentX;
            initialY = currentY;
        };
    }
}); 