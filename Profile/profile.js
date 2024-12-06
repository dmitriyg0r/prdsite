// Обновляем константы в начале файла
const API_BASE_URL = 'https://adminflow.ru';
const AVATARS_PATH = '/api/uploads/avatars/';  // Добавляем /api/ в путь

// Обновляем API_PATHS с учетом расположения PHP файлов
const API_PATHS = {
    UPLOAD_AVATAR: '/api/users/upload-avatar.php',
    AVATAR: '/api/users/avatar.php',
    ROLE: '/api/users/role.php',
    POSTS: '/api/users/posts.php',
    FRIENDS: '/api/users/friends.php',
    FRIEND_REQUESTS: '/api/users/friend-requests.php',
    PASSWORD: '/api/auth/register.php',
    AUTH: '/api/auth/login.php',
    SEARCH: '/api/users/search.php'
};

// Глобальные функции
const openChat = (username) => {
    window.location.href = `/chat?user=${username}`;
};

const showChatButton = () => {
    const chatLink = document.getElementById('chat-link');
    if (chatLink) {
        chatLink.style.display = 'block';
    }
};

const updateInterfaceBasedOnRole = (role) => {
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        adminSection.style.display = role === 'admin' ? 'block' : 'none';
    }
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

// Обновляем функцию apiRequest для правильной обработки FormData
const apiRequest = async (endpoint, options = {}) => {
    if (!endpoint) {
        throw new Error('API endpoint is required');
    }

    const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    try {
        const token = getToken();
        if (!token) {
            window.location.href = '../authreg/authreg.html';
            return;
        }
        
        console.log('Making request to:', url);
        
        // Не добавляем Content-Type для FormData
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        // Если тело запроса не FormData, добавляем Content-Type: application/json
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        console.log('Request headers:', headers);
        
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        console.log('Response status:', response.status);
        
        if (response.status === 401) {
            localStorage.removeItem('user');
            window.location.href = '../authreg/authreg.html';
            return;
        }

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
const handleLogout = async () => {
    try {
        localStorage.removeItem('user');
        showSuccess('Вы успешно вышли из системы');
        stopRoleChecking();
        window.location.href = '../authreg/authreg.html';
    } catch (error) {
        showError('Ошибка при выходе из системы');
    }
};

// Обновляем функцию showProfile
const showProfile = async (userData) => {
    if (!userData) {
        console.error('User data is missing');
        window.location.href = '../authreg/authreg.html';
        return;
    }

    const profileInfo = document.getElementById('profile-info');
    const profileUsername = document.getElementById('profile-username');
    const profileRole = document.getElementById('profile-role');

    if (profileInfo) profileInfo.style.display = 'block';
    if (profileUsername) profileUsername.textContent = userData.username;
    if (profileRole) profileRole.textContent = userData.role;

    await loadUserAvatar(userData.username);
};

// Обновляем функцию getAvatarUrl
const getAvatarUrl = (serverPath) => {
    if (!serverPath) return `${API_BASE_URL}/api/uploads/avatars/default-avatar.png`;
    if (serverPath.startsWith('http')) return serverPath;
    
    // Если путь начинается с /uploads, добавляем /api
    if (serverPath.startsWith('/uploads/')) {
        return `${API_BASE_URL}/api${serverPath}`;
    }
    
    // Если это просто имя файла, добавляем полный путь
    return `${API_BASE_URL}/api/uploads/avatars/${serverPath.split('/').pop()}`;
};

// Обновляем функцию loadUserAvatar
const loadUserAvatar = async (username) => {
    if (!username) {
        console.error('Username is undefined');
        return;
    }

    try {
        const response = await apiRequest(API_PATHS.AVATAR, {
            method: 'GET',
            headers: {
                'X-Username': username
            }
        });
        
        const userAvatar = document.getElementById('user-avatar');
        if (!userAvatar) return;

        if (response.success && response.data.avatarUrl) {
            userAvatar.src = getAvatarUrl(response.data.avatarUrl);
        } else {
            userAvatar.src = getAvatarUrl(AVATARS_PATH + 'default-avatar.png');
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = getAvatarUrl(AVATARS_PATH + 'default-avatar.png');
        }
    }
};

// Функции друзей
const loadFriendsList = async () => {
    try {
        const response = await apiRequest(API_PATHS.FRIENDS);
        if (response.success) {
            const friendsList = document.getElementById('friends-list');
            if (!friendsList) return;
            
            friendsList.innerHTML = '';
            response.data.forEach(friend => {
                const friendItem = document.createElement('tr');
                friendItem.innerHTML = `
                    <td>
                        <img src="${friend.avatarUrl || `${API_BASE_URL}${AVATARS_PATH}/default-avatar.png`}" alt="Аватар" class="friend-avatar">
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
        showError('Ошбка при загрузке списка друзей');
    }
};

const loadFriendRequests = async () => {
    try {
        const response = await apiRequest(API_PATHS.FRIEND_REQUESTS);
        if (response.success) {
            const requestsList = document.getElementById('friend-requests-list');
            if (!requestsList) return;
            
            requestsList.innerHTML = '';
            response.data.forEach(request => {
                const requestItem = document.createElement('div');
                requestItem.className = 'friend-request-item';
                requestItem.innerHTML = `
                    <img src="${request.avatarUrl || `${API_BASE_URL}${AVATARS_PATH}/default-avatar.png`}" alt="Аватар" class="friend-avatar">
                    <span>${request.username}</span>
                    <div class="request-actions">
                        <button onclick="acceptFriendRequest('${request.id}')" class="btn primary-btn">Прнять</button>
                        <button onclick="rejectFriendRequest('${request.id}')" class="btn danger-btn">Отклонить</button>
                    </div>
                `;
                requestsList.appendChild(requestItem);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке заросов в друзья');
    }
};
// Функции постов
const createPost = async () => {
    const content = document.getElementById('post-content')?.value;
    if (!content?.trim()) {
        showError('Пост не может ��ыть пустым');
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
        const response = await apiRequest(API_PATHS.POSTS);
        if (response.success) {
            const postsContainer = document.getElementById('posts-container');
            if (!postsContainer) return;
            
            postsContainer.innerHTML = '';
            response.data.forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${post.authorAvatar || `${API_BASE_URL}${AVATARS_PATH}/default-avatar.png`}" alt="Аватар" class="post-avatar">
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
                        <button onclick="deleteUser('${user.username}')" class="delete-btn">далит</button>
                    </td>
                `;
                usersTableBody.appendChild(userRow);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке пользвателей');
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

        // Проверям наличие пути
        if (!API_PATHS.ROLE) {
            console.error('Role API path is not defined');
            return;
        }

        const response = await apiRequest(API_PATHS.ROLE, {
            method: 'GET',
            headers: {
                'X-Username': user.username
            }
        });
        
        if (response.success) {
            updateInterfaceBasedOnRole(response.data.role);
        }
    } catch (error) {
        console.error('Ошибка при проверке роли:', error);
    }
};

// Иициализация
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userData = localStorage.getItem('user');
        if (!userData) {
            window.location.href = '../authreg/authreg.html';
            return;
        }

        const user = JSON.parse(userData);
        await showProfile(user);
        startRoleChecking();
        showChatButton();

        // Загрузка начальных данных
        await Promise.all([
            loadFriendsList(),
            loadFriendRequests(),
            loadPosts()
        ]);

        // Добавляем обработчики для модального окна
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = hideAddFriendModal;
        }

        window.onclick = (event) => {
            const modal = document.getElementById('add-friend-modal');
            if (event.target === modal) {
                hideAddFriendModal();
            }
        };

        const searchInput = document.getElementById('friend-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(searchUsers, 300));
        }

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
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.likePost = likePost;
window.deletePost = deletePost;
window.changeRole = changeRole;
window.deleteUser = deleteUser;

// Перенесем объявления функций в начало файла
const hideAddFriendModal = () => {
    const modal = document.getElementById('add-friend-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

const showAddFriendModal = () => {
    const modal = document.getElementById('add-friend-modal');
    if (modal) {
        modal.style.display = 'block';
    }
};

const acceptFriendRequest = async (requestId) => {
    try {
        const response = await apiRequest(API_PATHS.FRIEND_REQUESTS, {
            method: 'POST',
            body: JSON.stringify({
                action: 'accept',
                requestId: requestId
            })
        });
        
        if (response.success) {
            showSuccess('Заявка в друзья принята');
            await Promise.all([
                loadFriendsList(),
                loadFriendRequests()
            ]);
        }
    } catch (error) {
        showError('Ошибка при принятии заявки в друзья');
    }
};

// Обновляем функцию uploadAvatar
const uploadAvatar = async (file) => {
    if (!file) {
        console.error('No file selected');
        showError('Файл не выбран');
        return;
    }

    console.log('Starting avatar upload...', file);
    
    try {
        // Проверки файла
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('Файл слишком большой. Максимальный размер 5MB');
        }

        if (!file.type.startsWith('image/')) {
            throw new Error('Можно загружать только изображения');
        }

        // Создаем FormData
        const formData = new FormData();
        formData.append('avatar', file);

        console.log('Sending request to:', API_PATHS.UPLOAD_AVATAR);
        console.log('FormData contents:', Array.from(formData.entries()));

        const response = await apiRequest(API_PATHS.UPLOAD_AVATAR, {
            method: 'POST',
            body: formData
        });
        
        console.log('Upload response:', response);
        
        if (response.success) {
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                const avatarUrl = getAvatarUrl(response.data.avatarUrl);
                console.log('New avatar URL:', avatarUrl);
                
                // Обновляем изображение с предотвращением кэширования
                const timestamp = new Date().getTime();
                userAvatar.src = `${avatarUrl}?t=${timestamp}`;
                
                showSuccess('Аватар успешно обновлен');
            }
        } else {
            throw new Error(response.error || 'Ошибка при загрузке аватара');
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        showError(error.message || 'Ошибка при загрузке аватара');
    }
};

// Обновляем обработчики событий
const initializeAvatarUpload = () => {
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarContainer = document.querySelector('.avatar-container');
    
    if (avatarUpload) {
        console.log('Avatar upload input found');
        
        avatarUpload.addEventListener('change', (event) => {
            console.log('File input change event triggered');
            const file = event.target.files[0];
            if (file) {
                console.log('Selected file:', file);
                uploadAvatar(file);
            }
        });
    } else {
        console.error('Avatar upload input not found');
    }

    if (avatarContainer) {
        avatarContainer.addEventListener('click', () => {
            console.log('Avatar container clicked');
            avatarUpload?.click();
        });
    }
};

// Обновляем инициализацию
document.addEventListener('DOMContentLoaded', () => {
    initializeAvatarUpload();
    // ... остальной код инициализации ...
});

// Добавляем функцию в глобальную область видимости
window.uploadAvatar = uploadAvatar;

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

// Обновляем функцию getToken
function getToken() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user?.token;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}

const rejectFriendRequest = async (requestId) => {
    try {
        const response = await apiRequest(API_PATHS.FRIEND_REQUESTS, {
            method: 'POST',
            body: JSON.stringify({
                action: 'reject',
                requestId: requestId
            })
        });
        
        if (response.success) {
            showSuccess('Заявка в друзья отклонена');
            await loadFriendRequests();
        }
    } catch (error) {
        showError('Ош��бка при отклонении заявки в друзья');
    }
};

const sendFriendRequest = async (username) => {
    try {
        const response = await apiRequest(API_PATHS.FRIEND_REQUESTS, {
            method: 'POST',
            body: JSON.stringify({
                action: 'send',
                username: username
            })
        });
        
        if (response.success) {
            showSuccess('Заявка в друзья отпрвлена');
            hideAddFriendModal();
        }
    } catch (error) {
        showError('Ошибка при отправке заявки в друзья');
    }
};

// Добавляем функции в глобальную область видимости
window.hideAddFriendModal = hideAddFriendModal;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.sendFriendRequest = sendFriendRequest;

// Вспомогательная функция debounce
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

