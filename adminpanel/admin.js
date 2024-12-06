// Проверка авторизации и роли администратора
async function checkAdminAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../authreg/authreg.html';
        return;
    }

    try {
        const response = await fetch('/api/users/role.php', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        console.log('Role check response:', data);

        if (!data.success || data.data.role !== 'admin') {
            window.location.href = '../authreg/authreg.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '../authreg/authreg.html';
    }
}

// Загрузка списка пользователей
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users.php', {
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
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadUsers(); // Загружаем пользователей по умолчанию
});

// Обработка выхода
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '../authreg/authreg.html';
});
