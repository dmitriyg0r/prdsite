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
}

const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
};

// Добавляем функцию showProfile
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
            const isAdmin = userData.data.role === 'Admin';
            console.log('Is user admin?', isAdmin);
            adminSection.style.display = isAdmin ? 'block' : 'none';
            if (isAdmin) {
                console.log('Loading users for admin...');
                loadUsers(); // Загружаем пользователей если админ
            }
        } else {
            console.error('Admin section not found');
        }

        console.log('Profile displayed successfully');
    } catch (error) {
        console.error('Error displaying profile:', error);
        showError('Ошибка при отображении профиля');
    }
}

// Обновляем функцию handleAnonymousLogin
window.handleAnonymousLogin = async function() {
    try {
        const response = await fetch('/api/auth/anonymous-login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Anonymous login response status:', response.status);
        console.log('Anonymous login response data:', data);

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data));
            showSuccess('Успешный анонимный вход');
            showProfile(data);
        } else {
            showError(data.message || 'Ошибка анонимного входа');
        }
    } catch (error) {
        console.error('Anonymous login error:', error);
        showError('Ошибка при попытке анонимного входа');
    }
}

// Обновляем функцию handleLogin
async function handleLogin(event) {
    event.preventDefault();
    console.log('Login attempt started');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('Login response status:', response.status);
        console.log('Login response data:', data);

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data));
            showSuccess('Успешный вход');
            showProfile(data);
        } else {
            showError(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

// Функция для загрузки пользователей
async function loadUsers() {
    console.log('Loading users...');
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        
        if (!userData || !userData.token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('/api/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
            }
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

// Функция для отображения пользователей в таблице
function displayUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    
    if (!tableBody) {
        console.error('Users table body not found');
        return;
    }

    tableBody.innerHTML = '';

    if (!Array.isArray(users) || users.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">Нет пользователей для отображения</td>';
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

// Функция для удаления пользователя
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${user.data.token}`,
                'Content-Type': 'application/json'
            }
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

// Функция для редактирования пользователя
function editUser(userId) {
    // Здесь можно добавить модальное окно для редактирования
    alert('Редактирование пользователя будет добавлено позже');
}

// Добавляем функцию showSuccess если её нет
function showSuccess(message) {
    console.log('Success:', message);
    // Можно добавить красивое уведомление об успехе
}

// Add event listeners when the document loads
document.addEventListener('DOMContentLoaded', () => {
    // Bind regular login form submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Bind anonymous login button
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
    }

    // Проверяем сохраненную сессию
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const parsedUserData = JSON.parse(userData);
            showProfile(parsedUserData);
        } catch (e) {
            console.error('Error parsing saved session:', e);
            localStorage.removeItem('user');
        }
    }
}); 