// Определяем базовый URL API
const API_BASE_URL = 'https://adminflow.ru/api';

// Убедитесь, что этот код выполняется только в браузере
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
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

    // Глобальная переменная для интервала проверки роли
    let roleCheckInterval;
    // Функция для отображения стены друга
    async function showFriendWall(username) {
        try {
            // Скрываем форму создания поста при просмотре чужой стены
            const postForm = document.querySelector('.post-form');
            const wallTitle = document.querySelector('.wall-section h3');
            const currentUser = JSON.parse(localStorage.getItem('user'));
            
            if (!currentUser || !currentUser.data) {
                throw new Error('Необходима авторизация');
            }
            
            if (username === currentUser.data.username) {
                if (postForm) postForm.style.display = 'block';
                if (wallTitle) wallTitle.textContent = 'Моя стена';
            } else {
                if (postForm) postForm.style.display = 'none';
                if (wallTitle) wallTitle.textContent = `Стена пользователя ${username}`;
            }

            // Загружаем посты друга
            const response = await fetch(`${API_BASE_URL}/posts/${username}`, {
                headers: {
                    'Authorization': `Bearer ${currentUser.data.username}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка при загрузке постов');
            }

            const data = await response.json();

            if (data.success) {
                const postsContainer = document.getElementById('posts-container');
                if (!postsContainer) {
                    throw new Error('Контейнер постов не найден');
                }

                postsContainer.innerHTML = data.data.map(post => `
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
            } else {
                throw new Error(data.message || 'Ошибка при загрузке постов');
            }
        } catch (error) {
            console.error('Error showing friend wall:', error);
            showError(error.message || 'Ошибка при отображении стены');
        }
    }

    // Функция проверки роли пользователя
    async function checkUserRole() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            if (!currentUser?.data?.username) return;

            const response = await fetch(`${API_BASE_URL}/users/check-role`, {
                headers: {
                    'Authorization': `Bearer ${currentUser.data.username}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка при проверке роли');
            }

            const data = await response.json();

            if (data.success && data.data.role !== currentUser.data.role) {
                // Обновляем роль в localStorage
                currentUser.data.role = data.data.role;
                localStorage.setItem('user', JSON.stringify(currentUser));

                // Обновляем отображение роли в профиле
                const profileRole = document.getElementById('profile-role');
                if (profileRole) {
                    profileRole.textContent = data.data.role;
                }

                // Обновляем интерфейс в зависимости от роли
                updateInterfaceBasedOnRole(data.data.role);
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            // Не показываем ошибку пользователю, так как это фоновая проверка
        }
    }

    // Функция обновления интерфейса на основе роли
    function updateInterfaceBasedOnRole(role) {
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            adminSection.style.display = role === 'Admin' ? 'block' : 'none';
            if (role === 'Admin') {
                loadUsers();
            }
        }
    }

    // Функция запуска проверки роли
    function startRoleChecking() {
        // Проверяем роль сразу при запуске
        checkUserRole();
        
        // Устанавливаем интервал проверки (каждые 30 секунд)
        if (!roleCheckInterval) {
            roleCheckInterval = setInterval(checkUserRole, 30000);
        }
    }

    // Функция остановки проверки роли
    function stopRoleChecking() {
        if (roleCheckInterval) {
            clearInterval(roleCheckInterval);
            roleCheckInterval = null;
        }
    }

    // Добавляем проверку роли при определенных событиях
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkUserRole();
        }
    });

    // Функция для входа
    async function handleLogin(event) {
        event.preventDefault();
        console.log('Login attempt started');

        try {
            const username = document.getElementById('login-username')?.value;
            const password = document.getElementById('login-password')?.value;

            if (!username || !password) {
                throw new Error('Введите имя пользователя и пароль');
            }

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
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при попытке входа');
            }

            const data = await response.json();

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
                startRoleChecking(); // Запускаем проверку роли после успешного входа
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

            if (!response.ok) {
                throw new Error('Ошибка при анонимном входе');
            }

            const data = await response.json();

            if (data.success) {
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

    // Функция отображения профиля
    function showProfile(userData) {
        try {
            if (!userData?.data) {
                throw new Error('Некорректные данные пользователя');
            }

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

            // Загружаем посты
            loadPosts();
            
            // Загружаем списки друзей и запросов
            loadFriendRequests();
            loadFriendsList();
        } catch (error) {
            console.error('Error showing profile:', error);
            showError('Ошибка при отображении профиля');
        }
    }

    // Функция выхода из системы
    function handleLogout() {
        console.log('Logging out...');
        try {
            // Очищаем данные пользователя
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

            showSuccess('Вы успешно вышли из системы');
            console.log('Logout successful');
            
            // Останавливаем все интервалы и проверки
            stopRoleChecking();
            stopCheckingMessages();
        } catch (error) {
            console.error('Error during logout:', error);
            showError('Ошибка при выходе из системы');
        }
    }

    // Инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Page loaded, initializing...');

        try {
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
        } catch (error) {
            console.error('Error during initialization:', error);
            showError('Ошибка при инициализации приложения');
        }
    });

    // Функция для удаления пользователя
    async function deleteUser(username) {
        if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
            return;
        }

        try {
            const userData = JSON.parse(localStorage.getItem('user'));
            if (!userData?.data?.username) {
                throw new Error('Необходима авторизация');
            }

            const response = await fetch(`${API_BASE_URL}/users/${username}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${userData.data.username}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Ошибка при удалении пользователя');
            }

            const data = await response.json();

            if (data.success) {
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

    // Функция для редактирования пользователя
    async function editUser(userId) {
        try {
            const userData = JSON.parse(localStorage.getItem('user'));
            if (!userData?.data?.token) {
                throw new Error('Требуется авторизация');
            }

            const newUsername = prompt('Введите новое имя пользователя:');
            const newRole = prompt('Введите новую роль (Admin/User):');

            if (!newUsername || !newRole) return;

            if (!['Admin', 'User'].includes(newRole)) {
                throw new Error('Некорректная роль. Допустимые значения: Admin, User');
            }

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

            if (!response.ok) {
                throw new Error('Ошибка при обновлении пользователя');
            }

            const data = await response.json();

            if (data.success) {
                showSuccess('Пользователь успешно обновлен');
                loadUsers(); // Перезагружаем список пользователей
            } else {
                throw new Error(data.message || 'Ошибка при обновлении пользователя');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            showError(error.message || 'Ошибка при обновлении пользователя');
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

            if (!response.ok) {
                throw new Error('Ошибка при создании пользователя');
            }

            const data = await response.json();
            
            if (data.success) {
                showSuccess('Пользователь успешно создан');
                await loadUsers(); // Перезагружаем список пользователей
            } else {
                throw new Error(data.message || 'Ошибка при создании пользователя');
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
            const username = document.getElementById('reg-username')?.value;
            const password = document.getElementById('reg-password')?.value;
            
            if (!username || !password) {
                throw new Error('Введите имя пользователя и пароль');
            }
            
            console.log('Отправка запроса регистрации:', { username });
            
            const response = await fetch('https://adminflow.ru/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при регистрации');
            }
            
            console.log('Статус ответа:', response.status);
            
            const data = await response.json();
            console.log('Ответ сервера:', data);
            
            if (data.success) {
                showSuccess('Регистрация успешна! Теперь вы можете войти.');
                showLoginForm();
                document.getElementById('register-form')?.reset();
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
        try {
            const avatarContainer = document.querySelector('.avatar-container');
            const avatarUpload = document.getElementById('avatar-upload');
            const userAvatar = document.getElementById('user-avatar');

            if (!avatarContainer || !avatarUpload || !userAvatar) {
                throw new Error('Не найдены необходимые элементы для загрузки аватара');
            }

            // Добавляем обработчик клика на контейнер аватарки
            avatarContainer.addEventListener('click', () => {
                avatarUpload.click();
            });

            avatarUpload.addEventListener('change', async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    showError('Пожалуйста, выберите изображение');
                    return;
                }

                // Показываем превью перед загрузкой
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        userAvatar.src = e.target.result.toString();
                    }
                };
                reader.readAsDataURL(file);

                // Загружаем файл на сервер
                await uploadAvatar(file);
            });
        } catch (error) {
            console.error('Error initializing avatar upload:', error);
            showError('Ошибка при инициализации загрузки аватара');
        }
    }
}
