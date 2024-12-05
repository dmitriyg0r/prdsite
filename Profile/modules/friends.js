import { apiRequest, showError, showSuccess } from './utils.js';

export const loadFriendsList = async () => {
    try {
        const response = await apiRequest('/friends/list');
        if (response.success) {
            const friendsList = document.getElementById('friends-list');
            if (!friendsList) return;
            
            friendsList.innerHTML = '';
            response.data.forEach(friend => {
                const friendItem = document.createElement('div');
                friendItem.className = 'friend-item';
                friendItem.innerHTML = `
                    <img src="${friend.avatarUrl || `${API_BASE_URL}/uploads/default-avatar.png`}" alt="Аватар" class="friend-avatar">
                    <span>${friend.username}</span>
                `;
                friendsList.appendChild(friendItem);
            });
        }
    } catch (error) {
        console.error('Error loading friends:', error);
        showError('Ошибка при загрузке списка друзей');
    }
};

export const loadFriendRequests = async () => {
    try {
        const response = await apiRequest('/friends/requests');
        if (response.success) {
            const requestsList = document.getElementById('friend-requests-list');
            if (!requestsList) return;
            
            requestsList.innerHTML = '';
            response.data.forEach(request => {
                const requestItem = document.createElement('div');
                requestItem.className = 'friend-request-item';
                requestItem.innerHTML = `
                    <img src="${request.avatarUrl || `${API_BASE_URL}/uploads/default-avatar.png`}" alt="Аватар" class="friend-avatar">
                    <span>${request.username}</span>
                    <div class="request-actions">
                        <button class="btn primary-btn" onclick="acceptFriendRequest('${request.id}')">Принять</button>
                        <button class="btn danger-btn" onclick="rejectFriendRequest('${request.id}')">Отклонить</button>
                    </div>
                `;
                requestsList.appendChild(requestItem);
            });
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
        showError('Ошибка при загрузке запросов в друзья');
    }
};

export const sendFriendRequest = async (username) => {
    try {
        const response = await apiRequest('/friends/send-request', {
            method: 'POST',
            body: JSON.stringify({ to: username })
        });
        if (response.success) {
            showSuccess('Запрос в друзья отправлен');
        }
    } catch (error) {
        showError('Ошибка при отправке запроса в друзья');
    }
};

export const acceptFriendRequest = async (requestId) => {
    try {
        const response = await apiRequest(`/friends/accept/${requestId}`, {
            method: 'POST'
        });
        if (response.success) {
            showSuccess('Запрос в друзья принят');
            loadFriendRequests();
            loadFriendsList();
        }
    } catch (error) {
        showError('Ошибка при принятии запроса в друзья');
    }
};

export const rejectFriendRequest = async (requestId) => {
    try {
        const response = await apiRequest(`/friends/reject/${requestId}`, {
            method: 'POST'
        });
        if (response.success) {
            showSuccess('Запрос в друзья отклонён');
            loadFriendRequests();
        }
    } catch (error) {
        showError('Ошибка п��и отклонении запроса в друзья');
    }
};

export const removeFriend = async (username) => {
    try {
        const response = await apiRequest(`/friends/remove/${username}`, {
            method: 'DELETE'
        });
        if (response.success) {
            showSuccess('Друг удалён');
            loadFriendsList();
        }
    } catch (error) {
        showError('Ошибка при удалении друга');
    }
};

export const searchUsers = async (query) => {
    try {
        const response = await apiRequest(`/users/search?query=${query}`);
        if (response.success) {
            // Оработка езультатов поиска
        }
    } catch (error) {
        showError('Ошибка при поиске пользователей');
    }
};

export const toggleFriendsList = () => {
    const friendsList = document.querySelector('.friends-preview');
    if (friendsList) {
        friendsList.classList.toggle('expanded');
        friendsList.classList.toggle('collapsed');
    }
};