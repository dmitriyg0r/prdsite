const API_URL = (() => {
    switch(window.location.hostname) {
        case 'localhost':
            return 'http://localhost:3000';
        case 'space-point.ru':
            return 'https://space-point.ru';
        default:
            return 'https://space-point.ru'; // fallback на продакшен
    }
})();

let currentPage = 1;
let totalPages = 1;

// Добавим функцию для получения userId из URL или localStorage
function getAdminId() {
    return localStorage.getItem('adminId');
}

// Добавим функцию проверки авторизации
function checkAuth() {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
        document.getElementById('loginForm').style.display = 'block';
        document.querySelector('.admin-panel').style.display = 'none';
        return false;
    }
    return true;
}

// Общая функция для проверки ответа
async function handleResponse(response) {
    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сервера');
        } else {
            throw new Error(`HTTP ошибка! статус: ${response.status}`);
        }
    }
    return await response.json();
}

async function loadStats() {
    if (!checkAuth()) return;
    
    try {
        const response = await fetch(`${API_URL}/api/stats?adminId=${localStorage.getItem('adminId')}`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('adminId');
            localStorage.removeItem('adminToken');
            location.reload();
            return;
        }

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
        }
    } catch (err) {
        if (err.message.includes('401')) {
            localStorage.removeItem('adminId');
            localStorage.removeItem('adminToken');
            location.reload();
        }
    }
}

