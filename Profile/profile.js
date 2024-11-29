const API_BASE_URL = 'https://adminflow.ru/api';

function showError(message) {
    alert(message);
}

// Функция для проверки состояния сервера
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            mode: 'cors'
        });
        console.log('Server health check status:', response.status);
        return response.ok;
    } catch (error) {
        console.error('Server health check failed:', error);
        return false;
    }
}

// Функция для анонимного входа
async function handleAnonymousLogin() {
    try {
        console.log('Attempting anonymous login...');
        
        const response = await fetch(`${API_BASE_URL}/auth/anonymous-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Login successful:', data);
        
        if (data.success) {
            // Создаем объект с данными анонимного пользователя
            const anonymousUser = {
                username: 'Гость',
                role: 'anonymous',
                token: data.token || null
            };
            
            // Сохраняем данные в localStorage
            localStorage.setItem('user', JSON.stringify(anonymousUser));
            
            // Скрываем форму входа
            document.getElementById('login-container').style.display = 'none';
            
            // Показываем информацию о профиле
            const profileInfo = document.getElementById('profile-info');
            profileInfo.style.display = 'block';
            
            // Обновляем информацию в профиле
            document.getElementById('profile-username').textContent = anonymousUser.username;
            document.getElementById('profile-role').textContent = anonymousUser.role;
            
        } else {
            throw new Error(data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Anonymous login error:', error);
        showError(`Ошибка анонимного входа: ${error.message}`);
    }
}

async function loadUsers() {
    console.log('LoadUsers called');
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData || !userData.token) {
            console.error('No token found');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                console.log('Users data:', result.data);
                displayUsers(result.data);
            } else {
                console.error('Error in response:', result);
            }
        } else {
            const errorData = await response.json();
            console.error('Error loading users:', errorData);
            showError('Ошибка загрузки пользователей');
        }
    } catch (error) {
        console.error('Error in loadUsers:', error);
        showError('Ошибка при загрузке данных');
    }
}

function displayUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) {
        console.error('Table body element not found!');
        return;
    }
    
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Форматируем дату
        const createdAt = new Date(user.createdAt).toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td>${createdAt}</td>
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

// Функция для отображения профиля
function showProfile(userData) {
    // Скрываем форму входа
    document.getElementById('login-container').style.display = 'none';
    
    // Показываем информацию о профиле
    const profileInfo = document.getElementById('profile-info');
    profileInfo.style.display = 'block';
    
    // Обновляем информацию в профиле
    document.getElementById('profile-username').textContent = userData.username;
    document.getElementById('profile-role').textContent = userData.role;
    
    // Если пользователь админ, показываем админ-панель
    if (userData.role === 'admin') {
        document.getElementById('admin-section').style.display = 'block';
        loadUsers(); // Загружаем список пользователей
    }
}

// Функция для выхода
function handleLogout() {
    // Очищаем данные пользователя
    localStorage.removeItem('user');
    
    // Показываем форму входа
    document.getElementById('login-container').style.display = 'block';
    
    // Скрываем информацию о профиле и админ-панель
    document.getElementById('profile-info').style.display = 'none';
    document.getElementById('admin-section').style.display = 'none';
}

// При загрузке страницы проверяем, есть ли сохраненный пользователь
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        showProfile(JSON.parse(savedUser));
    }
});

// Функция для проверки доступности сервера
async function checkServerAvailability() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            credentials: 'include'
        });
        return response.ok;
    } catch (error) {
        console.error('Server check failed:', error);
        return false;
    }
}

// Обновляем функцию handleLogin
async function handleLogin(event) {
    event.preventDefault();
    console.log('Attempting login...');

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

        console.log('Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.data));
                showProfile(data.data);
            } else {
                showError(data.message || 'Login failed');
            }
        } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
            showError(`Login failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(`Login error: ${error.message}`);
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
        anonymousLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Anonymous login button clicked');
            handleAnonymousLogin();
        });
    }
});

// Глобальные переменные для модальных окон
let currentUserId = null;
let deleteUserId = null;

// Функции для работы с модальными окнами
function showCreateUserModal() {
    document.getElementById('modal-title').textContent = 'Добавить пользователя';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('password').required = true;
    document.getElementById('userModal').style.display = 'block';
}

function showEditUserModal(user) {
    document.getElementById('modal-title').textContent = 'Редактировать пользователя';
    document.getElementById('userId').value = user.id;
    document.getElementById('username').value = user.username;
    document.getElementById('role').value = user.role;
    document.getElementById('password').required = false;
    document.getElementById('userModal').style.display = 'block';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

function showDeleteModal(userId) {
    deleteUserId = userId;
    document.getElementById('deleteModal').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteUserId = null;
}

// CRUD операции
async function handleUserSubmit(event) {
    event.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const userData = {
        username: document.getElementById('username').value,
        role: document.getElementById('role').value,
        password: document.getElementById('password').value
    };

    try {
        const token = JSON.parse(localStorage.getItem('user')).token;
        const url = userId 
            ? `${API_BASE_URL}/users/${userId}`
            : `${API_BASE_URL}/users`;
        
        const response = await fetch(url, {
            method: userId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            closeUserModal();
            loadUsers();
            showSuccess(userId ? 'Пользователь обновлен' : 'Пользователь создан');
        } else {
            const error = await response.json();
            showError(error.message || 'Произошла ошибка');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Произошла ошибка при сохранении');
    }
}

async function editUser(userId) {
    try {
        const token = JSON.parse(localStorage.getItem('user')).token;
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showEditUserModal(result.data);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Ошибка при загрузке данных пользователя');
    }
}

async function deleteUser(userId) {
    showDeleteModal(userId);
}

async function confirmDelete() {
    try {
        const token = JSON.parse(localStorage.getItem('user')).token;
        const response = await fetch(`${API_BASE_URL}/users/${deleteUserId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            closeDeleteModal();
            loadUsers();
            showSuccess('Пользователь удален');
        } else {
            const error = await response.json();
            showError(error.message || 'Произошла ошибка при удалении');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Произошла ошибка при удалении');
    }
}

// Вспомогательные функции для уведомлений
function showSuccess(message) {
    // Добавьте свою реализацию уведомлений
    alert(message);
}
