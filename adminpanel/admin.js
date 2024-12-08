const API_URL = 'https://adminflow.ru:5003';

let currentPage = 1;
let totalPages = 1;

function getAdminId() {
    return localStorage.getItem('adminId');
}

async function loadUsers(page = 1, search = '', role = '', status = '') {
    try {
        const adminId = getAdminId();
        const response = await fetch(
            `${API_URL}/api/admin/users?adminId=${adminId}&page=${page}&search=${search}&role=${role}&status=${status}`,
            { credentials: 'include' }
        );
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
                    <td>
                        <div class="user-info">
                            <img src="${user.avatar_url || '/default-avatar.png'}" alt="" class="user-avatar">
                            ${user.username}
                        </div>
                    </td>
                    <td>${user.role}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${user.messages_sent}</td>
                    <td>${user.friends_count}</td>
                    <td>
                        <button onclick="deleteUser(${user.id})" class="action-btn delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button onclick="banUser(${user.id})" class="action-btn ban">
                            <i class="fas ${user.is_banned ? 'fa-unlock' : 'fa-ban'}"></i>
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
        }
    } catch (err) {
        console.error('Error loading users:', err);
        showNotification('Ошибка при загрузке пользователей', 'error');
    }
}

function showNotification(message, type = 'info') {
    // Реализация уведомлений
}

// ... остальные существующие функции ...

function handleFilters() {
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    loadUsers(1, document.getElementById('searchUsers').value, roleFilter, statusFilter);
}

function exportData() {
    const adminId = getAdminId();
    window.location.href = `${API_URL}/api/admin/export/users?adminId=${adminId}`;
}

function logout() {
    localStorage.removeItem('adminId');
    document.getElementById('loginForm').style.display = 'block';
    document.querySelector('.admin-panel').style.display = 'none';
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const adminId = localStorage.getItem('adminId');
    if (adminId) {
        document.getElementById('loginForm').style.display = 'none';
        document.querySelector('.admin-panel').style.display = 'grid';
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

    document.getElementById('roleFilter').addEventListener('change', handleFilters);
    document.getElementById('statusFilter').addEventListener('change', handleFilters);
    
    document.querySelector('.export-btn').addEventListener('click', exportData);
});
