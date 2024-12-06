// Проверка авторизации админа
async function checkAdminAuth() {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
        showLoginForm();
        return false;
    }
    return true;
}

// Показать форму входа
function showLoginForm() {
    document.body.innerHTML = `
        <div class="admin-login-container">
            <div class="admin-login-form">
                <h2>Вход в панель администратора</h2>
                <form id="adminLoginForm">
                    <div class="form-group">
                        <label for="username">Логин:</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Пароль:</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit">Войти</button>
                </form>
            </div>
        </div>
    `;

    // Добавляем обработчик формы
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
}

// Обработка входа админа
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('https://adminflow.ru/api/admin/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('admin_token', data.data.token);
            window.location.reload(); // Перезагружаем страницу для показа админ-панели
        } else {
            alert(data.error || 'Ошибка авторизации');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка при попытке входа');
    }
}

// Загрузка списка пользователей
async function loadUsers() {
    try {
        const response = await fetch('https://adminflow.ru/api/admin/users.php', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';

            data.data.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${user.is_online ? 'Онлайн' : 'Оффлайн'}</td>
                    <td>
                        <button onclick="editUser(${user.id})">Редактировать</button>
                        <button onclick="toggleUserStatus(${user.id})" class="danger">
                            ${user.status === 'active' ? 'Заблокировать' : 'Разблокировать'}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Навигация по секциям
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Убираем активный класс у всех кнопок и секций
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

        // Добавляем активный класс выбранной кнопке и секции
        button.classList.add('active');
        const sectionId = button.dataset.section;
        document.getElementById(sectionId).classList.add('active');

        // Загружаем данные для выбранной секции
        switch(sectionId) {
            case 'users':
                loadUsers();
                break;
            case 'posts':
                loadPosts();
                break;
            case 'reports':
                loadReports();
                break;
            case 'stats':
                loadStats();
                break;
        }
    });
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAuth();
    if (isAdmin) {
        loadUsers();
    }
});

// Обработка выхода
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '../authreg/authreg.html';
});
