import { apiRequest, showError, showSuccess } from './utils.js';

export const loadUsers = async () => {
    try {
        const response = await apiRequest('/users');
        if (response.success) {
            const usersTableBody = document.getElementById('users-table-body');
            usersTableBody.innerHTML = '';
            response.data.forEach(user => {
                const userRow = document.createElement('tr');
                userRow.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn change-role-btn" onclick="changeRole('${user.username}')">Сменить роль</button>
                        <button class="btn delete-btn" onclick="deleteUser('${user.username}')">Удалить</button>
                    </td>
                `;
                usersTableBody.appendChild(userRow);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке пользователей');
    }
};

export const changeRole = async (username) => {
    try {
        const response = await apiRequest(`/users/${username}/change-role`, {
            method: 'POST'
        });
        if (response.success) {
            showSuccess('Роль пользователя изменена');
            loadUsers();
        }
    } catch (error) {
        showError('Ошибка при изменении роли пользователя');
    }
};

export const deleteUser = async (username) => {
    try {
        const response = await apiRequest(`/users/${username}`, {
            method: 'DELETE'
        });
        if (response.success) {
            showSuccess('Пользователь удалён');
            loadUsers();
        }
    } catch (error) {
        showError('Ошибка при удалении пользователя');
    }
};