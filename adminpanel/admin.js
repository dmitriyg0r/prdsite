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
    const loginForm = document.getElementById('loginForm');
    const adminPanel = document.querySelector('.admin-container');

    if (!adminId) {
        if (loginForm) loginForm.style.display = 'block';
        if (adminPanel) adminPanel.style.display = 'none';
        return false;
    }

    if (loginForm) loginForm.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';
    return true;
}

// Улучшенная функция обработки ответа с типизацией и детальной обработкой ошибок
async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
        if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
    }

    if (contentType?.includes('application/json')) {
        return await response.json();
    }
    
    throw new Error('Неподдерживаемый тип контента');
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
    // Общие настройки для всех графиков
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    Chart.defaults.font.size = 12;
    
    // График активности пользователей
    new Chart(document.getElementById('userActivityChart'), {
        type: 'line',
        data: {
            labels: ['7 дней назад', '6 дней', '5 дней', '4 дня', '3 дня', '2 дня', 'Вчера', 'Сегодня'],
            datasets: [{
                label: 'Новые пользователи',
                data: stats.user_activity_data || [0, 0, 0, 0, 0, 0, stats.new_users_24h, stats.new_users_7d],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
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

    // График сообщений
    new Chart(document.getElementById('messageChart'), {
        type: 'bar',
        data: {
            labels: ['За 24ч', 'За 7 дней', 'Всего'],
            datasets: [{
                label: 'Сообщения',
                data: [stats.new_messages_24h, stats.new_messages_7d, stats.total_messages],
                backgroundColor: 'rgba(46, 204, 113, 0.8)',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
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
            labels: ['Онлайн', 'Активны 24ч'],
            datasets: [{
                label: 'Активность',
                data: [stats.online_users, stats.active_users_24h],
                borderColor: '#f1c40f',
                backgroundColor: 'rgba(241, 196, 15, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
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

// Улучшенная функция загрузки пользователей с кэшированием и дебаунсингом
const userCache = new Map();
let loadUsersTimeout;

async function loadUsers(page = 1, search = '', filters = {}) {
    if (!checkAuth()) return;

    const cacheKey = `${page}-${search}-${JSON.stringify(filters)}`;
    if (userCache.has(cacheKey)) {
        const cachedData = userCache.get(cacheKey);
        if (Date.now() - cachedData.timestamp < 30000) { // 30 секунд
            updateUsersTable(cachedData.data.users);
            updatePagination(cachedData.data.totalPages);
            return;
        }
    }

    clearTimeout(loadUsersTimeout);
    loadUsersTimeout = setTimeout(async () => {
        showLoader();
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: 50,
                search,
                ...filters,
                adminId: localStorage.getItem('adminId')
            });

            const response = await fetch(`${API_URL}/api/users?${queryParams}`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'X-Admin-ID': localStorage.getItem('adminId')
                }
            });

            const data = await handleResponse(response);
            
            if (data.success) {
                userCache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                
                updateUsersTable(data.users);
                updatePagination(data.totalPages || Math.ceil(data.total / 50));
                document.querySelector('.users-table-section').style.display = 'block';
            }
        } catch (err) {
            handleError(err);
        } finally {
            hideLoader();
        }
    }, 300); // Дебаунсинг 300мс
}

function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    // Кнопка "Первая страница"
    if (currentPage > 1) {
        const firstButton = document.createElement('button');
        firstButton.textContent = '<<';
        firstButton.onclick = () => loadUsers(1, document.getElementById('searchUsers').value);
        pagination.appendChild(firstButton);
    }

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

    // Номера страниц
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === currentPage ? 'active' : '';
        pageButton.onclick = () => {
            currentPage = i;
            loadUsers(i, document.getElementById('searchUsers').value);
        };
        pagination.appendChild(pageButton);
    }

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

    // Кнопка "Последняя страница"
    if (currentPage < totalPages) {
        const lastButton = document.createElement('button');
        lastButton.textContent = '>>';
        lastButton.onclick = () => loadUsers(totalPages, document.getElementById('searchUsers').value);
        pagination.appendChild(lastButton);
    }
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
        const username = document.getElementById('adminUsername')?.value;
        const password = document.getElementById('adminPassword')?.value;

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
            
            // Получаем элементы и проверяем их существование
            const loginForm = document.getElementById('loginForm');
            const adminPanel = document.querySelector('.admin-container');
            
            if (loginForm) {
                loginForm.style.display = 'none';
            } else {
                console.error('Элемент loginForm не найден');
            }
            
            if (adminPanel) {
                adminPanel.style.display = 'block';
            } else {
                console.error('Элемент admin-container не найден');
            }
            
            loadStats();
            loadUsers();
        } else {
            throw new Error('Недостаточно прав для доступа к админ-панели');
        }
    } catch (err) {
        // Используем новую систему уведомлений
        notifications.error(err.message || 'Ошибка при попытке входа. Пожалуйста, попробуйте позже.');
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
    // Проверяем авторизацию без раннего возврата
    const isAuthorized = checkAuth();

    // Получаем элементы с проверкой на существование
    const statsGrid = document.querySelector('.stats-grid');
    
    if (isAuthorized && statsGrid) {
        statsGrid.style.display = 'grid';
    }
    
    // Инициализируем обработчики табов
    const tabs = document.querySelectorAll('.admin-nav li');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Получаем все секции с проверкой существования
                const sections = document.querySelectorAll('.stats-grid, .users-table-section, .whitelist-section, .settings-section');
                sections.forEach(section => {
                    if (section) section.style.display = 'none';
                });
                
                // Показываем нужную секцию с проверкой существования
                switch(targetTab) {
                    case 'dashboard':
                        const statsGrid = document.querySelector('.stats-grid');
                        if (statsGrid) statsGrid.style.display = 'grid';
                        if (isAuthorized) loadStats();
                        break;
                    case 'users':
                        const usersSection = document.querySelector('.users-table-section');
                        if (usersSection) usersSection.style.display = 'block';
                        if (isAuthorized) loadUsers(1);
                        break;
                    case 'whitelist':
                        const whitelistSection = document.querySelector('.whitelist-section');
                        if (whitelistSection) whitelistSection.style.display = 'block';
                        if (isAuthorized) loadWhiteListData();
                        break;
                    case 'settings':
                        const settingsSection = document.querySelector('.settings-section');
                        if (settingsSection) settingsSection.style.display = 'block';
                        break;
                }
            });
        });
    }

    // Инициализация поиска и фильтров с проверками
    const searchInput = document.getElementById('searchUsers');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    let searchTimeout;

    if (searchInput && roleFilter && statusFilter) {
        const handleFiltersChange = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadUsers(1, searchInput.value, {
                    role: roleFilter.value,
                    status: statusFilter.value
                });
            }, 300);
        };

        searchInput.addEventListener('input', handleFiltersChange);
        roleFilter.addEventListener('change', handleFiltersChange);
        statusFilter.addEventListener('change', handleFiltersChange);
    }

    // Если авторизован, загружаем начальные данные
    if (isAuthorized) {
        loadStats();
        setTimeout(loadCharts, 100);
    }
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
    const uuid = document.getElementById('uuidInput').value.trim();
    const username = document.getElementById('userInput').value.trim();
    
    if (!uuid || !username) {
        alert('Пожалуйста, заполните оба поля');
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
            body: JSON.stringify({ UUID: uuid, user: username })
        });
        
        const data = await handleResponse(response);
        
        if (data.success) {
            document.getElementById('uuidInput').value = '';
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

// Добавляем функцию для безопасного вывода HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Добавляем функцию форматирования даты
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Добавляем систему уведомлений
const notifications = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notifications-container';
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'info', duration = 3000) {
        this.init();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        this.container.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },
    
    success(message) {
        this.show(message, 'success');
    },
    
    error(message) {
        this.show(message, 'error');
    },
    
    info(message) {
        this.show(message, 'info');
    }
};

// Добавляем функцию обработки ошибок
function handleError(error) {
    console.error('Error:', error);
    notifications.error(error.message || 'Произошла ошибка');
    
    if (error.message.includes('401')) {
        localStorage.removeItem('adminId');
        localStorage.removeItem('adminToken');
        location.reload();
    }
}

// Добавим стили для уведомлений в head
const style = document.createElement('style');
style.textContent = `
    .notifications-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
    }

    .notification {
        background: white;
        border-radius: 8px;
        padding: 12px 24px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 400px;
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification.success {
        border-left: 4px solid #22c55e;
    }

    .notification.error {
        border-left: 4px solid #ef4444;
    }

    .notification.info {
        border-left: 4px solid #3b82f6;
    }

    .notification i {
        font-size: 1.25rem;
    }

    .notification.success i {
        color: #22c55e;
    }

    .notification.error i {
        color: #ef4444;
    }

    .notification.info i {
        color: #3b82f6;
    }
`;
document.head.appendChild(style);

