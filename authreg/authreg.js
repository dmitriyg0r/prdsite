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

// Обновляем константу API_URL для поддержки прокси
const API_URL = (() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Проверяем, находимся ли мы в корпоративной сети
    const isCorpNetwork = hostname.includes('.corp.local') || 
                         hostname.includes('.internal');
    
    // Если мы в корпоративной сети, используем прямой IP или доменное имя сервера
    if (isCorpNetwork) {
        return 'https://adminflow.ru'; // или IP-адрес сервера
    }
    
    return protocol + '//' + hostname;
})();

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
        const buttonText = button.querySelector('.button-text');
        const loader = button.querySelector('.loader');
        
        button.disabled = true;
        buttonText.style.display = 'none';
        loader.style.display = 'inline-block';

        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        // Восстанавливаем кнопку
        button.disabled = false;
        buttonText.style.display = 'inline-block';
        loader.style.display = 'none';

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка авторизации');
        }

        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            showSuccessMessage('Успешная авторизация');
            setTimeout(() => {
                window.location.href = '/profile/profile.html';
            }, 1000);
        } else {
            throw new Error('Некорректный ответ сервера: отсутствуют данные пользователя');
        }

    } catch (err) {
        console.error('Ошибка входа:', err);
        showErrorMessage(err.message || 'Ошибка подключения к серверу');
        
        // Восстанавливаем кнопку в случае ошибки
        const button = e.target.querySelector('button');
        const buttonText = button.querySelector('.button-text');
        const loader = button.querySelector('.loader');
        
        button.disabled = false;
        buttonText.style.display = 'inline-block';
        loader.style.display = 'none';
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

// Обновляем функцию проверки соединения
async function testConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

        const response = await fetch(`${API_URL}/api/test`, {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            credentials: 'include'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Server connection test:', data);
        return true;
    } catch (err) {
        console.error('Server connection error:', {
            message: err.message,
            type: err.name,
            api_url: API_URL
        });
        
        if (err.name === 'AbortError') {
            showErrorMessage('Превышено время ожидания ответа от сервера');
        } else {
            showErrorMessage(`Ошибка подключения к серверу: ${err.message}`);
        }
        return false;
    }
}

// Обновляем обработчик загрузки страницы
window.addEventListener('load', async () => {
    // Показываем индикатор загрузки
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'loading-message';
    loadingMessage.textContent = 'Проверка подключения...';
    document.body.appendChild(loadingMessage);

    const isConnected = await testConnection();
    
    // Удаляем индикатор загрузки
    loadingMessage.remove();

    if (!isConnected) {
        // Показываем кнопку для повторной попытки
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Повторить подключение';
        retryButton.className = 'retry-button';
        retryButton.onclick = async () => {
            retryButton.disabled = true;
            retryButton.textContent = 'Подключение...';
            await testConnection();
            retryButton.disabled = false;
            retryButton.textContent = 'Повторить подключение';
        };
        document.querySelector('.auth-box').appendChild(retryButton);
    }
});

// Добавляем функцию для проверки валидности JSON
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
} 