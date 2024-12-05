import { API_BASE_URL, showError, showSuccess, apiRequest } from './utils.js';

const DEFAULT_AVATAR_PATH = `${API_BASE_URL}/uploads/default-avatar.png`;

export const handleLogin = async (event) => {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success) {
            localStorage.setItem('user', JSON.stringify(response.data));
            showSuccess('Вход выполнен успешно');
            await showProfile(response.data);
        }
    } catch (error) {
        showError('Ошибка входа');
    }
};

export const handleRegister = async (event) => {
    event.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success) {
            showSuccess('Регистрация успешна');
            showLoginForm();
        }
    } catch (error) {
        showError('Ошибка регистрации');
    }
};

export const handleAnonymousLogin = async () => {
    try {
        const response = await apiRequest('/auth/anonymous-login', {
            method: 'POST'
        });

        if (response.success) {
            localStorage.setItem('user', JSON.stringify(response.data));
            showSuccess('Анонимный вход выполнен');
            await showProfile(response.data);
        }
    } catch (error) {
        showError('Ошибка анонимного входа');
    }
};

export const showProfile = async (userData) => {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('profile-info').style.display = 'block';

    document.getElementById('profile-username').textContent = userData.username;
    document.getElementById('profile-role').textContent = userData.role;

    await loadUserAvatar(userData.username);
};

async function loadUserAvatar(username) {
    try {
        const response = await apiRequest(`/users/${username}/avatar`);
        
        if (response.success && response.data.avatarUrl) {
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                userAvatar.src = `${API_BASE_URL}${response.data.avatarUrl}`;
            }
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = DEFAULT_AVATAR_PATH;
        }
    }
}

export const initializeAvatarUpload = () => {
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);
            formData.append('username', JSON.parse(localStorage.getItem('user')).username);

            try {
                const response = await fetch(`${API_BASE_URL}/upload-avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).username}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showSuccess('Аватар успешно обновлен');
                    loadUserAvatar(JSON.parse(localStorage.getItem('user')).username);
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                console.error('Error uploading avatar:', error);
                showError('Ошибка при загрузке аватара');
            }
        });
    }
};

export const handleLogout = async () => {
    try {
        localStorage.removeItem('user');
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('profile-info').style.display = 'none';
        document.getElementById('admin-section').style.display = 'none';
        
        // Скрываем кнопку чата
        const chatLink = document.getElementById('chat-link');
        if (chatLink) {
            chatLink.style.display = 'none';
        }
        
        showSuccess('Вы успешно вышли из системы');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Ошибка при выходе из системы');
    }
};
