// Константы
const API_BASE_URL = 'https://adminflow.ru/api';
const DEFAULT_AVATAR_PATH = '/uploads/default-avatar.png';

// Утилиты
const showError = (message) => {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
};

const showSuccess = (message) => {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
};

const apiRequest = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user'))?.data?.username || ''}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Request failed (${url}):`, error);
        throw error;
    }
};

// Функции аутентификации
const handleLogin = async (event) => {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success) {
            localStorage.setItem('user', JSON.stringify(response.data));
            showSuccess('Вход выполнен успешно');
            await showProfile(response.data);
            showChatButton();
            startRoleChecking();
        }
    } catch (error) {
        showError('Ошибка входа');
    }
};

const handleRegister = async (event) => {
    event.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success) {
            showSuccess('Регистрация успешна');
            showLoginForm();
        }
    } catch (error) {
        showError('Ошибка регистрации');
    }
};

const handleLogout = async () => {
    try {
        localStorage.removeItem('user');
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('profile-info').style.display = 'none';
        document.getElementById('admin-section').style.display = 'none';
        
        const chatLink = document.getElementById('chat-link');
        if (chatLink) {
            chatLink.style.display = 'none';
        }
        
        showSuccess('Вы успешно вышли из системы');
        stopRoleChecking();
    } catch (error) {
        showError('Ошибка при выходе из системы');
    }
};

// Функции профиля
const showProfile = async (userData) => {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('profile-info').style.display = 'block';

    document.getElementById('profile-username').textContent = userData.username;
    document.getElementById('profile-role').textContent = userData.role;

    await loadUserAvatar(userData.username);
};

const loadUserAvatar = async (username) => {
    if (!username) {
        console.error('Username is undefined');
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = DEFAULT_AVATAR_PATH;
        }
        return;
    }

    try {
        const response = await apiRequest(`/users/${username}/avatar`);
        
        if (response.success && response.data.avatarUrl) {
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                userAvatar.src = response.data.avatarUrl.startsWith('http') 
                    ? response.data.avatarUrl 
                    : `${API_BASE_URL}${response.data.avatarUrl}`;
            }
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = DEFAULT_AVATAR_PATH;
        }
    }
};

// Функции друзей
const loadFriendsList = async () => {
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
                    <button class="chat-btn" onclick="openChat('${friend.username}')">Чат</button>
                `;
                friendsList.appendChild(friendItem);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке списка друзей');
    }
};

const loadFriendRequests = async () => {
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
                        <button onclick="acceptFriendRequest('${request.id}')" class="accept-btn">Принять</button>
                        <button onclick="rejectFriendRequest('${request.id}')" class="reject-btn">Отклонить</button>
                    </div>
                `;
                requestsList.appendChild(requestItem);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке запросов в друзья');
    }
};

// Функции постов
const createPost = async () => {
    const content = document.getElementById('post-content').value;
    if (!content.trim()) {
        showError('Пост не может быть пустым');
        return;
    }

    try {
        const response = await apiRequest('/posts', {
            method: 'POST',
            body: JSON.stringify({ content })
        });

        if (response.success) {
            showSuccess('Пост создан');
            document.getElementById('post-content').value = '';
            loadPosts();
        }
    } catch (error) {
        showError('Ошибка при создании поста');
    }
};

const loadPosts = async () => {
    try {
        const response = await apiRequest('/posts');
        if (response.success) {
            const postsContainer = document.getElementById('posts-container');
            if (!postsContainer) return;
            
            postsContainer.innerHTML = '';
            response.data.forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${post.authorAvatar || `${API_BASE_URL}/uploads/default-avatar.png`}" alt="Аватар" class="post-avatar">
                        <div class="post-info">
                            <span class="post-author">${post.author}</span>
                            <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    <div class="post-actions">
                        <button onclick="likePost('${post.id}')" class="like-btn ${post.liked ? 'liked' : ''}">
                            <i class="fas fa-heart"></i> ${post.likes}
                        </button>
                        ${post.canDelete ? `
                            <button onclick="deletePost('${post.id}')" class="delete-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                `;
                postsContainer.appendChild(postElement);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке постов');
    }
};

// Админские функции
const loadUsers = async () => {
    try {
        const response = await apiRequest('/users/list');
        if (response.success) {
            const usersTableBody = document.getElementById('users-table-body');
            if (!usersTableBody) return;
            
            usersTableBody.innerHTML = '';
            response.data.forEach(user => {
                const userRow = document.createElement('tr');
                userRow.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button onclick="changeRole('${user.username}')" class="role-btn">Изменить роль</button>
                        <button onclick="deleteUser('${user.username}')" class="delete-btn">Удалить</button>
                    </td>
                `;
                usersTableBody.appendChild(userRow);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке пользователей');
    }
};

// Глобальные переменные и интервалы
let roleCheckInterval;

// Функции проверки роли
const startRoleChecking = () => {
    checkUserRole();
    roleCheckInterval = setInterval(checkUserRole, 30000);
};

const stopRoleChecking = () => {
    if (roleCheckInterval) {
        clearInterval(roleCheckInterval);
    }
};

const checkUserRole = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        const response = await apiRequest(`/users/${user.username}/role`);
        if (response.success) {
            updateInterfaceBasedOnRole(response.data.role);
        }
    } catch (error) {
        console.error('Ошибка при проверке роли:', error);
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            await showProfile(user);
            startRoleChecking();
            showChatButton();
        }

        // Загрузка начальных данных
        await Promise.all([
            loadFriendsList(),
            loadFriendRequests(),
            loadPosts()
        ]);

        // Обработчики форм
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const postForm = document.getElementById('post-form');

        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (registerForm) registerForm.addEventListener('submit', handleRegister);
        if (postForm) postForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createPost();
        });

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Ошибка при инициализации приложения');
    }
});

// Обработчики событий окна
window.addEventListener('beforeunload', stopRoleChecking);

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError('Произошла непредвиденная ошибка');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('Произошла ошибка при выполнении асинхронной операции');
});

// Экспорт глобальных функций
window.openChat = openChat;
window.showAddFriendModal = showAddFriendModal;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.likePost = likePost;
window.deletePost = deletePost;
window.changeRole = changeRole;
window.deleteUser = deleteUser;

