// Глобальные переменные
let currentUser = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser) {
            window.location.href = '/authreg/authreg.html';
            return;
        }

        await loadUsers();
    } catch (err) {
        console.error('Initialization error:', err);
    }
});

// Загрузка пользователей
async function loadUsers() {
    try {
        const response = await fetch(`https://adminflow.ru/api/users-list?userId=${currentUser.id}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка при загрузке пользователей');
        }

        displayUsers(data.users);
    } catch (err) {
        console.error('Error loading users:', err);
        throw new Error('Ошибка при загрузке пользователей');
    }
}

// Отображение пользователей
function displayUsers(users) {
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
            ${getFriendshipButton(user)}
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

function getFriendshipButton(user) {
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