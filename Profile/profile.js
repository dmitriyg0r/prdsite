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

async function handleAnonymousLogin() {
    try {
        const response = await fetch('/api/auth/anonymous-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data));
            showProfile(data);
        } else {
            const error = await response.json();
            showError(error.message || 'Ошибка входа');
        }
    } catch (error) {
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

function showProfile(userData) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';
    
    // Обновляем информацию профиля
    document.getElementById('profile-username').textContent = userData.username || 'Анонимный пользователь';
    document.getElementById('profile-role').textContent = userData.role || 'Гость';
    document.getElementById('profile-email').textContent = userData.email || 'Не указан';
    document.getElementById('last-login').textContent = 'Последний вход: ' + new Date().toLocaleString();
}

function handleLogout() {
    localStorage.removeItem('user');
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data));
            showProfile(data);
        } else {
            const error = await response.json();
            showError(error.message || 'Ошибка входа');
        }
    } catch (error) {
        showError('Ошибка сервера. Попробуйте позже.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (userData) {
        showProfile(JSON.parse(userData));
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
    }
});
