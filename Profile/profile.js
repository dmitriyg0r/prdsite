// Определяем базовый URL API
const API_BASE_URL = 'https://adminflow.ru/api';

// Вспомогательные функции
const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.backgroundColor = '#ff4444';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
};

const showSuccess = (message) => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
};

const togglePassword = (formType) => {
    const passwordInput = formType === 'login' 
        ? document.getElementById('login-password')
        : document.getElementById('reg-password');
    const eyeIcon = passwordInput.nextElementSibling;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.add('show');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('show');
    }
};

// Функция для входа
async function handleLogin(event) {
    event.preventDefault();
    console.log('Login attempt started');

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        console.log('Login response status:', response.status);

        // Проверяем статус ответа
        if (!response.ok) {
            if (response.status === 502) {
                throw new Error('Сервер временно недоступен. Пожалуйста, попробуйте позже.');
            }
            
            // Пытаемся получить текст ошибки из ответа
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message;
            } catch (e) {
                errorMessage = 'Ошибка при попытке входа';
            }
            throw new Error(errorMessage);
        }

        // Пытаемся распарсить JSON только если ответ успешный
        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error('Error parsing response:', e);
            throw new Error('Некорректный ответ от сервера');
        }

        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data));
            showSuccess('Успешный вход');
            
            // Скрываем контейнер входа
            const loginContainer = document.getElementById('login-container');
            if (loginContainer) {
                loginContainer.style.display = 'none';
            }
            
            // Показываем профиль
            showProfile(data);
        } else {
            throw new Error(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Произошла ошибка при попытке входа');
        
        // Очищаем поле пароля при ошибке
        const passwordInput = document.getElementById('login-password');
        if (passwordInput) {
            passwordInput.value = '';
        }
    }
}

// Функция для анонимного входа
async function handleAnonymousLogin() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/anonymous-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data));
            showSuccess('Анонимный вход выполнен успешно');
            showProfile(data);
        } else {
            throw new Error(data.message || 'Ошибка при анонимном входе');
        }
    } catch (error) {
        console.error('Anonymous login error:', error);
        showError(error.message || 'Ошибка при попытке анонимного входа');
    }
}

// Функция отображеня профиля
function showProfile(userData) {
    // Скрываем все контейнеры авторизации
    const authContainers = document.querySelectorAll('#login-container, #register-container');
    authContainers.forEach(container => {
        if (container) container.style.display = 'none';
    });
    
    // Показываем информацию профиля
    const profileInfo = document.getElementById('profile-info');
    if (profileInfo) {
        profileInfo.style.display = 'block';
    }
    
    // Обновляем информацию профиля
    const profileUsername = document.getElementById('profile-username');
    const profileRole = document.getElementById('profile-role');
    const userAvatar = document.getElementById('user-avatar');
    
    if (profileUsername) profileUsername.textContent = userData.data.username;
    if (profileRole) profileRole.textContent = userData.data.role;
    
    // Загружаем аватар пользователя
    loadUserAvatar(userData.data.username);

    // Инициализируем загрузку аватара
    initializeAvatarUpload();
    
    // Показываем админ-панель для администраторов
    const adminSection = document.getElementById('admin-section');
    if (adminSection && userData.data.role === 'Admin') {
        adminSection.style.display = 'block';
        loadUsers();
    }
}

