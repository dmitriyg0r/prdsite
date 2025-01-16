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

// Добавляем новую функцию для инициализации обработчиков событий
function initializeEventHandlers() {
    // Обработчики для вкладок
    const tabs = document.querySelectorAll('.admin-nav li');
    const contentSections = {
        dashboard: document.querySelector('.stats-grid'),
        users: document.querySelector('.users-section'),
        whitelist: document.querySelector('.whitelist-section'),
        settings: document.querySelector('.settings-section'),
        console: document.querySelector('.console-section'),
        files: document.querySelector('.files-section')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            Object.values(contentSections).forEach(section => {
                if (section) section.style.display = 'none';
            });

            const sectionId = tab.dataset.tab;
            if (contentSections[sectionId]) {
                contentSections[sectionId].style.display = 'block';
            }
        });
    });

    // Обработчик поиска
    const searchInput = document.getElementById('searchUsers');
    let searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadUsers(1, e.target.value);
            }, 300);
        });
    }

    // Активируем первую вкладку
    if (tabs.length > 0) {
        tabs[0].click();
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
            
            // Инициализируем обработчики после успешного входа
            initializeEventHandlers();
            
            loadStats();
            loadUsers();
            loadWhiteListData();
            setTimeout(loadCharts, 100);
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
    
    // Инициализируем обработчики при загрузке страницы
    initializeEventHandlers();
    initializeContextMenu()
    loadStats();
    loadUsers();
    loadWhiteListData();
    setTimeout(loadCharts, 100);
    initializeTerminal();
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
                row.setAttribute('data-uuid', item.UUID);
                row.innerHTML = `
                    <td>${item.UUID}</td>
                    <td>${item.user}</td>
                    <td>${new Date(item.payment_date).toLocaleDateString()}</td>
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
    if (!uuid) {
        alert('Ошибка: UUID не может быть пустым');
        return;
    }

    if (!confirm('Вы уверены, что хотите удалить этого игрока из White List?')) {
        return;
    }
    
    try {
        console.log('Attempting to delete UUID:', uuid);
        
        // Если UUID равен "NULL" или "null", преобразуем его в строку "null"
        const endpoint = uuid.toLowerCase() === 'null' ? 
            `${API_URL}/api/White_List/null` : 
            `${API_URL}/api/White_List/${uuid}`;

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        
        const data = await handleResponse(response);
        
        console.log('Response data:', data);
        
        if (data.success) {
            // Ищем строку как по UUID, так и по значению "NULL"
            const row = document.querySelector(`tr[data-uuid="${uuid}"], tr[data-uuid="NULL"], tr[data-uuid="null"]`);
            console.log('Found row:', row);
            
            if (row) {
                row.parentNode.removeChild(row);
                console.log('Row removed');
            } else {
                console.log('Row not found, reloading table');
                await loadWhiteListData();
            }
        } else {
            throw new Error(data.error || 'Ошибка при удалении');
        }
    } catch (err) {
        console.error('Ошибка при удалении из White List:', err);
        alert('Ошибка при удалении из White List: ' + err.message);
    }
}

let ws = null;
let terminalSessionId = null;
let commandHistory = [];
let historyIndex = -1;

function initializeTerminal() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = (() => {
        switch(window.location.hostname) {
            case 'localhost':
                return 'ws://localhost:3002';
            case 'space-point.ru':
                return `${wsProtocol}//${window.location.hostname}/ws`;
            default:
                return `${wsProtocol}//${window.location.hostname}/ws`;
        }
    })();

    console.log('Подключение к WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket соединение установлено');
        terminalOutput.innerHTML += '<div class="output-line">Соединение установлено...</div>';
    };

    ws.onclose = () => {
        console.log('WebSocket соединение закрыто');
        terminalOutput.innerHTML += '<div class="error-line">Соединение закрыто. Переподключение...</div>';
        // Попытка переподключения через 5 секунд
        setTimeout(initializeTerminal, 5000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
        terminalOutput.innerHTML += '<div class="error-line">Ошибка соединения</div>';
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            switch(data.type) {
                case 'connected':
                    terminalOutput.innerHTML += '<div class="output-line">Терминал готов к работе</div>';
                    break;
                case 'output':
                    terminalOutput.innerHTML += `<div class="output-line">${escapeHtml(data.data)}</div>`;
                    break;
                case 'error':
                    terminalOutput.innerHTML += `<div class="error-line">${escapeHtml(data.data)}</div>`;
                    break;
                case 'close':
                    terminalOutput.innerHTML += `<div class="output-line">${escapeHtml(data.data)}</div>`;
                    break;
                case 'system_info':
                    updateSystemInfo(data.data);
                    break;
            }
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        } catch (err) {
            console.error('Ошибка обработки сообщения:', err);
        }
    };
}

