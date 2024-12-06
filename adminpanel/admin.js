// Проверка авторизации и роли администратора
async function checkAdminAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Нет токена');
        window.location.href = '../authreg/authreg.html';
        return false;
    }

    try {
        console.log('Токен:', token); // Проверим токен
        const response = await fetch('https://adminflow.ru/api/users/role.php', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Добавляем для работы с сессией
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ответ сервера:', data);

        // Подробная проверка роли
        if (!data.success) {
            console.log('Ошибка в ответе сервера');
            window.location.href = '../authreg/authreg.html';
            return false;
        }

        if (!data.data || !data.data.role) {
            console.log('Роль не определена в ответе');
            window.location.href = '../authreg/authreg.html';
            return false;
        }

        if (data.data.role !== 'admin') {
            console.log('Роль не админ:', data.data.role);
            window.location.href = '../authreg/authreg.html';
            return false;
        }

        console.log('Проверка пройдена успешно, роль админ подтверждена');
        return true;

    } catch (error) {
        console.error('Ошибка при проверке роли:', error);
        window.location.href = '../authreg/authreg.html';
        return false;
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
    console.log('Начало инициализации страницы');
    const isAdmin = await checkAdminAuth();
    console.log('Результат проверки админа:', isAdmin);
    
    if (isAdmin) {
        console.log('Загружаем админ-панель');
        loadUsers();
    } else {
        console.log('Нет прав администратора, перенаправление...');
    }
});

// Обработка выхода
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '../authreg/authreg.html';
});
