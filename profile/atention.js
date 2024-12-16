// Добавьте в начало файла atention.js

// Функция для обновления счетчика заявок
function updateRequestsCount(count) {
    const requestCountElement = document.querySelector('.request-count');
    if (requestCountElement) {
        requestCountElement.textContent = count;
    }
}

// Функция для отображения заявок в друзья
function displayFriendRequests(requests) {
    const requestsList = document.querySelector('.requests-list');
    if (!requestsList) return;

    if (requests.length === 0) {
        requestsList.innerHTML = '<div class="empty-state">Нет новых заявок в друзья</div>';
        return;
    }

    requestsList.innerHTML = requests.map(request => `
        <div class="friend-request-item">
            <img src="${request.sender_avatar || '/uploads/avatars/default.png'}" 
                 alt="${request.sender_name}" 
                 class="friend-avatar">
            <div class="friend-info">
                <span class="friend-name">${request.sender_name}</span>
                <div class="friend-actions">
                    <button onclick="acceptFriendRequest(${request.id})" class="accept-btn">
                        <i class="fas fa-check"></i> Принять
                    </button>
                    <button onclick="rejectFriendRequest(${request.id})" class="reject-btn">
                        <i class="fas fa-times"></i> Отклонить
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Функция для обновления индикатора уведомлений
function updateNotificationDot(hasNewRequests) {
    const notificationDot = document.querySelector('.notification-dot');
    if (notificationDot) {
        notificationDot.style.display = hasNewRequests ? 'block' : 'none';
    }
}

// Функция загрузки заявок в друзья
async function loadFriendRequests() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser) return;

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

// Функция для периодической проверки новых заявок
function startFriendRequestsCheck() {
    setInterval(() => {
        loadFriendRequests();
    }, 30000); // Проверяем каждые 30 секунд
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Добавляем обработчик клика по кнопке друзей
    const friendsBtn = document.querySelector('.friends-header-btn');
    if (friendsBtn) {
        friendsBtn.addEventListener('click', () => {
            // Скрываем индикатор при открытии модального окна
            updateNotificationDot(false);
            
            // Обновляем списки
            loadFriendRequests();
        });
    }

    // Запускаем первичную загрузку и периодическую проверку
    loadFriendRequests();
    startFriendRequestsCheck();
});

// Обработчик WebSocket-событий (если WebSocket уже инициализирован)
if (typeof socket !== 'undefined') {
    socket.on('friend_request', (data) => {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (data.receiverId === currentUser?.id) {
            // Показываем индикатор уведомления
            updateNotificationDot(true);
            // Обновляем список заявок
            loadFriendRequests();
        }
    });
}
