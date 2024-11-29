const API_BASE_URL = 'http://localhost:3000/api';

// Вспомогательные функции
const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Автоматически скрываем ошибку через 5 секунд
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
            showError(data.message || 'Ошибка анонимного входа');
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
    const tableBody = document.getElementById('users-table-body');
    
    if (!tableBody) {
        console.error('Users table body not found');
        return;
    }

    console.log('Displaying users:', users);
    tableBody.innerHTML = '';

    if (!Array.isArray(users) || users.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5">Нет пользователей для отображения</td>';
        tableBody.appendChild(row);
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id || 'N/A'}</td>
            <td>${user.username || 'N/A'}</td>
            <td>${user.role || 'N/A'}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
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
        
        if (!userData || !userData.data || !userData.data.token) {
            throw new Error('No authentication token found');
        }

        const newUsername = prompt('Введите новое имя пользователя:');
        const newRole = prompt('Введите новую роль (Admin/User):');
        
        if (!newUsername || !newRole) {
            return; // Поьзователь отменил редактирование
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userData.data.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: newUsername,
                role: newRole
            }),
            credentials: 'include'
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
    console.log('Opening create user modal');
    try {
        // В будущем здесь можно использовать модальное окно вместо prompt
        const username = prompt('Введите имя пользователя:');
        if (!username) return;

        const password = prompt('Введите пароль:');
        if (!password) return;

        const role = prompt('Введите роль (Admin/User):');
        if (!role || !['Admin', 'User'].includes(role)) {
            showError('Некорректная роль. Допустимые значения: Admin, User');
            return;
        }

        await createUser(username, password, role);
    } catch (error) {
        console.error('Error in showCreateUserModal:', error);
        showError('Ошибка при создании пользователя');
    }
}

// Функция для создания нового пользователя
async function createUser(username, password, role) {
    console.log('Creating new user:', { username, role });
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        
        if (!userData?.data?.token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userData.data.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                role
            }),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('Create user response:', data);
        
        if (response.ok && data.success) {
            showSuccess('Пользователь успешно создан');
            await loadUsers(); // Перезагружаем список пользователй
        } else {
            throw new Error(data.message || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Ошибка при создании пользователя: ' + error.message);
    }
}
