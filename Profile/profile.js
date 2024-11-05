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

// Обновляем URL для API запросов
const API_BASE_URL = 'https://adminflow.ru:5002/api'; // Используйте ваш домен и порт

async function handleAnonymousLogin() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/anonymous-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data));
            showProfile(data);
        } else {
            const error = await response.json();
            showError(error.message || 'Ошибка входа');
        }
    } catch (error) {
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

async function loadUsers() {
    console.log('LoadUsers called');
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        console.log('Token:', userData.token);

        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const users = await response.json();
            console.log('Users data:', users);
            displayUsers(users);
        } else {
            const errorData = await response.json();
            console.error('Error loading users:', errorData);
        }
    } catch (error) {
        console.error('Error in loadUsers:', error);
    }
}

function displayUsers(users) {
    console.log('DisplayUsers called with:', users);
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) {
        console.error('Table body element not found!');
        return;
    }
    
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.role}</td>
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

async function editUser(userId) {
    // Реализация редактирования пользователя
    console.log('Редактирование пользователя:', userId);
}

async function deleteUser(userId) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        try {
            const userData = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${userData.token}`
                }
            });
            
            if (response.ok) {
                loadUsers(); // Перезагружаем список пользователей
            } else {
                console.error('Ошибка удаления пользователя');
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }
}

function showProfile(userData) {
    console.log('ShowProfile called with userData:', userData);

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';
    
    // Обновляем информацию профиля
    document.getElementById('profile-username').textContent = userData.username || 'Анонимный пользователь';
    document.getElementById('profile-role').textContent = userData.role || 'Гость';
    
    // Показываем админ-панель, если пользователь админ
    const adminSection = document.getElementById('admin-section');
    console.log('User role:', userData.role);
    
    if (userData.role === 'Admin') {
        console.log('Showing admin section');
        adminSection.style.display = 'block';
        loadUsers(); // Загружаем список пользователей
    } else {
        console.log('Hiding admin section');
        adminSection.style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('user');
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
}

async function handleLogin(event) {
    event.preventDefault();
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username: document.getElementById('username').value,
                password: document.getElementById('password').value 
            })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data));
            showProfile(data);
        } else {
            const error = await response.json();
            showError(error.message || 'Ошибка входа');
        }
    } catch (error) {
        showError('Ошибка сервера. Попробуйте позже.');
        console.error('Login error:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    const userData = localStorage.getItem('user');
    if (userData) {
        console.log('Found user data in localStorage:', userData);
        showProfile(JSON.parse(userData));
    } else {
        console.log('No user data found in localStorage');
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
    }
});
