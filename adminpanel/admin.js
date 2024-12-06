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
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
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
                    <td>${user.status}</td>
                    <td>
                        <button onclick="editUser(${user.id})" class="btn-edit">Редактировать</button>
                        <button onclick="toggleUserStatus(${user.id})" class="btn-toggle">
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

// Загрузка жалоб
async function loadReports() {
    try {
        const response = await fetch('https://adminflow.ru/api/admin/reports.php', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('reportsContainer');
            container.innerHTML = '';

            data.data.forEach(report => {
                const reportElement = document.createElement('div');
                reportElement.className = 'report-item';
                reportElement.innerHTML = `
                    <div class="report-header">
                        <span class="report-type">${report.type}</span>
                        <span class="report-date">${new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    <div class="report-content">
                        <p><strong>От:</strong> ${report.reporter}</p>
                        <p><strong>На:</strong> ${report.reported}</p>
                        <p><strong>Причина:</strong> ${report.reason}</p>
                    </div>
                    <div class="report-actions">
                        <button onclick="resolveReport(${report.id})" class="btn-resolve">Разрешить</button>
                        <button onclick="dismissReport(${report.id})" class="btn-dismiss">Отклонить</button>
                    </div>
                `;
                container.appendChild(reportElement);
            });
        }
    } catch (error) {
        console.error('Failed to load reports:', error);
    }
}

// Загрузка статистики
async function loadStats() {
    try {
        const response = await fetch('https://adminflow.ru/api/admin/stats.php', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            // Обновляем статистику
            document.getElementById('totalUsers').textContent = data.data.users.total;
            document.getElementById('totalPosts').textContent = data.data.posts.total;
            document.getElementById('activeUsers').textContent = data.data.users.active;
            document.getElementById('totalReports').textContent = data.data.reports.total;

            // Обновляем графики
            updateCharts(data.data.charts);
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
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
