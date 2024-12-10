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
const API_URL = window.location.protocol + '//' + window.location.hostname;

// Обработчик входа
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showErrorMessage('Пожалуйста, заполните все поля');
            return;
        }

        // Показываем индикатор загрузки
        const button = e.target.querySelector('button');
        const buttonText = button.querySelector('.button-text') || button;
        const loader = button.querySelector('.loader');
        
        if (loader) {
            buttonText.style.display = 'none';
            loader.style.display = 'inline-block';
        }
        button.disabled = true;

        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                username: username.trim(), 
                password: password.trim() 
            }),
            credentials: 'include',
            mode: 'cors'
        });

        // Восстанавливаем кнопку
        if (loader) {
            buttonText.style.display = 'inline-block';
            loader.style.display = 'none';
        }
        button.disabled = false;

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            showSuccessMessage('Успешная авторизация');
            setTimeout(() => {
                window.location.href = '/profile/profile.html';
            }, 1000);
        } else {
            throw new Error(data.error || 'Ошибка авторизации');
        }
    } catch (err) {
        console.error('Ошибка входа:', err);
        showErrorMessage(err.message || 'Ошибка подключения к серверу');
        
        // Восстанавливаем кнопку в случае ошибки
        const button = e.target.querySelector('button');
        button.disabled = false;
        const loader = button.querySelector('.loader');
        if (loader) {
            const buttonText = button.querySelector('.button-text') || button;
            buttonText.style.display = 'inline-block';
            loader.style.display = 'none';
        }
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

        // Скрываем индикатор загрузки
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

// Проверка соединения при загрузке страни��ы
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