// Функция загрузки списка ользователей
async function loadUsers() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${user.data.username}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const usersTableBody = document.getElementById('users-table-body');
            if (usersTableBody) {
                usersTableBody.innerHTML = data.data.map(user => `
                    <tr>
                        <td>
                            <div class="user-row">
                                <img src="${user.avatarUrl ? `${API_BASE_URL}${user.avatarUrl}` : '../assets/default-avatar.png'}" 
                                     alt="Avatar" 
                                     class="user-table-avatar">
                                <span>${user.username}</span>
                            </div>
                        </td>
                        <td>${user.role}</td>
                        <td>${new Date(user.createdAt).toLocaleString()}</td>
                        <td>
                            <button class="action-btn delete-btn" onclick="deleteUser('${user.username}')">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Ошибка при загрузке списка пользователей');
    }
}

// Функция выхода из системы
function handleLogout() {
    console.log('Logging out...');
    try {
        // Оищаем данные пользователя
        localStorage.removeItem('user');
        
        // Скрываем профиль и показываем форму входа
        const loginContainer = document.getElementById('login-container');
        const profileInfo = document.getElementById('profile-info');
        const adminSection = document.getElementById('admin-section');

        if (loginContainer) loginContainer.style.display = 'block';
        if (profileInfo) profileInfo.style.display = 'none';
        if (adminSection) adminSection.style.display = 'none';

        // Очищаем поля формы
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();

        showSuccess('Вы успешно выли из системы');
        console.log('Logout successful');
    } catch (error) {
        console.error('Error during logout:', error);
        showError('Ошибка при выходе из системы');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');

    const loginContainer = document.getElementById('login-container');
    const profileInfo = document.getElementById('profile-info');
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    const logoutBtn = document.querySelector('.danger-btn');

    // Проверяем сохраненную сессию
    const userData = localStorage.getItem('user');
    if (userData) {
        console.log('Found saved session');
        try {
            const parsedUserData = JSON.parse(userData);
            // Скрываем контейнер входа и показываем профиль
            if (loginContainer) {
                loginContainer.style.display = 'none';
            }
            if (profileInfo) {
                profileInfo.style.display = 'block';
            }
            showProfile(parsedUserData);
            
            // Загружаем списки друзей и запросов
            loadFriendRequests();
            loadFriendsList();
        } catch (e) {
            console.error('Error parsing saved session:', e);
            localStorage.removeItem('user');
            // В случае ошибки показываем форму входа
            if (loginContainer) {
                loginContainer.style.display = 'block';
            }
            if (profileInfo) {
                profileInfo.style.display = 'none';
            }
        }
    } else {
        // Если нет сохраненной сессии, показываем форму входа
        if (loginContainer) {
            loginContainer.style.display = 'block';
        }
        if (profileInfo) {
            profileInfo.style.display = 'none';
        }
    }

    // Привязываем обработчики событий
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Register form handler attached');
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form handler attached');
    }

    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
        console.log('Anonymous login handler attached');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout handler attached');
    }

    // Инициализация поиска друзей
    const friendSearch = document.getElementById('friend-search');
    if (friendSearch) {
        friendSearch.addEventListener('input', (e) => {
            searchUsers(e.target.value);
        });
    }
});

// Функция для удаления пользователя
async function deleteUser(username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
        return;
    }

    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${API_BASE_URL}/users/${username}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${userData.data.username}`
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showSuccess('Пользователь успешно удален');
            // Перезагружаем список пользователей
            loadUsers();
        } else {
            throw new Error(data.message || 'Ошибка при удалении пользователя');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError(error.message || 'Произошла ошибка при удалении пользователя');
    }
}

// ункция для реактирования пользователя
async function editUser(userId) {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.data?.token) {
            throw new Error('Треуеся авторизация');
        }

        const newUsername = prompt('Введите новое имя пользователя:');
        const newRole = prompt('Введите новую роль (Admin/User):');

        if (!newUsername || !newRole) return;

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userData.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: newUsername,
                role: newRole
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showSuccess('Пользователь успешно обновлен');
            loadUsers(); // Перезагружаем список пользователей
        } else {
            throw new Error(data.message || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showError('Ошиб при обновлении пользователя');
    }
}

// Функция для показа модального окна создания пользователя
async function showCreateUserModal() {
    try {
        const username = prompt('Введите имя пользователя:');
        if (!username) return;

        const password = prompt('Введите пароль:');
        if (!password) return;

        const role = prompt('Введите роль (Admin/User):');
        if (!role || !['Admin', 'User'].includes(role)) {
            showError('Некорректная роль. Допустимые значения: Admin, User');
            return;
        }

        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.data?.token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userData.data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                role
            })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            showSuccess('Пользователь успешно создан');
            await loadUsers(); // Перезагржаем список поьзователей
        } else {
            throw new Error(data.message || 'Ошибка при создании ползоватея');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError(error.message);
    }
}

