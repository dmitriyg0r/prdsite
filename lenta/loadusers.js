// Проверяем, что скрипт загрузился
console.log('loadusers.js loaded');

async function loadUsers() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        console.log('Current user from localStorage:', currentUser);

        if (!currentUser || !currentUser.id) {
            throw new Error('Пользователь не авторизован');
        }

        const url = `https://adminflow.ru/api/users-list?userId=${currentUser.id}`;
        console.log('Fetching users from:', url);

        const response = await fetch(url);
        console.log('Response:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error response:', errorData);
            throw new Error(errorData.error || 'Ошибка при загрузке пользователей');
        }

        const data = await response.json();
        console.log('Users data:', data);

        displayUsers(data.users);
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-list');
    if (!container) {
        console.error('Users container not found');
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="user-item">
            <a href="/profile/profile.html?id=${user.id}" class="user-link">
                <img src="${user.avatar_url || '/uploads/avatars/default.png'}" 
                     alt="${user.username}" 
                     class="user-avatar">
                <div class="user-info">
                    <span class="user-name">${user.username}</span>
                    <span class="user-status ${getStatusClass(user.last_activity)}"></span>
                </div>
            </a>
            ${getFriendshipButton(user)}
        </div>
    `).join('');

    console.log('Users displayed:', users.length);
}

function getStatusClass(lastActivity) {
    const diff = Date.now() - new Date(lastActivity);
    if (diff < 5 * 60 * 1000) return 'online';
    if (diff < 15 * 60 * 1000) return 'away';
    return 'offline';
}

function getFriendshipButton(user) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (user.id === currentUser.id) return '';

    switch(user.friendship_status) {
        case 'none':
            return `<button onclick="addFriend(${user.id})" class="friend-btn add-friend">Добавить в друзья</button>`;
        case 'pending':
            return `<button disabled class="friend-btn pending">Запрос отправлен</button>`;
        case 'accepted':
            return `<button onclick="removeFriend(${user.id})" class="friend-btn remove-friend">Удалить из друзей</button>`;
        default:
            return '';
    }
}

async function addFriend(friendId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch('https://adminflow.ru/api/friend-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to send friend request');
        }

        // Обновляем список пользователей
        await loadUsers();
    } catch (err) {
        console.error('Error sending friend request:', err);
        alert('Ошибка при отправке заявки в друзья');
    }
}

async function removeFriend(friendId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch('https://adminflow.ru/api/friend/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to remove friend');
        }

        // Обновляем список пользователей
        await loadUsers();
    } catch (err) {
        console.error('Error removing friend:', err);
        alert('Ошибка при удалении из друзей');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing users...');
    try {
        await loadUsers();
    } catch (err) {
        console.error('Initialization error:', err);
    }
});
