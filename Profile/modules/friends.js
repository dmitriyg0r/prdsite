import { API_BASE_URL, showError, showSuccess, apiRequest } from './utils.js';

// Функция загрузки списка друзей
async function loadFriendsList() {
    try {
        const response = await apiRequest('/friends/list');

        if (response.success) {
            const friendsList = document.getElementById('friends-list');
            if (friendsList) {
                friendsList.innerHTML = response.data.map(friend => `
                    <tr>
                        <td>
                            <img src="${friend.avatarUrl ? `${API_BASE_URL}${friend.avatarUrl}` : `${API_BASE_URL}/uploads/avatars/default-avatar.png`}" 
                                alt="Avatar" 
                                class="friend-avatar">
                        </td>
                        <td>
                            <span class="friend-username" onclick="showFriendWall('${friend.username}')" 
                                  style="cursor: pointer;">
                                ${friend.username}
                            </span>
                        </td>
                        <td>
                            <span class="friend-status ${friend.online ? 'status-online' : 'status-offline'}">
                                ${friend.online ? 'Онлайн' : 'Оффлайн'}
                            </span>
                        </td>
                        <td>
                            <div class="friend-actions">
                                <button class="btn chat-btn" onclick="openChat('${friend.username}')">
                                    <i class="fas fa-comment"></i> Чат
                                </button>
                                <button class="btn danger-btn" onclick="removeFriend('${friend.username}')">
                                    <i class="fas fa-user-minus"></i> Удалить
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading friends list:', error);
        showError('Ошибка при загрузке списка друзей');
    }
}

// Функция загрузки запросов в друзья
async function loadFriendRequests() {
    try {
        const response = await apiRequest('/friends/requests');

        if (response.success) {
            const requestsList = document.getElementById('friend-requests-list');
            requestsList.innerHTML = response.data.map(request => `
                <div class="friend-request-item">
                    <div class="user-info">
                        <img src="${request.avatarUrl ? `${API_BASE_URL}${request.avatarUrl}` : `${API_BASE_URL}/uploads/avatars/default-avatar.png`}" alt="Avatar" class="friend-avatar">
                        <span>${request.username}</span>
                    </div>
                    <div class="request-actions">
                        <button class="btn primary-btn" onclick="acceptFriendRequest('${request.id}')">
                            Принять
                        </button>
                        <button class="btn danger-btn" onclick="rejectFriendRequest('${request.id}')">
                            Отклонить
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
        showError('Ошибка при загрузке запросов в друзья');
    }
}

// Функция отправки запроса в друзья
async function sendFriendRequest(targetUsername) {
    try {
        const response = await apiRequest('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ targetUsername })
        });

        if (response.success) {
            showSuccess('Запрос в друзья отправлен');
            document.getElementById('add-friend-modal').style.display = 'none';
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showError(error.message || 'Ошибка при отправке запроса в друзья');
    }
}

// Функция принятия запроса в друзья
async function acceptFriendRequest(requestId) {
    try {
        const response = await apiRequest(`/friends/accept/${requestId}`, {
            method: 'POST'
        });

        if (response.success) {
            showSuccess('Запрос в друзья принят');
            await loadFriendRequests();
            await loadFriendsList();
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showError('Ошибка при принятии запроса в друзья');
    }
}

// Функция отклонения запроса в друзья
async function rejectFriendRequest(requestId) {
    try {
        const response = await apiRequest(`/friends/reject/${requestId}`, {
            method: 'POST'
        });

        if (response.success) {
            showSuccess('Запрос в друзья отклонен');
            await loadFriendRequests();
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showError('Ошибка при отклонении запроса в друзья');
    }
}

// Функция удаления друга
async function removeFriend(friendUsername) {
    if (!confirm(`Вы уверены, что хотите удалить ${friendUsername} из друзей?`)) {
        return;
    }

    try {
        const response = await apiRequest(`/friends/remove/${friendUsername}`, {
            method: 'DELETE'
        });

        if (response.success) {
            showSuccess('Друг успешно удален');
            await loadFriendsList();
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showError('Ошибка при удалении друга');
    }
}

// Функция поиска пользователей
let searchTimeout;
async function searchUsers(searchTerm) {
    const searchResults = document.getElementById('search-results');
    
    clearTimeout(searchTimeout);
    
    if (!searchTerm) {
        searchResults.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const response = await apiRequest(`/users/search?query=${searchTerm}`);

            if (response.success) {
                searchResults.innerHTML = response.data
                    .map(user => `
                        <div class="search-result-item" onclick="sendFriendRequest('${user.username}')">
                            <img src="${user.avatarUrl ? `${API_BASE_URL}${user.avatarUrl}` : `${API_BASE_URL}/uploads/avatars/default-avatar.png`}" alt="Avatar">
                            <span>${user.username}</span>
                        </div>
                    `)
                    .join('');
                searchResults.style.display = 'block';
            }
        } catch (error) {
            console.error('Error searching users:', error);
            showError('Ошибка при поиске пользователей');
        }
    }, 300);
}

// Функция для отображения стены друга
async function showFriendWall(username) {
    try {
        // Скрываем форму создания поста при просмотре чужой стены
        const postForm = document.querySelector('.post-form');
        const wallTitle = document.querySelector('.wall-section h3');
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        if (username === currentUser.data.username) {
            postForm.style.display = 'block';
            wallTitle.textContent = 'Моя стена';
        } else {
            postForm.style.display = 'none';
            wallTitle.textContent = `Стена пользователя ${username}`;
        }

        // Загружаем посты друга
        const response = await apiRequest(`/posts/${username}`);

        if (response.success) {
            const postsContainer = document.getElementById('posts-container');
            postsContainer.innerHTML = response.data.map(post => `
                <div class="post">
                    <div class="post-header">
                        <img src="${post.authorAvatar ? `${API_BASE_URL}${post.authorAvatar}` : `${API_BASE_URL}/uploads/avatars/default-avatar.png`}" 
                             alt="Avatar" class="post-avatar">
                        <div class="post-info">
                            <div class="post-author">${post.author}</div>
                            <div class="post-date">${new Date(post.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${post.image ? `<img src="${API_BASE_URL}${post.image}" alt="Post image" class="post-image">` : ''}
                    <div class="post-actions">
                        <div class="post-action" onclick="likePost('${post.id}')">
                            <i class="fas fa-heart ${post.likedBy.includes(currentUser.data.username) ? 'liked' : ''}"></i>
                            <span>${post.likes || 0}</span>
                        </div>
                        ${post.author === currentUser.data.username ? `
                            <div class="post-action" onclick="deletePost('${post.id}')">
                                <i class="fas fa-trash"></i>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading friend posts:', error);
        showError('Ошибка при загрузке постов');
    }
}

// Экспорт функций
export {
    loadFriendsList,
    loadFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    showFriendWall
};

// В функции, которая создает список друзей, измените обработчик клика на чат
function createFriendElement(friend) {
    return `
        <tr>
            <td>
                <img src="${friend.avatar || '../assets/default-avatar.png'}" alt="Avatar" class="friend-avatar">
            </td>
            <td>${friend.username}</td>
            <td>${friend.status || 'Offline'}</td>
            <td>
                <button class="btn primary-btn" onclick="openFriendChat('${friend.username}')">
                    <i class="fas fa-comments"></i> Чат
                </button>
                <button class="btn danger-btn" onclick="removeFriend('${friend.username}')">
                    <i class="fas fa-user-minus"></i>
                </button>
            </td>
        </tr>
    `;
}

// Добавьте новую функцию для открытия чата
window.openFriendChat = function(username) {
    // Сохраняем имя пользователя для чата в localStorage
    localStorage.setItem('chatPartner', username);
    // Перенаправляем на страницу чата
    window.location.href = '../chat/chat.html';
};