// Обработчик регистрации
async function handleRegister(event) {
    event.preventDefault();
    
    try {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        
        console.log('Отправка запроса регистрации:', { username });
        
        const response = await fetch('https://adminflow.ru/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        console.log('Статус ответа:', response.status);
        
        const data = await response.json();
        console.log('Ответ сервера:', data);
        
        if (data.success) {
            showSuccess('Регистрация успешна! Теперь вы можете войти.');
            showLoginForm();
            document.getElementById('register-form').reset();
        } else {
            throw new Error(data.message || 'Ошибка при регистрации');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showError(error.message || 'Произошла ошибка при регистрации. Попробуйте позже.');
    }
}

// Обновляем функцию initializeAvatarUpload
function initializeAvatarUpload() {
    const avatarUpload = document.getElementById('avatar-upload');
    const userAvatar = document.getElementById('user-avatar');

    avatarUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError('Пожалуйста, выберите изображение');
            return;
        }

        // Показываем превью перед загрузкой
        const reader = new FileReader();
        reader.onload = (e) => {
            userAvatar.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Загружаем файл на сервер
        await uploadAvatar(file);
    });
}

async function uploadAvatar(file) {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.data?.username) {
            throw new Error('Требуется авторизация');
        }

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('username', userData.data.username);

        const response = await fetch(`${API_BASE_URL}/upload-avatar`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Обновляем аватар на странице
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                userAvatar.src = `${API_BASE_URL}${data.data.avatarUrl}`;
            }
            showSuccess('Аватар успешно обновлен');
        } else {
            throw new Error(data.message || 'Ошибка при загрузке аватара');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showError(error.message || 'Произошла ошибка при загрузке аватара');
    }
}

// Добавляем новую функцию для загрузки аватара
async function loadUserAvatar(username) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${username}/avatar`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar && data.data.avatarUrl) {
                userAvatar.src = `${API_BASE_URL}${data.data.avatarUrl}`;
            }
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        // Если произошла ошибка, оставляем аватар по умолчанию
    }
}

// Добавляем новые функции для работы с друзьями

// Показать модальное окно добавления друга
function showAddFriendModal() {
    const modal = document.getElementById('add-friend-modal');
    modal.style.display = 'block';

    // Закрытие по клику вне модального окна
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Закрытие по клику на крестик
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
}

// Поиск пользователей
let searchTimeout;
async function searchUsers(searchTerm) {
    const searchResults = document.getElementById('search-results');
    
    // Очищаем предыдущий таймаут
    clearTimeout(searchTimeout);
    
    if (!searchTerm) {
        searchResults.style.display = 'none';
        return;
    }

    // Устанавливаем новый таймаут
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/search?query=${searchTerm}`, {
                headers: {
                    'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
                }
            });

            const data = await response.json();

            if (data.success) {
                searchResults.innerHTML = data.data
                    .map(user => `
                        <div class="search-result-item" onclick="sendFriendRequest('${user.username}')">
                            <img src="${user.avatarUrl || '../assets/default-avatar.png'}" alt="Avatar">
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
    }, 300); // Задержка для предотвращения частых запросов
}

// Отправка запроса в друзья
async function sendFriendRequest(targetUsername) {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: JSON.stringify({ targetUsername })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Запрос в друзья отправлен');
            document.getElementById('add-friend-modal').style.display = 'none';
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showError(error.message || 'Ошибка при отправке запроса в друзья');
    }
}

// Загрузка запросов в друзья
async function loadFriendRequests() {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/requests`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const requestsList = document.getElementById('friend-requests-list');
            requestsList.innerHTML = data.data
                .map(request => `
                    <div class="friend-request-item">
                        <div class="user-info">
                            <img src="${request.avatarUrl || '../assets/default-avatar.png'}" alt="Avatar" class="friend-avatar">
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
                `)
                .join('');
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
        showError('Ошибка при загрузке запросов в друзья');
    }
}

// Принятие запроса в друзья
async function acceptFriendRequest(requestId) {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/accept/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Запрос в друзья принят');
            loadFriendRequests();
            loadFriendsList();
        }
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showError('Ошибка при принятии запроса в друзья');
    }
}

