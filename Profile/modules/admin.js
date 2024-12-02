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
export async function loadUsers() {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${userData.data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayUsers(data.data);
        } else {
            throw new Error(data.message || 'Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Ошибка при загрузке списка пользователей');
    }
}

// Функция для изменения роли пользователя
export async function changeRole(username, newRole) {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${API_BASE_URL}/users/${username}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.data.username}`
            },
            body: JSON.stringify({ newRole })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Роль пользователя успешно обновлена');
            await loadUsers();
            await checkUserRole(); // Проверяем роль после изменения
        } else {
            throw new Error(data.message || 'Ошибка при обновлении роли');
        }
    } catch (error) {
        console.error('Error changing role:', error);
        showError('Ошибка при изменении роли пользователя');
    }
}

// Функция для удаления пользователя
export async function deleteUser(username) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
        return;
    }

    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${API_BASE_URL}/users/${username}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userData.data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Пользователь успешно удален');
            await loadUsers();
        } else {
            throw new Error(data.message || 'Ошибка при удалении пользователя');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Ошибка при удалении пользователя');
    }
}

// Функция для создания нового пользователя
export async function createUser(username, password, role) {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.data.username}`
            },
            body: JSON.stringify({
                username,
                password,
                role
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Пользователь успешно создан');
            await loadUsers();
        } else {
            throw new Error(data.message || 'Ошибка при создании пользователя');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Ошибка при создании пользователя');
    }
}

// Функция для проверки роли пользователя
export async function checkUserRole() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser?.data?.username) return;

        const response = await fetch(`${API_BASE_URL}/users/check-role`, {
            headers: {
                'Authorization': `Bearer ${currentUser.data.username}`
            }
        });

        const data = await response.json();

        if (data.success && data.data.role !== currentUser.data.role) {
            // Обновляем роль в localStorage
            currentUser.data.role = data.data.role;
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Обновляем отображение роли в профиле
            const profileRole = document.getElementById('profile-role');
            if (profileRole) {
                profileRole.textContent = data.data.role;
            }

            // Обновляем интерфейс в зависимости от роли
            updateInterfaceBasedOnRole(data.data.role);
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

// Функция обновления интерфейса на основе роли
export function updateInterfaceBasedOnRole(role) {
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        adminSection.style.display = role === 'Admin' ? 'block' : 'none';
    }
    
    // Здесь можно добавить другие элементы интерфейса, которые зависят от роли
}

// Экспортируем все функции для использования в других модулях
export {
    displayUsers,
    deleteUser,
    createUser
};