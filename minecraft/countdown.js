document.addEventListener('DOMContentLoaded', function() {
    const targetDate = new Date('2025-02-10T12:00:00');
    const mainContent = document.querySelector('main');
    
    function updateCountdown() {
        const currentDate = new Date();
        const difference = targetDate - currentDate;
        
        if (difference <= 0) {
            // Если время истекло, показываем основной контент
            location.reload();
            return;
        }
        
        // Рассчитываем оставшееся время
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        // Обновляем значения на странице
        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    }
    
    // Создаём HTML для таймера
    const countdownHTML = `
        <div class="countdown-container">
            <h1 class="countdown-title">До открытия сервера осталось</h1>
            <div class="countdown-timer">
                <div class="countdown-item">
                    <span class="countdown-value" id="days">00</span>
                    <span class="countdown-label">Дней</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="hours">00</span>
                    <span class="countdown-label">Часов</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="minutes">00</span>
                    <span class="countdown-label">Минут</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="seconds">00</span>
                    <span class="countdown-label">Секунд</span>
                </div>
            </div>
            <p class="countdown-message">
                Мы усердно работаем над подготовкой сервера.<br>
                Скоро вы сможете присоединиться к нашему minecraft-сообществу!
            </p>
        </div>
    `;
    
    // Заменяем содержимое main на таймер
    mainContent.innerHTML = countdownHTML;
    
    // Обновляем таймер каждую секунду
    updateCountdown();
    setInterval(updateCountdown, 1000);
}); 