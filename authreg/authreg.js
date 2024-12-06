const API_BASE_URL = 'https://adminflow.ru/api';

// Утилиты для показа сообщений
const showMessage = (message, type) => {
    const messageDiv = document.getElementById(`${type}-message`);
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
};

const showError = (message) => showMessage(message, 'error');
const showSuccess = (message) => showMessage(message, 'success');

// Переключение между формами
const toggleForms = () => {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    
    if (loginContainer.style.display === 'none') {
        loginContainer.style.display = 'block';
        registerContainer.style.display = 'none';
    } else {
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
    }
};

// Обработка входа
const handleLogin = async (event) => {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            showSuccess('Вход выполнен успешно');
            window.location.href = '../Profile/profile.html';
        } else {
            showError(data.error || 'Неверное имя пользователя или пароль');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Ошибка при подключении к серверу. Попробуйте позже.');
    }
};

// Обработка регистрации
const handleRegister = async (event) => {
    event.preventDefault();
    
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!username || !password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showSuccess('Регистрация успешна');
            toggleForms();
        } else {
            showError(data.error || 'Ошибка при регистрации');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError(error.message || 'Ошибка при подключении к серверу. Попробуйте позже.');
    }
};

// Переключение видимости пароля
const togglePasswordVisibility = (event) => {
    const passwordInput = event.target.previousElementSibling;
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    event.target.classList.toggle('fa-eye');
    event.target.classList.toggle('fa-eye-slash');
};

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', () => {
    // Обработчики форм
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Обработчики переключения видимости пароля
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', togglePasswordVisibility);
    });

    // Проверка авторизации и редирект на профиль
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (user && user.token) { // Проверяем наличие токена
                window.location.href = '../Profile/profile.html';
                return;
            }
        } catch (error) {
            // Если возникла ошибка при парсинге, очищаем localStorage
            localStorage.removeItem('user');
        }
    }
});
