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
            document.getElementById('totalUsers').textContent = data.stats.total_users;
            document.getElementById('newUsers').textContent = data.stats.new_users_24h;
            document.getElementById('totalMessages').textContent = data.stats.total_messages;
            document.getElementById('newMessages').textContent = data.stats.new_messages_24h;
        } else {
            alert(data.error || 'Ошибка загрузки статистики');
        }
    } catch (err) {
        console.error('Ошибка загрузки статистики:', err);
        alert('Ошибка загрузки статистики');
    }
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
                        <button onclick="deleteUser(${user.id})" class="action-btn delete">У��алить</button>
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
    const adminId = localStorage.getItem('adminId');
    if (adminId) {
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
