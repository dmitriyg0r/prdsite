// Добавить в начало файла
const API_BASE_URL = 'https://adminflow.ru';

// Константы для путей API
const API_PATHS = {
    UPLOAD_AVATAR: '/api/users/upload-avatar.php',
    POSTS: '/users/posts.php',
    FRIENDS: '/users/friends.php',
    FRIEND_REQUESTS: '/users/friend-requests.php',
    PASSWORD: '/auth/register.php',
    AUTH: '/auth/login.php'
};

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

function showLoginForm() {
    // Показываем форму входа
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) {
        loginContainer.style.display = 'block';
    }

    // Скрываем форму регистрации
    const registerContainer = document.getElementById('register-container');
    if (registerContainer) {
        registerContainer.style.display = 'none';
    }
}

function showRegisterForm() {
    // Скрываем форму входа
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) {
        loginContainer.style.display = 'none';
    }

    // Показываем форму регист��ации
    const registerContainer = document.getElementById('register-container');
    if (registerContainer) {
        registerContainer.style.display = 'block';
    }
}

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
    // Если endpoint начинается с '/', убираем его, так как он уже есть в API_PATHS
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    // Проверяем, есть ли путь в API_PATHS
    const apiPath = Object.values(API_PATHS).find(path => cleanEndpoint.includes(path));
    const url = apiPath 
        ? `${API_BASE_URL}${apiPath}`
        : `${API_BASE_URL}/api/${cleanEndpoint}`;
    
    try {
        const token = getToken(); // Используем функцию получения токена
        
        console.log('Sending request to:', url);
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    } catch (error) {
        console.error(`API Request failed (${url}):`, error);
        throw error;
    }
};

// Функции аутентификации
const handleLogin = async (event) => {
    event.preventDefault();
    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;

    if (!username || !password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await apiRequest(API_PATHS.AUTH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username.trim(),
                password: password.trim()
            })
        });

        if (response.success) {
            localStorage.setItem('user', JSON.stringify(response.data));
            showSuccess('Вход выполнен успешно');
            location.reload();
        } else {
            showError(response.error || 'Ошибка при входе');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showError('Ошибка при входе');
    }
};

const handleRegister = async (event) => {
    event.preventDefault();
    const username = document.getElementById('reg-username')?.value;
    const password = document.getElementById('reg-password')?.value;

    if (!username || !password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await apiRequest(API_PATHS.PASSWORD, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success) {
            showSuccess('Регистрация успешна');
            showLoginForm();
        } else {
            showError(response.error || 'Ошибка при регистрации');
        }
    } catch (error) {
        showError('��шибка при регистрации');
    }
};

const handleLogout = async () => {
    try {
        localStorage.removeItem('user');
        const loginContainer = document.getElementById('login-container');
        const profileInfo = document.getElementById('profile-info');
        const adminSection = document.getElementById('admin-section');
        const chatLink = document.getElementById('chat-link');

        if (loginContainer) loginContainer.style.display = 'block';
        if (profileInfo) profileInfo.style.display = 'none';
        if (adminSection) adminSection.style.display = 'none';
        if (chatLink) chatLink.style.display = 'none';
        
        showSuccess('Вы успешно вышли из системы');
        stopRoleChecking();
    } catch (error) {
        showError('Ошибка при выходе из системы');
    }
};

// Функции профиля
const showProfile = async (userData) => {
    if (!userData) {
        console.error('User data is missing');
        return;
    }

    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    const profileInfo = document.getElementById('profile-info');
    const profileUsername = document.getElementById('profile-username');
    const profileRole = document.getElementById('profile-role');

    if (loginContainer) loginContainer.style.display = 'none';
    if (registerContainer) registerContainer.style.display = 'none';
    if (profileInfo) profileInfo.style.display = 'block';
    if (profileUsername) profileUsername.textContent = userData.username;
    if (profileRole) profileRole.textContent = userData.role;

    await loadUserAvatar(userData.username);
};

const loadUserAvatar = async (username) => {
    if (!username) {
        console.error('Username is undefined');
        return;
    }

    try {
        const response = await apiRequest(`/users/avatar`, {
            method: 'GET',
            headers: {
                'X-Username': username
            }
        });
        
        const userAvatar = document.getElementById('user-avatar');
        if (!userAvatar) return;

        if (response.success && response.data.avatarUrl) {
            userAvatar.src = response.data.avatarUrl.startsWith('http') 
                ? response.data.avatarUrl 
                : `${API_BASE_URL}/uploads/avatars/${response.data.avatarUrl}`;
        } else {
            userAvatar.src = `${API_BASE_URL}/uploads/avatars/default-avatar.png`;
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = `${API_BASE_URL}/uploads/avatars/default-avatar.png`;
        }
    }
};

