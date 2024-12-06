document.addEventListener('DOMContentLoaded', () => {
    // Обработчики для переключения форм
    document.querySelectorAll('.toggle-form-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const loginContainer = document.getElementById('login-form-container');
            const registerContainer = document.getElementById('register-form-container');
            
            if (loginContainer.style.display === 'none') {
                loginContainer.style.display = 'block';
                registerContainer.style.display = 'none';
            } else {
                loginContainer.style.display = 'none';
                registerContainer.style.display = 'block';
            }
        });
    });
});

// Константа с базовым URL API
const API_URL = 'https://adminflow.ru:5003';

// Обработчик входа
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        console.log('Attempting login for:', username);

        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        console.log('Server response status:', response.status);

        const data = await response.json();
        console.log('Server response:', data);

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            showSuccessMessage('Успешная авторизация');
            setTimeout(() => {
                window.location.href = '/profile/profile.html';
            }, 1000);
        } else {
            showErrorMessage(data.error || 'Ошибка авторизации');
        }
    } catch (err) {
        console.error('Error during login:', err);
        showErrorMessage('Ошибка подключения к серверу');
    }
});

// Обработчик регистрации
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;

        // Проверка совпадения паролей
        if (password !== passwordConfirm) {
            showErrorMessage('Пароли не совпадают');
            return;
        }

        // Показываем индикатор загрузки
        const button = e.target.querySelector('button');
        const buttonText = button.querySelector('.button-text');
        const loader = button.querySelector('.loader');
        
        buttonText.style.display = 'none';
        loader.style.display = 'inline-block';

        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        // Скр��ваем индикатор загрузки
        buttonText.style.display = 'inline-block';
        loader.style.display = 'none';

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            showSuccessMessage('Регистрация успешна');
            setTimeout(() => {
                window.location.href = '/profile/profile.html';
            }, 1000);
        } else {
            showErrorMessage(data.error || 'Ошибка регистрации');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showErrorMessage('Ошибка подключения к серверу');
        
        // Скрываем индикатор загрузки в случае ошибки
        const button = e.target.querySelector('button');
        const buttonText = button.querySelector('.button-text');
        const loader = button.querySelector('.loader');
        
        buttonText.style.display = 'inline-block';
        loader.style.display = 'none';
    }
});

// Обработчики показа/скрытия пароля
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        }
    });
});

// Функции для отображения сообщений
function showErrorMessage(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function showSuccessMessage(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Проверка соединения при загрузке страницы
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_URL}/api/test`);
        const data = await response.json();
        console.log('Server connection test:', data);
    } catch (err) {
        console.error('Server connection error:', err);
        showErrorMessage('Ошибка подключения к серверу');
    }
}); 