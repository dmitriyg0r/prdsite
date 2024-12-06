const API_BASE_URL = 'https://adminflow.ru';

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
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            showSuccess('Вход выполнен успешно');
            window.location.href = '../Profile/profile.html';
        } else {
            showError(data.error || 'Ошибка при входе');
        }
    } catch (error) {
        showError('Ошибка при подключении к серверу');
    }
};

// Обработка регистрации
const handleRegister = async (event) => {
    event.preventDefault();
    
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Регистрация успешна');
            toggleForms(); // Показываем форму входа
        } else {
            showError(data.error || 'Ошибка при регистрации');
        }
    } catch (error) {
        showError('Ошибка при подключении к серверу');
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

    // Обработчики переключения видимости паро��я
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', togglePasswordVisibility);
    });

    // Проверка авторизации
    const userData = localStorage.getItem('user');
    if (userData) {
        window.location.href = '../Profile/profile.html';
    }
});
