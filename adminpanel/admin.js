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
        const response = await fetch(`${API_URL}/api/admin/stats?userId=${adminId}`, {
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
        console.error('Error loading stats:', err);
        alert('Ошибка загрузки статистики');
    }
}

async function loadUsers(page = 1, search = '') {
    try {
        const adminId = getAdminId();
        const response = await fetch(`${API_URL}/api/admin/users?userId=${adminId}&page=${page}&search=${search}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';
            
            data.users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${user.messages_sent}</td>
                    <td>${user.friends_count}</td>
                    <td>
                        <button onclick="deleteUser(${user.id})">Удалить</button>
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
        console.error('Error loading users:', err);
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
            const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                loadUsers(currentPage, document.getElementById('searchUsers').value);
                loadStats();
            }
        } catch (err) {
            console.error('Error deleting user:', err);
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
        console.error('Login error:', err);
        alert('Ошибка авторизации');
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const adminId = localStorage.getItem('adminId');
    if (adminId) {
        document.getElementById('loginForm').style.display = 'none';
        document.querySelector('.admin-panel').style.display = 'block';
        loadStats();
        loadUsers();
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
