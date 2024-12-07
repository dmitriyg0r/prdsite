let currentPage = 1;
let totalPages = 1;

async function loadStats() {
    try {
        const response = await fetch('https://adminflow.ru/api/admin/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalUsers').textContent = data.stats.total_users;
            document.getElementById('newUsers').textContent = data.stats.new_users_24h;
            document.getElementById('totalMessages').textContent = data.stats.total_messages;
            document.getElementById('newMessages').textContent = data.stats.new_messages_24h;
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadUsers(page = 1, search = '') {
    try {
        const response = await fetch(`https://adminflow.ru/api/admin/users?page=${page}&search=${search}`);
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
        }
    } catch (err) {
        console.error('Error loading users:', err);
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
            const response = await fetch(`https://adminflow.ru/api/admin/users/${id}`, {
                method: 'DELETE'
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadUsers();

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
