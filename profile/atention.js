// Добавьте в profile.js

// Функция для обновления индикатора уведомлений
function updateNotificationDot(hasNewRequests) {
    const notificationDot = document.querySelector('.notification-dot');
    if (notificationDot) {
        notificationDot.style.display = hasNewRequests ? 'block' : 'none';
    }
}

// Обновим функцию загрузки заявок в друзья
async function loadFriendRequests() {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/friend-requests?userId=${currentUser.id}`);
        const data = await response.json();
        
        // Обновляем отображение количества заявок
        updateRequestsCount(data.requests.length);
        
        // Показываем/скрываем индикатор уведомлений
        updateNotificationDot(data.requests.length > 0);
        
        // Отображаем заявки
        displayFriendRequests(data.requests);
    } catch (err) {
        console.error('Error loading friend requests:', err);
    }
}

// Обновим обработчик клика по кнопке друзей
document.querySelector('.friends-header-btn').addEventListener('click', () => {
    // Скрываем индикатор при открытии модального окна
    updateNotificationDot(false);
    
    // Обновляем списки
    loadFriends();
    loadFriendRequests();
});

// Добавим периодическую проверку новых заявок
function startFriendRequestsCheck() {
    setInterval(() => {
        loadFriendRequests();
    }, 30000); // Проверяем каждые 30 секунд
}

// Запускаем проверку при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadFriendRequests();
    startFriendRequestsCheck();
});

// Добавьте в обработчик WebSocket-событий

socket.on('friend_request', (data) => {
    if (data.receiverId === currentUser.id) {
        // Показываем индикатор уведомления
        updateNotificationDot(true);
        // Обновляем список заявок
        loadFriendRequests();
    }
});
