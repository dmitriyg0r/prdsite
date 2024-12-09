const API_URL = 'https://adminflow.ru:5003';

let currentPage = 1;
let totalPages = 1;

// Добавим функцию для получения userId из URL или localStorage
function getAdminId() {
    return localStorage.getItem('adminId');
}

async function loadStats() {
    try {
        const adminId = getAdminId();
        const response = await fetch(`${API_URL}/api/admin/stats?adminId=${adminId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            // Обновляем статистику пользователей
            document.getElementById('totalUsers').textContent = data.stats.total_users;
            document.getElementById('newUsers24h').textContent = data.stats.new_users_24h;
            document.getElementById('newUsers7d').textContent = data.stats.new_users_7d;
            
            // Обновляем статистику ролей
            document.getElementById('adminCount').textContent = data.stats.admin_count;
            document.getElementById('moderatorCount').textContent = data.stats.moderator_count;
            
            // Обновляем статистику сообщений
            document.getElementById('totalMessages').textContent = data.stats.total_messages;
            document.getElementById('newMessages24h').textContent = data.stats.new_messages_24h;
            document.getElementById('newMessages7d').textContent = data.stats.new_messages_7d;
            
            // Обновляем статистику активности
            document.getElementById('onlineUsers').textContent = data.stats.online_users;
            document.getElementById('activeUsers24h').textContent = data.stats.active_users_24h;
            document.getElementById('totalFriendships').textContent = data.stats.total_friendships;

            // Создаем графики после загрузки данных
            createCharts(data.stats);
        } else {
            console.error('Ошибка загрузки статистики:', data.error);
        }
    } catch (err) {
        console.error('Ошибка загрузки статистики:', err);
    }
}

// Функция для создания графиков
function createCharts(stats) {
    // График активности пользователей
    new Chart(document.getElementById('userActivityChart'), {
        type: 'line',
        data: {
            labels: ['7 дней назад', '6 дней', '5 дней', '4 дня', '3 дня', '2 дня', 'Вчера', 'Сегодня'],
            datasets: [{
                label: 'Новые пользователи',
                data: [0, 0, 0, 0, 0, 0, stats.new_users_24h, stats.new_users_7d],
                borderColor: '#3498db',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // График ролей
    new Chart(document.getElementById('rolesChart'), {
        type: 'doughnut',
        data: {
            labels: ['Пользователи', 'Модераторы', 'Админы'],
            datasets: [{
                data: [
                    stats.total_users - stats.admin_count - stats.moderator_count,
                    stats.moderator_count,
                    stats.admin_count
                ],
                backgroundColor: ['#3498db', '#e74c3c', '#2ecc71']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // График сообщений
    new Chart(document.getElementById('messageChart'), {
        type: 'bar',
        data: {
            labels: ['За 24ч', 'За 7 дней', 'Всего'],
            datasets: [{
                label: 'Сообщения',
                data: [stats.new_messages_24h, stats.new_messages_7d, stats.total_messages],
                backgroundColor: '#2ecc71'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // График активности
    new Chart(document.getElementById('activityChart'), {
        type: 'line',
        data: {
            labels: ['Онлайн', 'Активны 24ч'],
            datasets: [{
                label: 'Активность',
                data: [stats.online_users, stats.active_users_24h],
                borderColor: '#f1c40f',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

async function loadUsers(page = 1, search = '') {
    try {
        const adminId = getAdminId();
        const response = await fetch(`${API_URL}/api/admin/users?adminId=${adminId}&page=${page}&search=${search}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';
            
            data.users.forEach(user => {
                const row = document.createElement('tr');
                if (user.is_banned) {
                    row.classList.add('banned');
                }
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${user.messages_sent}</td>
                    <td>${user.friends_count}</td>
                    <td>
                        <button onclick="deleteUser(${user.id})" class="action-btn delete">Удалить</button>
                        <button onclick="banUser(${user.id})" class="action-btn ban">
                            ${user.is_banned ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                        <select onchange="changeUserRole(${user.id}, this.value)" class="role-select">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                            <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Модератор</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Админ</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(row);
            });

            totalPages = data.pages;
            updatePagination();
        } else {
            alert(data.error || 'Ошибка загрузки пользователей');
        }
    } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
        alert('Ошибка загрузки пользователей');
    }
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    // Кнопка "Назад"
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Назад';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadUsers(currentPage, document.getElementById('searchUsers').value);
        }
    };
    pagination.appendChild(prevButton);

    // Номер текущей страницы
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `${currentPage} из ${totalPages}`;
    pagination.appendChild(pageInfo);

    // Кнопка "Вперед"
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Вперед';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadUsers(currentPage, document.getElementById('searchUsers').value);
        }
    };
    pagination.appendChild(nextButton);
}