// Функция для создания графиков
function createCharts(stats) {
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    Chart.defaults.font.size = 11;
    
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        }
    };

    // График активности пользователей
    new Chart(document.getElementById('userActivityChart'), {
        type: 'line',
        data: {
            labels: ['7д', '6д', '5д', '4д', '3д', '2д', '1д', 'Сег'],
            datasets: [{
                data: stats.user_activity_data || [0, 0, 0, 0, 0, 0, stats.new_users_24h, stats.new_users_7d],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // График ролей (делаем более компактным)
    new Chart(document.getElementById('rolesChart'), {
        type: 'doughnut',
        data: {
            labels: ['Польз.', 'Модер.', 'Админ'],
            datasets: [{
                data: [
                    stats.total_users - stats.admin_count - stats.moderator_count,
                    stats.moderator_count,
                    stats.admin_count
                ],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(46, 204, 113, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            ...commonOptions,
            cutout: '70%',
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        boxWidth: 10,
                        padding: 5
                    }
                }
            }
        }
    });

    // График сообщений
    new Chart(document.getElementById('messageChart'), {
        type: 'bar',
        data: {
            labels: ['24ч', '7д', 'Всего'],
            datasets: [{
                data: [stats.new_messages_24h, stats.new_messages_7d, stats.total_messages],
                backgroundColor: 'rgba(46, 204, 113, 0.8)',
                borderRadius: 3
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // График активности
    new Chart(document.getElementById('activityChart'), {
        type: 'line',
        data: {
            labels: ['Онлайн', 'Активны'],
            datasets: [{
                data: [stats.online_users, stats.active_users_24h],
                borderColor: '#f1c40f',
                backgroundColor: 'rgba(241, 196, 15, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

async function loadUsers(page = 1, search = '') {
    if (!checkAuth()) return;

    try {
        const response = await fetch(`${API_URL}/api/users?page=${page}&search=${search}&adminId=${localStorage.getItem('adminId')}`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'X-Admin-ID': localStorage.getItem('adminId')
            }
        });

        const data = await handleResponse(response);
        
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
        handleError(err);
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
            const response = await fetch(`${API_URL}/api/users/${id}?adminId=${adminId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('adminId');
                localStorage.removeItem('adminToken');
                location.reload();
                return;
            }

            const data = await response.json();
            
            if (data.success) {
                loadUsers(currentPage, document.getElementById('searchUsers').value);
                loadStats();
            } else {
                alert(data.error || 'Ошибка при удалении пользователя');
            }
        } catch (err) {
            alert('Ошибка при удалении пользователя');
        }
    }
}

// Модифицируем функцию login
async function login() {
    try {
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        if (!username || !password) {
            throw new Error('Пожалуйста, заполните все поля');
        }

        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: username.trim(),
                password: password.trim()
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка авторизации');
        }

        const data = await response.json();

        if (data.success && data.user && data.user.role === 'admin') {
            localStorage.setItem('adminId', data.user.id);
            localStorage.setItem('adminToken', data.token);
            document.getElementById('loginForm').style.display = 'none';
            document.querySelector('.admin-panel').style.display = 'block';
            loadStats();
            loadUsers();
        } else {
            throw new Error('Недостаточно прав для доступа к админ-панели');
        }
    } catch (err) {
        alert(err.message || 'Ошибка при попытке входа. Пожалуйста, попробуйте позже.');
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const adminId = getAdminId();
        const response = await fetch(`${API_URL}/api/role`, {
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
        alert('Ошибка при изменении роли пользователя');
    }
}

// Глобальные переменные для хранения экземпляров графиков
let registrationChart = null;
let messageChart = null;
let userActivityChart = null;
let rolesChart = null;

async function loadCharts() {
    try {
        const response = await fetch(`${API_URL}/api/charts?adminId=${localStorage.getItem('adminId')}`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        const data = await response.json();
        
        if (data.success) {
            // Уничтожаем существующие графики перед созданием новых
            if (registrationChart) {
                registrationChart.destroy();
                registrationChart = null;
            }
            if (messageChart) {
                messageChart.destroy();
                messageChart = null;
            }
            if (userActivityChart) {
                userActivityChart.destroy();
                userActivityChart = null;
            }
            if (rolesChart) {
                rolesChart.destroy();
                rolesChart = null;
            }

            createRegistrationChart(data.data.registrations);
            createMessageChart(data.data.messages);
            createUserActivityChart(data.data.userActivity);
            createRolesChart(data.data.roles);
        }
    } catch (err) {
    }
}

function createRegistrationChart(data) {
    const ctx = document.getElementById('registrationChart');
    if (!ctx) return;
    
    registrationChart = new Chart(ctx, {
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
            maintainAspectRatio: false,
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
    if (!ctx) return;
    
    messageChart = new Chart(ctx, {
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
            maintainAspectRatio: false,
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
    if (!ctx) return;
    
    userActivityChart = new Chart(ctx, {
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
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Распределение пользователей по ролям'
                }
            }
        }
    });
}

function createRolesChart(data) {
    const ctx = document.getElementById('rolesChart');
    if (!ctx) return;
    
    rolesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Пользователи', 'Модераторы', 'Админы'],
            datasets: [{
                data: [
                    data.total_users - data.admin_count - data.moderator_count,
                    data.moderator_count,
                    data.admin_count
                ],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(46, 204, 113, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    document.getElementById('loginForm').style.display = 'none';
    document.querySelector('.admin-panel').style.display = 'block';
    loadStats();
    loadUsers();
    setTimeout(loadCharts, 100);

    // Добавляем обработчик поиска
    const searchInput = document.getElementById('searchUsers');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadUsers(1, e.target.value);
        }, 300);
    });

    loadWhiteListData();

    // Добавляем обработку вкладок
    const tabs = document.querySelectorAll('.admin-nav li');
    const contentSections = {
        dashboard: document.querySelector('.stats-grid'),
        users: document.querySelector('.users-section'),
        whitelist: document.querySelector('.whitelist-section'),
        settings: document.querySelector('.settings-section')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем активный класс у всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей вкладке
            tab.classList.add('active');

            // Скрываем все секции
            Object.values(contentSections).forEach(section => {
                if (section) section.style.display = 'none';
            });

            // Показываем нужную секцию
            const sectionId = tab.dataset.tab;
            if (contentSections[sectionId]) {
                contentSections[sectionId].style.display = 'block';
            }
        });
    });

    // Активируем первую вкладку по умолчанию
    tabs[0].click();
});

// Добавим функцию выхода
function logout() {
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminToken');
    location.reload();
}

// Добавим обработчик ошибок для всех fetch запросов
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('401')) {
        localStorage.removeItem('adminId');
        localStorage.removeItem('adminToken');
        location.reload();
    }
});

// Функция для загрузки данных White List
async function loadWhiteListData() {
    try {
        const response = await fetch(`${API_URL}/api/White_List`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await handleResponse(response);
        
        if (data.success) {
            const tbody = document.getElementById('whitelistTableBody');
            tbody.innerHTML = '';
            
            data.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.UUID}</td>
                    <td>${item.user}</td>
                    <td>
                        <button onclick="removeFromWhitelist('${item.UUID}')" class="action-btn delete">
                            Удалить
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (err) {
        console.error('Ошибка при загрузке White List:', err);
    }
}

// Функция для добавления в White List
async function addToWhitelist() {
    const user = document.getElementById('userInput').value.trim();
    
    if (!user) {
        alert('Пожалуйста, введите имя пользователя');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/White_List`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include',
            body: JSON.stringify({ user: user })
        });
        
        const data = await handleResponse(response);
        
        if (data.success) {
            document.getElementById('userInput').value = '';
            loadWhiteListData();
        }
    } catch (err) {
        console.error('Ошибка при добавлении в White List:', err);
        alert('Ошибка при добавлении в White List');
    }
}

// Функция для удаления из White List
async function removeFromWhitelist(uuid) {
    if (!confirm('Вы уверены, что хотите удалить этого игрока из White List?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/White_List/${uuid}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include'
        });
        
        const data = await handleResponse(response);
        
        if (data.success) {
            loadWhiteListData();
        }
    } catch (err) {
        console.error('Ошибка при удалении из White List:', err);
        alert('Ошибка при удалении из White List');
    }
}