function updateSystemInfo(info) {
    const lines = info.split('\n');
    
    // Обновленный парсинг CPU
    const cpuLine = lines.find(line => line.includes('all') || line.includes('Cpu(s)'));
    if (cpuLine) {
        let cpuUsage;
        if (cpuLine.includes('all')) {
            // Парсинг вывода mpstat
            const parts = cpuLine.split(/\s+/);
            cpuUsage = 100 - parseFloat(parts[parts.length - 1]);
        } else {
            // Парсинг вывода top
            const idle = parseFloat(cpuLine.match(/(\d+\.\d+)\s*id/)[1]);
            cpuUsage = 100 - idle;
        }
        document.getElementById('cpuUsage').textContent = `${cpuUsage.toFixed(1)}%`;
    }
    
    // Обработка RAM
    const memLine = lines.find(line => line.includes('Mem:'));
    if (memLine) {
        const memParts = memLine.split(/\s+/);
        const total = parseInt(memParts[1]);
        const used = parseInt(memParts[2]);
        const usagePercent = ((used / total) * 100).toFixed(1);
        document.getElementById('ramUsage').textContent = `${usagePercent}%`;
    }
    
    // Обработка Disk
    const diskLine = lines.find(line => line.includes('/dev/'));
    if (diskLine) {
        const diskParts = diskLine.split(/\s+/);
        document.getElementById('diskUsage').textContent = diskParts[4];
    }
}

// Добавим функцию для экранирования HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Обновляем функцию executeCommand
function executeCommand() {
    const command = document.getElementById('consoleInput').value.trim();
    if (!command) {
        alert('Пожалуйста, введите команду');
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        document.getElementById('consoleOutput').textContent = '';
        ws.send(JSON.stringify({
            type: 'command',
            command: command,
            sessionId: terminalSessionId
        }));
    } else {
        alert('Ошибка подключения к терминалу');
    }
}

function clearTerminal() {
    document.getElementById('consoleOutput').innerHTML = '';
}

function toggleFullscreen() {
    const terminal = document.querySelector('.terminal-container');
    if (!document.fullscreenElement) {
        terminal.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Добавим автодополнение по Tab
document.getElementById('consoleInput').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        // Здесь можно добавить логику автодополнения
    }
});

function handleHotkeys(e) {
    // Ctrl + L - очистка терминала
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        clearTerminal();
    }
    
    // Ctrl + K - очистка текущей строки
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('consoleInput').value = '';
    }
    
    // Alt + C - копировать выделенный текст
    if (e.altKey && e.key === 'c') {
        e.preventDefault();
        const selection = window.getSelection().toString();
        if (selection) {
            navigator.clipboard.writeText(selection);
        }
    }
}

document.addEventListener('keydown', handleHotkeys);

function showExecutingIndicator(show) {
    const button = document.querySelector('.terminal-input-container button');
    if (show) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Выполняется...';
    } else {
        button.disabled = false;
        button.innerHTML = 'Выполнить';
    }
}

// Добавляем стили для спиннера
const style = document.createElement('style');
style.textContent = `
    .spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to {transform: rotate(360deg);}
    }
`;
document.head.appendChild(style);