async function deleteUser(id) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        try {
            const adminId = getAdminId();
            const response = await fetch(`${API_URL}/api/admin/users/${id}?adminId=${adminId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                loadUsers(currentPage, document.getElementById('searchUsers').value);
                loadStats();
            } else {
                alert('Ошибка при удалении пользователя');
            }
        } catch (err) {
            console.error('Ошибка удаления пользователя:', err);
            alert('Ошибка при удалении пользователя');
        }
    }
}

async function login() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success && data.user.role === 'admin') {
            localStorage.setItem('adminId', data.user.id);
            document.getElementById('loginForm').style.display = 'none';
            document.querySelector('.admin-panel').style.display = 'block';
            loadStats();
            loadUsers();
        } else {
            alert('Доступ запрещен');
        }
    } catch (err) {
        console.error('Ошибка авторизации:', err);
        alert('Ошибка авторизации');
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const adminId = getAdminId();
        const response = await fetch(`${API_URL}/api/admin/role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                adminId: adminId,
                userId: userId,
                role: newRole
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadUsers(currentPage, document.getElementById('searchUsers').value);
        } else {
            alert(data.error || 'Ошибка при изменении роли пользователя');
        }
    } catch (err) {
        console.error('Ошибка при изменении роли:', err);
        alert('Ошибка при изменении роли пользователя');
    }
}

async function loadCharts() {
    try {
        const adminId = getAdminId();
        const response = await fetch(`${API_URL}/api/admin/charts?adminId=${adminId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            createRegistrationChart(data.data.registrations);
            createMessageChart(data.data.messages);
            createUserActivityChart(data.data.userActivity);
        }
    } catch (err) {
        console.error('Ошибка загрузки графиков:', err);
    }
}

function createRegistrationChart(data) {
    const ctx = document.getElementById('registrationChart');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => new Date(item.date).toLocaleDateString()),
            datasets: [{
                label: 'Новые регистрации',
                data: data.map(item => item.count),
                borderColor: '#2ecc71',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Регистрации за последние 7 дней'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createMessageChart(data) {
    const ctx = document.getElementById('messageChart');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => new Date(item.date).toLocaleDateString()),
            datasets: [{
                label: 'Сообщения',
                data: data.map(item => item.count),
                backgroundColor: '#3498db',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Активность сообщений за последние 7 дней'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createUserActivityChart(data) {
    const ctx = document.getElementById('userActivityChart');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.role),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: [
                    '#3498db',  // user
                    '#e74c3c',  // admin
                    '#f1c40f'   // moderator
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Распределение пользователей по ролям'
                }
            }
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking admin status');
    const adminId = localStorage.getItem('adminId');
    if (adminId) {
        console.log('Admin logged in, initializing panel');
        document.getElementById('loginForm').style.display = 'none';
        document.querySelector('.admin-panel').style.display = 'block';
        loadStats();
        loadUsers();
        loadCharts();
    }

    const searchInput = document.getElementById('searchUsers');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadUsers(1, e.target.value);
        }, 300);
    });
});
