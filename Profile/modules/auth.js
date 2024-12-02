import { API_BASE_URL, showError, showSuccess, apiRequest } from './utils.js';

// Функции без export в их определении
async function handleLogin(event) {
    event.preventDefault();
    console.log('Login attempt started');

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (response.success) {
            localStorage.setItem('user', JSON.stringify(response));
            showSuccess('Успешный вход');
            
            // Скрываем контейнер входа
            const loginContainer = document.getElementById('login-container');
            if (loginContainer) {
                loginContainer.style.display = 'none';
            }
            
            // Показываем профиль
            showProfile(response);
            startRoleChecking(); // Запускаем проверку роли после успешного входа
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

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    // Валидация паролей
    if (password !== confirmPassword) {
        showError('Пароли не совпадают');
        return;
    }

    try {
        const response = await apiRequest('/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success) {
            showSuccess('Регистрация успешна! Теперь вы можете войти');
            
            // Очищаем форму регистрации
            document.getElementById('register-form').reset();
            
            // Переключаемся на форму входа
            const loginContainer = document.getElementById('login-container');
            const registerContainer = document.getElementById('register-container');
            
            if (loginContainer && registerContainer) {
                registerContainer.style.display = 'none';
                loginContainer.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError(error.message || 'Ошибка при регистрации');
    }
}

async function handleAnonymousLogin() {
    try {
        const response = await apiRequest('/auth/anonymous-login', {
            method: 'POST'
        });

        if (response.success) {
            localStorage.setItem('user', JSON.stringify(response));
            showSuccess('Анонимный вход выполнен успешно');
            showProfile(response);
        }
    } catch (error) {
        console.error('Anonymous login error:', error);
        showError(error.message || 'Ошибка при попытке анонимного входа');
    }
}

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

        // Очищаем форму входа
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();

        showSuccess('Вы успешно вышли из системы');
        stopRoleChecking(); // Останавливаем проверку роли при выходе
        
        console.log('Logout successful');
    } catch (error) {
        console.error('Error during logout:', error);
        showError('Ошибка при выходе из системы');
    }
}

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

    // Загружаем посты
    loadPosts();
}

async function loadUserAvatar(username) {
    try {
        const response = await apiRequest(`/users/${username}/avatar`);
        
        if (response.success && response.data.avatarUrl) {
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                userAvatar.src = `${API_BASE_URL}${response.data.avatarUrl}`;
            }
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = '/assets/default-avatar.png';
        }
    }
}

function initializeAvatarUpload() {
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);
            formData.append('username', JSON.parse(localStorage.getItem('user')).data.username);

            try {
                const response = await fetch(`${API_BASE_URL}/upload-avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showSuccess('Аватар успешно обновлен');
                    loadUserAvatar(JSON.parse(localStorage.getItem('user')).data.username);
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                console.error('Error uploading avatar:', error);
                showError('Ошибка при загрузке аватара');
            }
        });
    }
}

// Единственный экспорт всех функций в конце файла
export {
    handleLogin,
    handleRegister,
    handleLogout,
    handleAnonymousLogin,
    showProfile,
    loadUserAvatar,
    initializeAvatarUpload
};