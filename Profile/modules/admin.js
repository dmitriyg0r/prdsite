import { API_BASE_URL, showError, showSuccess } from './utils.js';

// Функция для отображения пользователей в таблице
function displayUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) {
        console.error('Table body element not found!');
        return;
    }
    
    try {
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-row">
                        <img src="${user.avatarUrl ? `${API_BASE_URL}${user.avatarUrl}` : '../assets/default-avatar.png'}" 
                             alt="Avatar" 
                             class="user-table-avatar">
                        <span>${user.username}</span>
                    </div>
                </td>
                <td>
                    ${user.role}
                    <button 
                        class="btn change-role-btn" 
                        onclick="changeRole('${user.username}', '${user.role === 'Admin' ? 'User' : 'Admin'}')"
                    >
                        Изменить роль
                    </button>
                </td>
                <td>${new Date(user.createdAt).toLocaleString()}</td>
                <td>
                    <button class="btn delete-btn" onclick="deleteUser('${user.username}')">
                        Удалить
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error displaying users:', error);
        showError('Ошибка при отображении пользователей');
    }
}

// Функция для загрузки списка пользователей
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayUsers(data.data);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Ошибка при загрузке пользователей');
    }
}

// Функция для изменения роли пользователя
async function changeRole(username, newRole) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/change-role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: JSON.stringify({ username, newRole })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Роль успешно изменена');
            await loadUsers();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error changing role:', error);
        showError('Ошибка при изменении роли');
    }
}

// Функция для удаления пользователя
async function deleteUser(username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/${username}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Пользователь успешно удален');
            await loadUsers();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Ошибка при удалении пользователя');
    }
}

// Функция для создания нового пользователя
async function createUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Пользователь успешно создан');
            await loadUsers();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Ошибка при создании пользователя');
    }
}

// Функция проверки роли пользователя
async function checkUserRole() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser?.data?.username) return;

        const response = await fetch(`${API_BASE_URL}/users/check-role`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${currentUser.data.username}`
            }
        });

        // Проверяем тип контента
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Получен неверный тип контента:', contentType);
            return;
        }

        const data = await response.json();

        if (data.success && data.data.role !== currentUser.data.role) {
            currentUser.data.role = data.data.role;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateInterfaceBasedOnRole(data.data.role);
        }
    } catch (error) {
        // Игнорируем ошибку 404, так как эндпоинт может быть временно недоступен
        if (error.message.includes('404')) {
            console.warn('Эндпоинт проверки роли недоступен');
            return;
        }
        console.error('Error checking user role:', error);
    }
}

// Функция обновления интерфейса на основе роли
function updateInterfaceBasedOnRole(role) {
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        adminSection.style.display = role === 'Admin' ? 'block' : 'none';
    }
}

// Единственный экспорт всех функций в конце файла
export {
    loadUsers,
    changeRole,
    deleteUser,
    createUser,
    checkUserRole,
    updateInterfaceBasedOnRole,
    displayUsers
};