const togglePassword = () => {
    const passwordInput = document.querySelector('.password-input');
    const eyeIcon = document.querySelector('.eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.add('show');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('show');
    }
}

const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
};

// Добавляем функцию showProfile
function showProfile(userData) {
    console.log('Showing profile for:', userData);

    const loginContainer = document.getElementById('login-container');
    const profileInfo = document.getElementById('profile-info');
    const adminSection = document.getElementById('admin-section');
    const profileUsername = document.getElementById('profile-username');
    const profileRole = document.getElementById('profile-role');

    if (!loginContainer || !profileInfo) {
        console.error('Required containers not found');
        return;
    }

    try {
        // Скрываем форму входа и показываем информацию профиля
        loginContainer.style.display = 'none';
        profileInfo.style.display = 'block';

        // Обновляем информацию профиля
        if (profileUsername) profileUsername.textContent = userData.data.username || 'Гость';
        if (profileRole) profileRole.textContent = userData.data.role || 'Пользователь';

        // Показываем админ-панель если пользователь админ
        if (adminSection) {
            adminSection.style.display = userData.data.role === 'Admin' ? 'block' : 'none';
        }

        console.log('Profile displayed successfully');
    } catch (error) {
        console.error('Error displaying profile:', error);
        showError('Ошибка при отображении профиля');
    }
}

// Обновляем функцию handleAnonymousLogin
window.handleAnonymousLogin = async function() {
    try {
        const response = await fetch('/api/auth/anonymous-login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Anonymous login response status:', response.status);
        console.log('Anonymous login response data:', data);

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data));
            showSuccess('Успешный анонимный вход');
            showProfile(data);
        } else {
            showError(data.message || 'Ошибка анонимного входа');
        }
    } catch (error) {
        console.error('Anonymous login error:', error);
        showError('Ошибка при попытке анонимного входа');
    }
}

// Обновляем функцию handleLogin
async function handleLogin(event) {
    event.preventDefault();
    console.log('Login attempt started');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('Login response status:', response.status);
        console.log('Login response data:', data);

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data));
            showSuccess('Успешный вход');
            showProfile(data);
        } else {
            showError(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

// Add event listeners when the document loads
document.addEventListener('DOMContentLoaded', () => {
    // Bind regular login form submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Bind anonymous login button
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
    }
}); 