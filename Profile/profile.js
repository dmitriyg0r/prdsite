const API_BASE_URL = 'https://adminflow.ru/api';

// Вспомогательные функции
const showError = (message) => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Автоматически скрываем ошибку через 5 секунд
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
};

const showSuccess = (message) => {
    // Можно добавить красивое уведомление
    console.log('Success:', message);
};

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
};

// Функция для входа
async function handleLogin(event) {
    event.preventDefault();
    console.log('Login attempt started');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        console.log('Login response status:', response.status);
        const data = await response.json();
        console.log('Login response data:', data);

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            showSuccess('Успешный вход');
            showProfile(data.data);
        } else {
            showError(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Ошибка при попытке входа');
    }
}

// Функция для анонимного входа
async function handleAnonymousLogin() {
    console.log('Anonymous login attempt started');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/anonymous-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        console.log('Anonymous login response status:', response.status);
        const data = await response.json();
        console.log('Anonymous login response data:', data);

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            showSuccess('Успешный анонимный вход');
            showProfile(data.data);
        } else {
            showError(data.message || 'Ошибка анонимного входа');
        }
    } catch (error) {
        console.error('Anonymous login error:', error);
        showError('Ошибка при попытке анонимного входа');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');

    // Проверяем сохраненную сессию
    const userData = localStorage.getItem('user');
    if (userData) {
        console.log('Found saved session');
        try {
            showProfile(JSON.parse(userData));
        } catch (e) {
            console.error('Error parsing saved session:', e);
            localStorage.removeItem('user');
        }
    }

    // Привязываем обработчики событий
    const loginForm = document.getElementById('login-form');
    const anonymousLoginBtn = document.getElementById('anonymous-login-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form handler attached');
    }

    if (anonymousLoginBtn) {
        anonymousLoginBtn.addEventListener('click', handleAnonymousLogin);
        console.log('Anonymous login handler attached');
    }
});
