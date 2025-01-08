class UpdateNotification {
    constructor() {
        this.checkInterval = 5 * 60 * 1000;
        this.isUpdating = false;
        this.init();
    }

    async init() {
        // Создаем элемент уведомления
        this.createNotificationElement();
        
        try {
            // Получаем начальную версию при загрузке
            const response = await fetch(`/version.json?t=${Date.now()}`);
            const data = await response.json();
            this.currentVersion = data.version;
            
            // Запускаем периодическую проверку
            setInterval(() => this.checkForUpdates(), this.checkInterval);
        } catch (error) {
            console.error('Ошибка при инициализации:', error);
        }
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
            this.isUpdating = true; // Устанавливаем флаг
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
                this.currentVersion = data.version; // Обновляем текущую версию
            }
        } catch (error) {
            console.error('Ошибка при проверке обновлений:', error);
        }
    }

    showNotification() {
        if (!this.isUpdating) { // Проверяем флаг перед показом уведомления
            this.notificationElement.classList.add('show');
        }
    }
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new UpdateNotification();
});
