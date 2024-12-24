// Глобальные переменные
let lastStatusUpdate = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            window.location.href = '/authreg/authreg.html';
            return;
        }

        await Promise.all([
            loadUsers(user),
            startStatusUpdates(user)
        ]);
    } catch (err) {
        console.error('Initialization error:', err);
    }
});

// Загрузка пользователей
async function loadUsers(user) {
    try {
        const response = await fetch(`https://adminflow.ru/api/users-list?userId=${user.id}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка при загрузке пользователей');
        }

        displayUsers(data.users, user.id);
    } catch (err) {
        console.error('Error loading users:', err);
        throw new Error('Ошибка при загрузке пользователей');
    }
}

// Обновление статуса
async function updateUserStatus(user) {
    try {
        if (lastStatusUpdate && Date.now() - lastStatusUpdate < 2000) {
            return;
        }

        const response = await fetch('https://adminflow.ru/api/users/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                is_online: true,
                last_activity: new Date().toISOString()
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to update status');
        }

        lastStatusUpdate = Date.now();
    } catch (err) {
        console.error('Error updating status:', err);
    }
}

// Запуск обновления статуса
function startStatusUpdates(user) {
    // Обновляем статус каждые 30 секунд
    setInterval(() => updateUserStatus(user), 30000);
    
    // Обновляем при активности пользователя
    document.addEventListener('mousemove', () => updateUserStatus(user));
    document.addEventListener('keydown', () => updateUserStatus(user));
    
    // Первое обновление
    updateUserStatus(user);
}

// Отображение пользователей
function displayUsers(users, currentUserId) {
    const usersList = document.querySelector('.users-list');
    if (!usersList) return;

    usersList.innerHTML = users.map(user => `
        <div class="user-item" data-id="${user.id}">
            <img src="${user.avatar_url}" alt="${user.username}">
            <div class="user-info">
                <span class="username">${user.username}</span>
                <span class="role">${user.role || 'user'}</span>
                <span class="status ${getStatusClass(user.last_activity)}"></span>
            </div>
            ${getFriendshipButton(user, currentUserId)}
        </div>
    `).join('');
}

// Вспомогательные функции
function getStatusClass(lastActivity) {
    const diff = Date.now() - new Date(lastActivity);
    if (diff < 5 * 60 * 1000) return 'online';
    if (diff < 15 * 60 * 1000) return 'away';
    return 'offline';
}

function getFriendshipButton(user, currentUserId) {
    if (user.id === currentUserId) return '';
    
    switch(user.friendship_status) {
        case 'none':
            return `<button onclick="addFriend(${user.id})">Добавить в друзья</button>`;
        case 'pending':
            return `<button disabled>Запрос отправлен</button>`;
        case 'accepted':
            return `<button onclick="removeFriend(${user.id})">Удалить из друзей</button>`;
        default:
            return '';
    }
}

// Функции для работы с друзьями
async function addFriend(friendId) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch('https://adminflow.ru/api/friend-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                friendId: friendId
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to send friend request');
        }

        // Обновляем список пользователей
        await loadUsers(user);
    } catch (err) {
        console.error('Error sending friend request:', err);
        alert('Ошибка при отправке заявки в друзья');
    }
}

async function removeFriend(friendId) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch('https://adminflow.ru/api/friend/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                friendId: friendId
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to remove friend');
        }

        // Обновляем список пользователей
        await loadUsers(user);
    } catch (err) {
        console.error('Error removing friend:', err);
        alert('Ошибка при удалении из друзей');
    }
} 