function initializeContextMenu() {
    const terminal = document.querySelector('.terminal-container');
    
    terminal.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        const menu = document.createElement('div');
        menu.className = 'terminal-context-menu';
        menu.innerHTML = `
            <div class="menu-item" onclick="copySelected()">Копировать</div>
            <div class="menu-item" onclick="pasteFromClipboard()">Вставить</div>
            <div class="menu-item" onclick="clearTerminal()">Очистить терминал</div>
        `;
        
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        
        document.body.appendChild(menu);
        
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 0);
    });
}

async function loadFileList(path = '/var/www/html') {
    try {
        const response = await fetch(`${API_URL}/api/files?path=${encodeURIComponent(path)}`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await handleResponse(response);
        
        if (data.success) {
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            
            // Добавляем кнопку "Назад" если мы не в корневой директории
            if (path !== '/var/www/html') {
                const backItem = createFileItem({
                    name: '..',
                    type: 'directory',
                    isBack: true
                }, path);
                fileList.appendChild(backItem);
            }
            
            data.files.forEach(file => {
                const fileItem = createFileItem(file, path);
                fileList.appendChild(fileItem);
            });
            
            document.querySelector('.current-path').textContent = path;
        }
    } catch (err) {
        console.error('Ошибка при загрузке файлов:', err);
        alert('Ошибка при загрузке файлов');
    }
}

function createFileItem(file, currentPath) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const icon = document.createElement('i');
    icon.className = `file-icon fas ${file.type === 'directory' ? 'fa-folder' : 'fa-file'}`;
    
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    
    item.appendChild(icon);
    item.appendChild(name);
    
    if (!file.isBack) {
        const actions = document.createElement('div');
        actions.className = 'file-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFile(`${currentPath}/${file.name}`);
        };
        
        const renameBtn = document.createElement('button');
        renameBtn.className = 'rename-btn';
        renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            renameFile(`${currentPath}/${file.name}`);
        };
        
        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
    }
    
    item.onclick = () => {
        if (file.type === 'directory') {
            const newPath = file.isBack 
                ? currentPath.split('/').slice(0, -1).join('/') 
                : `${currentPath}/${file.name}`;
            loadFileList(newPath);
        }
    };
    
    return item;
}

async function uploadFile() {
    const input = document.getElementById('fileUpload');
    input.click();
    
    input.onchange = async () => {
        const files = input.files;
        const currentPath = document.querySelector('.current-path').textContent;
        
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', currentPath);
            
            try {
                const response = await fetch(`${API_URL}/api/files/upload`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: formData
                });
                
                const data = await handleResponse(response);
                if (data.success) {
                    loadFileList(currentPath);
                }
            } catch (err) {
                console.error('Ошибка при загрузке файла:', err);
                alert(`Ошибка при загрузке файла ${file.name}`);
            }
        }
        
        input.value = '';
    };
}

async function createFolder() {
    const folderName = prompt('Введите имя новой папки:');
    if (!folderName) return;
    
    const currentPath = document.querySelector('.current-path').textContent;
    
    try {
        const response = await fetch(`${API_URL}/api/files/folder`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
                path: currentPath,
                folderName
            })
        });
        
        const data = await handleResponse(response);
        if (data.success) {
            loadFileList(currentPath);
        }
    } catch (err) {
        console.error('Ошибка при создании папки:', err);
        alert('Ошибка при создании папки');
    }
}

async function deleteFile(path) {
    if (!confirm('Вы уверены, что хотите удалить этот файл/папку?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/files`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ path })
        });
        
        const data = await handleResponse(response);
        if (data.success) {
            loadFileList(path.split('/').slice(0, -1).join('/'));
        }
    } catch (err) {
        console.error('Ошибка при удалении:', err);
        alert('Ошибка при удалении файла/папки');
    }
}

async function renameFile(path) {
    const newName = prompt('Введите новое имя:');
    if (!newName) return;
    
    try {
        const response = await fetch(`${API_URL}/api/files/rename`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
                oldPath: path,
                newName
            })
        });
        
        const data = await handleResponse(response);
        if (data.success) {
            loadFileList(path.split('/').slice(0, -1).join('/'));
        }
    } catch (err) {
        console.error('Ошибка при переименовании:', err);
        alert('Ошибка при переименовании файла/папки');
    }
}