// Отклонение запроса в друзья
async function rejectFriendRequest(requestId) {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/reject/${requestId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Запрос в друзья отклонен');
            loadFriendRequests();
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showError('Ошибка при отклонении запроса в друзья');
    }
}

// Загрузка списка друзей
async function loadFriendsList() {
    try {
        const response = await fetch(`${API_BASE_URL}/friends/list`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const friendsList = document.getElementById('friends-list');
            friendsList.innerHTML = data.data
                .map(friend => `
                    <tr>
                        <td>
                            <img src="${friend.avatarUrl || '../assets/default-avatar.png'}" 
                                 alt="Avatar" 
                                 class="friend-avatar">
                        </td>
                        <td>${friend.username}</td>
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
                `)
                .join('');
        }
    } catch (error) {
        console.error('Error loading friends list:', error);
        showError('Ошибка при загрузке списка друзей');
    }
}

// Удаление друга
async function removeFriend(friendUsername) {
    if (!confirm(`Вы уверены, что хотите удалить ${friendUsername} из друзей?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/friends/remove/${friendUsername}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Друг успешно удален');
            loadFriendsList();
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showError('Ошибка при удалении друга');
    }
}

// Глобальная переменная для хранения текущего собеседника
let currentChatPartner = null;

// Функция открытия чата
function openChat(username) {
    currentChatPartner = username;
    const modal = document.getElementById('chat-modal');
    const chatUsername = document.getElementById('chat-username');
    
    chatUsername.textContent = username;
    modal.style.display = 'block';
    
    // Загружаем историю сообщений
    loadChatHistory(username);
    
    // Очищаем поле ввода
    document.getElementById('chat-input').value = '';
    
    // Устанавливаем фокус на поле ввода
    setTimeout(() => {
        document.getElementById('chat-input').focus();
    }, 100);

    // Закрытие по клику вне модального окна
    window.onclick = (event) => {
        if (event.target === modal) {
            closeChat();
        }
    };

    // Закрытие по клику на крестик
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = closeChat;

    // Обработка нажатия Enter в поле ввода
    document.getElementById('chat-input').onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    startCheckingMessages();
}

// Функция закрытия чата
function closeChat() {
    stopCheckingMessages();
    currentChatPartner = null;
    document.getElementById('chat-modal').style.display = 'none';
}

// Функция загрузки истории сообщений
async function loadChatHistory(username) {
    try {
        const response = await fetch(`${API_BASE_URL}/chat/history/${username}`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = data.data
                .map(message => createMessageElement(message))
                .join('');
            
            // Прокручиваем к последнему сообщению
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        showError('Ошибка при загрузке истории сообщений');
    }
}

// Функция отправки сообщения
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || !currentChatPartner) return;

    try {
        const response = await fetch(`${API_BASE_URL}/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: JSON.stringify({
                to: currentChatPartner,
                message: message
            })
        });

        const data = await response.json();

        if (data.success) {
            // Добавляем сообщение в чат
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.insertAdjacentHTML('beforeend', 
                createMessageElement({
                    from: JSON.parse(localStorage.getItem('user')).data.username,
                    message: message,
                    timestamp: new Date()
                })
            );
            
            // Очищаем поле ввода
            input.value = '';
            
            // Прокручиваем к новому сообщению
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Ошибка при отправке сообщения');
    }
}

// Функция создания элемента сообщения
function createMessageElement(message) {
    const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
    const isSent = message.from === currentUser;
    const time = new Date(message.timestamp).toLocaleTimeString();
    
    return `
        <div class="message ${isSent ? 'message-sent' : 'message-received'}">
            ${message.message}
            <div class="message-time">${time}</div>
        </div>
    `;
}

// Функция для периодической проверки новых сообщений
let checkMessagesInterval;

function startCheckingMessages() {
    if (currentChatPartner) {
        checkMessagesInterval = setInterval(() => {
            loadChatHistory(currentChatPartner);
        }, 5000); // Проверяем каждые 5 секунд
    }
}

function stopCheckingMessages() {
    clearInterval(checkMessagesInterval);
}
