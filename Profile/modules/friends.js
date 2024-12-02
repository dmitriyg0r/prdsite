import { API_BASE_URL, showError, showSuccess, apiRequest } from './utils.js';

// Функция загрузки списка друзей
export async function loadFriendsList() {
    try {
        const response = await apiRequest('/friends');

        if (response.success) {
            const friendsList = document.getElementById('friends-list');
            if (friendsList) {
                friendsList.innerHTML = response.data.map(friend => `
                    <tr>
                        <td>
                            <img src="${friend.avatar || '/api/uploads/avatars/default-avatar.png'}" 
                                 alt="Avatar" class="friend-avatar">
                        </td>
                        <td>
                            <span class="friend-username" onclick="showFriendWall('${friend.username}')" 
                                  style="cursor: pointer;">
                                ${friend.username}
                            </span>
                        </td>
                        <td>
                            <span class="friend-status ${friend.online ? 'online' : 'offline'}">
                                ${friend.online ? 'Онлайн' : 'Оффлайн'}
                            </span>
                        </td>
                        <td>
                            <div class="friend-actions">
                                <button class="btn primary-btn" onclick="openChat('${friend.username}')">
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

// Функция загрузки входящих заявок в друзья
export async function loadFriendRequests() {
    try {
        const response = await apiRequest('/friends/requests');

        if (response.success) {
            const requestsList = document.getElementById('friend-requests-list');
            if (requestsList) {
                requestsList.innerHTML = response.data.map(request => `
                    <div class="friend-request">
                        <img src="${request.avatar || '/api/uploads/avatars/default-avatar.png'}" 
                             alt="Avatar" class="request-avatar">
                        <span class="request-username">${request.username}</span>
                        <div class="request-actions">
                            <button class="btn success-btn" onclick="acceptFriendRequest('${request.username}')">
                                <i class="fas fa-check"></i> Принять
                            </button>
                            <button class="btn danger-btn" onclick="rejectFriendRequest('${request.username}')">
                                <i class="fas fa-times"></i> Отклонить
                            </button>
                        </div>
                    </div>
                `).join('');

                // Обновляем счетчик заявок
                updateFriendRequestsCounter(response.data.length);
            }
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
        showError('Ошибка при загрузке заявок в друзья');
    }
}

// Функция отправки заявки в друзья
export async function sendFriendRequest(username) {
    try {
        const response = await apiRequest('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ username })
        });

        if (response.success) {
            showSuccess('Заявка в друзья отправлена');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showError(error.message || 'Ошибка при отправке заявки в друзья');
    }
}

// Функция принятия заявки в друзья
export async function acceptFriendRequest(username) {
    try {
        const response = await apiRequest(`/friends/accept/${username}`, {
            method: 'POST'
        });

        if (response.success) {
            showSuccess('Заявка в друзья принята');
            await loadFriendRequests(); // Обновляем список заявок
            await loadFriendsList(); // Обновляем список друзей
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showError('Ошибка при принятии заявки в друзья');
    }
}

// Функция отклонения заявки в друзья
export async function rejectFriendRequest(username) {
    try {
        const response = await apiRequest(`/friends/reject/${username}`, {
            method: 'POST'
        });

        if (response.success) {
            showSuccess('Заявка в друзья отклонена');
            await loadFriendRequests();
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showError('Ошибка при отклонении заявки в друзья');
    }
}

// Функция удаления из друзей
export async function removeFriend(username) {
    if (!confirm(`Вы уверены, что хотите удалить ${username} из друзей?`)) {
        return;
    }

    try {
        const response = await apiRequest(`/friends/${username}`, {
            method: 'DELETE'
        });

        if (response.success) {
            showSuccess('Друг успешно удален');
            await loadFriendsList();
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showError('Ошибка при удалении из друзей');
    }
}

// Функция поиска пользователей
export async function searchUsers(query) {
    try {
        const response = await apiRequest(`/users/search?query=${encodeURIComponent(query)}`);

        if (response.success) {
            const searchResults = document.getElementById('search-results');
            if (searchResults) {
                searchResults.innerHTML = response.data.map(user => `
                    <div class="search-result">
                        <img src="${user.avatar || '/api/uploads/avatars/default-avatar.png'}" 
                             alt="Avatar" class="search-avatar">
                        <span class="search-username">${user.username}</span>
                        <button class="btn primary-btn" onclick="sendFriendRequest('${user.username}')">
                            <i class="fas fa-user-plus"></i> Добавить в друзья
                        </button>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error searching users:', error);
        showError('Ошибка при поиске пользователей');
    }
}

// Функция обновления счетчика заявок в друзья
function updateFriendRequestsCounter(count) {
    const counter = document.getElementById('friend-requests-counter');
    if (counter) {
        counter.textContent = count;
        counter.style.display = count > 0 ? 'block' : 'none';
    }
}

// Функция отображения стены друга
export async function showFriendWall(username) {
    try {
        // Скрываем форму создания поста при просмотре чужой стены
        const postForm = document.querySelector('.post-form');
        const wallTitle = document.querySelector('.wall-section h3');
        const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
        
        if (username === currentUser) {
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
            if (postsContainer) {
                postsContainer.innerHTML = response.data.map(post => createPostElement(post)).join('');
            }
        }
    } catch (error) {
        console.error('Error showing friend wall:', error);
        showError('Ошибка при загрузке стены пользователя');
    }
}

// Функция создания элемента поста
function createPostElement(post) {
    const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
    
    return `
        <div class="post">
            <div class="post-header">
                <img src="${post.authorAvatar || '/api/uploads/avatars/default-avatar.png'}" 
                     alt="Avatar" class="post-avatar">
                <div class="post-info">
                    <div class="post-author">${post.author}</div>
                    <div class="post-date">${new Date(post.createdAt).toLocaleString()}</div>
                </div>
            </div>
            <div class="post-content">${post.content}</div>
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
            <div class="post-actions">
                <div class="post-action" onclick="likePost('${post.id}')">
                    <i class="fas fa-heart ${post.likedBy.includes(currentUser) ? 'liked' : ''}"></i>
                    <span>${post.likes || 0}</span>
                </div>
                ${post.author === currentUser ? `
                    <div class="post-action" onclick="deletePost('${post.id}')">
                        <i class="fas fa-trash"></i>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Экспортируем все функции
export {
    updateFriendRequestsCounter,
    createPostElement
};