// Функции друзей
const loadFriendsList = async () => {
    try {
        const response = await apiRequest('/users/friends');
        if (response.success) {
            const friendsList = document.getElementById('friends-list');
            if (!friendsList) return;
            
            friendsList.innerHTML = '';
            response.data.forEach(friend => {
                const friendItem = document.createElement('tr');
                friendItem.innerHTML = `
                    <td>
                        <img src="${friend.avatarUrl || `${API_BASE_URL}/uploads/avatars/default-avatar.png`}" alt="Аватар" class="friend-avatar">
                    </td>
                    <td>${friend.username}</td>
                    <td>
                        <span class="status-indicator ${friend.online ? 'online' : 'offline'}">
                            ${friend.online ? 'Онлайн' : 'Оффлайн'}
                        </span>
                    </td>
                    <td>
                        <button class="btn primary-btn" onclick="openChat('${friend.username}')">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="btn danger-btn" onclick="removeFriend('${friend.username}')">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </td>
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
        const response = await apiRequest('/users/friend-requests');
        if (response.success) {
            const requestsList = document.getElementById('friend-requests-list');
            if (!requestsList) return;
            
            requestsList.innerHTML = '';
            response.data.forEach(request => {
                const requestItem = document.createElement('div');
                requestItem.className = 'friend-request-item';
                requestItem.innerHTML = `
                    <img src="${request.avatarUrl || `${API_BASE_URL}${API_PATHS.UPLOAD_AVATAR}`}" alt="Аватар" class="friend-avatar">
                    <span>${request.username}</span>
                    <div class="request-actions">
                        <button onclick="acceptFriendRequest('${request.id}')" class="btn primary-btn">Принять</button>
                        <button onclick="rejectFriendRequest('${request.id}')" class="btn danger-btn">Отклонить</button>
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
    const content = document.getElementById('post-content')?.value;
    if (!content?.trim()) {
        showError('Пост не может быть пустым');
        return;
    }

    try {
        const response = await apiRequest('/posts', {
            method: 'POST',
            body: JSON.stringify({ content: content.trim() })
        });

        if (response.success) {
            showSuccess('Пост создан');
            const postContent = document.getElementById('post-content');
            if (postContent) postContent.value = '';
            loadPosts();
        }
    } catch (error) {
        showError('Ошибка при создании поста');
    }
};

const loadPosts = async () => {
    try {
        const response = await apiRequest('/users/posts');
        if (response.success) {
            const postsContainer = document.getElementById('posts-container');
            if (!postsContainer) return;
            
            postsContainer.innerHTML = '';
            response.data.forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${post.authorAvatar || `${API_BASE_URL}/uploads/avatars/default-avatar.png`}" alt="Аватар" class="post-avatar">
                        <div class="post-info">
                            <span class="post-author">${post.author}</span>
                            <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
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

// Функция для загрузки аватара
async function uploadAvatar(file) {
    if (!file) {
        showError('Файл не выбран');
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const response = await apiRequest('/users/upload-avatar', {
            method: 'POST',
            body: formData
        });
        
        if (response.success) {
            const profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) {
                profileAvatar.src = response.data.avatarUrl;
            }
            showSuccess('Аватар успешно обновлен');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showError('Ошибка при загрузке аватара');
    }
}

// Функция для получения постов
async function getPosts() {
    try {
        const response = await apiRequest('/users/posts');
        return response;
    } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
    }
}

// Функция для получения списка друзей
async function getFriends() {
    try {
        const response = await apiRequest('/users/friends');
        return response;
    } catch (error) {
        console.error('Error fetching friends:', error);
        throw error;
    }
}

// Функция для получения запросов в друзья
async function getFriendRequests() {
    try {
        const response = await apiRequest('/users/friend-requests');
        return response;
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        throw error;
    }
}

// Функция для изменения пароля
async function changePassword(oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await apiRequest('/users/password', {
            method: 'POST',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        
        if (response.success) {
            showSuccess('Пароль успешно изменен');
        } else {
            showError(response.error || 'Ошибка при изменении пароля');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showError('Ошибка при изменении пароля');
    }
}

// Вспомогательная функция для получения токена
function getToken() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user ? user.token : null;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}

// Функция показа кнопки чата
const showChatButton = () => {
    const chatLink = document.getElementById('chat-link');
    if (chatLink) {
        chatLink.style.display = 'block';
    }
};
