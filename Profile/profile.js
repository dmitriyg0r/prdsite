const API_BASE_URL = 'https://adminflow.ru/api';

// Вспомогательные функции
const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
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

const togglePassword = () => {
    const passwordInput = document.querySelector('.password-input');
    const eyeIcon = document.querySelector('.eye-icon');
    
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

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

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
        const data = await response.json();
        console.log('Login response data:', data);

        if (response.ok && data.success) {
            // Сохраняем данные в правильном формате
            const userData = {
                success: true,
                data: {
                    username: data.data.username,
                    role: data.data.role,
                    token: data.data.token
                }
            };
            
            console.log('Saving user data:', userData); // Для отладки
            localStorage.setItem('user', JSON.stringify(userData));
            
            showSuccess('Успешный вход');
            showProfile(userData);
        } else {
            showError(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Ошибка при попытке входа');
    }
}

// Функция для анонимного входа
async function handleAnonymousLogin() {
    console.log('Anonymous login attempt started');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/anonymous-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        console.log('Anonymous login response status:', response.status);
        const data = await response.json();
        console.log('Anonymous login response data:', data);

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            showSuccess('Успешный анонимный вход');
            showProfile(data.data);
        } else {
            showError(data.message || 'Ошибка аноимного входа');
        }
    } catch (error) {
        console.error('Anonymous login error:', error);
        showError('Ошибка при попытке анонимного входа');
    }
}

// Функция отображения профиля
function showProfile(userData) {
    console.log('Showing profile for:', userData);

    const loginContainer = document.getElementById('login-container');
    const profileInfo = document.getElementById('profile-info');
    const adminSection = document.getElementById('admin-section');
    const profileUsername = document.getElementById('profile-username');
    const profileRole = document.getElementById('profile-role');

    if (!loginContainer || !profileInfo) {
        console.error('Required containers not found');
        return;
    }

    try {
        loginContainer.style.display = 'none';
        profileInfo.style.display = 'block';

        if (profileUsername) profileUsername.textContent = userData.data.username || 'Гость';
        if (profileRole) profileRole.textContent = userData.data.role || 'Пользователь';

        // Показываем админ-панель если пользователь админ
        if (adminSection) {
            if (userData.data.role === 'Admin') {
                adminSection.style.display = 'block';
                console.log('Loading users for admin...'); // Для отладки
                loadUsers();
            } else {
                adminSection.style.display = 'none';
            }
        }

        console.log('Profile displayed successfully');
    } catch (error) {
        console.error('Error displaying profile:', error);
        showError('Ошибка при отображении профиля');
    }
}

async function loadUsers() {
    console.log('Loading users...');
    try {
        const userDataString = localStorage.getItem('user');
        const userData = JSON.parse(userDataString);
        
        if (!userData?.data?.token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userData.data.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            displayUsers(data.data);
        } else {
            throw new Error(data.message || 'Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Ошибка при загрузке пользователей');
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `
            <div class="user-info">
                <span class="username">${user.username}</span>
                <span class="role">${user.role}</span>
                <span class="created-at">${new Date(user.created_at).toLocaleString()}</span>
            </div>
            <div class="user-actions">
                <button onclick="editUser(${user.id})" class="edit-btn">Редактировать</button>
                <button onclick="deleteUser(${user.id})" class="delete-btn">Удалить</button>
            </div>
        `;
        usersList.appendChild(userDiv);
    });
}

// Функция выхода и системы
function handleLogout() {
    console.log('Logging out...');
    try {
        // Очищем данные пользователя
        localStorage.removeItem('user');
        
        // Показываем форму входа и скрываем профиль
        const loginContainer = document.getElementById('login-container');
        const profileInfo = document.getElementById('profile-info');
        const adminSection = document.getElementById('admin-section');

        if (loginContainer) loginContainer.style.display = 'block';
        if (profileInfo) profileInfo.style.display = 'none';
        if (adminSection) adminSection.style.display = 'none';

        // Очищаем поля формы
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();

        console.log('Logout successful');
    } catch (error) {
        console.error('Error during logout:', error);
        showError('Ошибка при выходе из системы');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');

    // Проверяем сохраненную сессию
    const userData = localStorage.getItem('user');
    if (userData) {
        console.log('Found saved session');
        try {
            const parsedUserData = JSON.parse(userData);
            showProfile(parsedUserData);
        } catch (e) {
            console.error('Error parsing saved session:', e);
            localStorage.removeItem('user');
        }
    }

    // Привязываем обработчики событий
    const loginForm = document.getElementById('login-form');
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    const logoutBtn = document.querySelector('.danger-btn'); // Кнопка выхода

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

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Функция для удаления пользователя
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }

    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        
        if (!userData || !userData.data || !userData.data.token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userData.data.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            showSuccess('Пользователь успешно удален');
            loadUsers(); // Перезагружаем список пользователей
        } else {
            throw new Error(data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Ошибка при удалении пользователя');
    }
}

// ункция для реактирования пользователя
async function editUser(userId) {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.data?.token) {
            throw new Error('Треуется авторизация');
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
        showError('Ошибк при обновлении пользователя');
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
            await loadUsers(); // Перезагржаем список пользователей
        } else {
            throw new Error(data.message || 'Ошибка при создании пользователя');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError(error.message);
    }
}

function showRegisterForm() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('register-container').style.display = 'none';
}

async function handleRegister(event) {
    event.preventDefault();
    
    try {
        // Добавим логирование для отладки
        const registerUrl = `${API_BASE_URL}/auth/register`;
        console.log('Отправка запроса на:', registerUrl);
        
        const response = await fetch(registerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username: document.getElementById('reg-username').value,
                password: document.getElementById('reg-password').value
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
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

const toggleRegPassword = () => {
    const passwordInput = document.getElementById('reg-password');
    const eyeIcon = document.querySelector('#register-container .eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.add('show');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('show');
    }
};

// Добавим функцию для проверки доступности API
async function checkApiAvailability() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        console.log('API Status:', response.status);
    } catch (error) {
        console.error('API не доступен:', error);
    }
}

// Функция для проверки доступности API
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        const data = await response.json();
        console.log('API Health Check:', data);
        return true;
    } catch (error) {
        console.error('API Health Check Failed:', error);
        return false;
    }
}

// Проверяем API при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    const apiAvailable = await checkApiHealth();
    if (!apiAvailable) {
        showError('API сервер недоступен. Пожалуйста, попробуйте позже.');
    }
});
