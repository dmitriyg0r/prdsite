class UpdateNotification {
    constructor() {
        this.currentVersion = '1.0.0'; // Начальная версия
        this.checkInterval = 5 * 60 * 1000; // Проверять каждые 5 минут
        this.init();
    }

    init() {
        // Создаем элемент уведомления
        this.createNotificationElement();
        
        // Проверяем обновления при загрузке
        this.checkForUpdates();
        
        // Запускаем периодическую проверку
        setInterval(() => this.checkForUpdates(), this.checkInterval);
    }

    createNotificationElement() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <p>Доступна новая версия сайта!</p>
            <button class="update-button">Обновить</button>
        `;
        document.body.appendChild(notification);

        // Добавляем обработчик на кнопку
        const updateButton = notification.querySelector('.update-button');
        updateButton.addEventListener('click', () => {
            this.notificationElement.classList.remove('show'); // Скрываем уведомление
            setTimeout(() => {
                window.location.reload(true);
            }, 300); // Даем время на анимацию скрытия
        });

        this.notificationElement = notification;
    }

    async checkForUpdates() {
        try {
            // Запрашиваем версию с сервера, добавляя случайный параметр для избежания кэширования
            const response = await fetch(`/version.json?t=${Date.now()}`);
            const data = await response.json();
            
            if (data.version !== this.currentVersion) {
                this.showNotification();
            }
        } catch (error) {
            console.error('Ошибка при проверке обновлений:', error);
        }
    }

    showNotification() {
        this.notificationElement.classList.add('show');
    }
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new UpdateNotification();
});
