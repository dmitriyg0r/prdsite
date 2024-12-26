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

        // Добавляем проверку длины имени пользователя
        if (username.length > 20) {
            showErrorMessage('Имя пользователя не должно превышать 20 символов');
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
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;

        // Добавляем проверку длины имени пользователя
        if (username.length > 20) {
            showErrorMessage('Имя пользователя не должно превышать 20 символов');
            return;
        }

        // Проверка совпадения паролей
        if (password !== passwordConfirm) {
            showErrorMessage('Пароли не совпадают');
            return;
        }

        // Валидация email
        if (!isValidEmail(email)) {
            showErrorMessage('Введите корректный email адрес');
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
            body: JSON.stringify({ username, email, password })
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

// Обработчики для восстановления пароля
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    const modal = document.getElementById('password-recovery-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Закрытие модального окна
document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        resetRecoveryForm();
    });
});

// Проверка имени пользователя
document.getElementById('check-username-btn').addEventListener('click', async () => {
    const username = document.getElementById('recovery-username').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/api/users/check-username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok && data.email) {
            document.getElementById('step-username').style.display = 'none';
            document.getElementById('step-email').style.display = 'block';
            document.getElementById('confirm-email').textContent = maskEmail(data.email);
            sessionStorage.setItem('recovery_email', data.email);
            sessionStorage.setItem('recovery_user_id', data.userId);
        } else {
            showErrorMessage('Пользователь не найден или email не указан');
        }
    } catch (err) {
        console.error('Error checking username:', err);
        showErrorMessage('Ошибка при проверке имени пользователя');
    }
});

// Отправка кода подтверждения
document.getElementById('send-code-btn').addEventListener('click', async () => {
    const userId = sessionStorage.getItem('recovery_user_id');
    const email = sessionStorage.getItem('recovery_email');

    try {
        const response = await fetch(`${API_URL}/api/send-verification-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, email })
        });

        if (response.ok) {
            document.getElementById('step-email').style.display = 'none';
            document.getElementById('step-verification').style.display = 'block';
            startResendTimer();
        } else {
            throw new Error('Ошибка при отправке кода');
        }
    } catch (err) {
        showErrorMessage(err.message);
    }
});

// Сброс пароля
document.getElementById('reset-password-btn').addEventListener('click', async () => {
    const code = document.getElementById('verification-code').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const userId = sessionStorage.getItem('recovery_user_id');

    if (newPassword !== confirmPassword) {
        showErrorMessage('Пароли не совпадают');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, code, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccessMessage('Пароль успешно изменен');
            setTimeout(() => {
                const modal = document.getElementById('password-recovery-modal');
                modal.classList.remove('active');
                document.body.style.overflow = '';
                resetRecoveryForm();
            }, 1500);
        } else {
            throw new Error(data.error || 'Ошибка при смене пароля');
        }
    } catch (err) {
        showErrorMessage(err.message);
    }
});

// Вспомогательные функции
function maskEmail(email) {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
}

function startResendTimer() {
    let timeLeft = 60;
    const resendBtn = document.getElementById('resend-code');
    const timerElement = document.getElementById('resend-timer');
    resendBtn.disabled = true;

    const timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `(${timeLeft}с)`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            timerElement.textContent = '';
            resendBtn.disabled = false;
        }
    }, 1000);
}

function resetRecoveryForm() {
    document.getElementById('recovery-username').value = '';
    document.getElementById('verification-code').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    document.getElementById('step-username').style.display = 'block';
    document.getElementById('step-email').style.display = 'none';
    document.getElementById('step-verification').style.display = 'none';
    
    sessionStorage.removeItem('recovery_email');
    sessionStorage.removeItem('recovery_user_id');
}

// Добавляем проверку доступности email при вводе
let emailCheckTimeout;
const regEmailInput = document.getElementById('reg-email');
const emailValidationMessage = document.querySelector('.email-validation-message');

regEmailInput.addEventListener('input', () => {
    clearTimeout(emailCheckTimeout);
    const email = regEmailInput.value.trim();
    
    if (email && isValidEmail(email)) {
        emailCheckTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`${API_URL}/api/users/check-email?email=${encodeURIComponent(email)}`);
                const data = await response.json();

                if (response.ok) {
                    if (data.available) {
                        regEmailInput.classList.remove('invalid');
                        regEmailInput.classList.add('valid');
                        emailValidationMessage.textContent = '';
                    } else {
                        regEmailInput.classList.remove('valid');
                        regEmailInput.classList.add('invalid');
                        emailValidationMessage.textContent = 'Этот email уже используется';
                    }
                }
            } catch (err) {
                console.error('Check email error:', err);
            }
        }, 500);
    } else if (email) {
        regEmailInput.classList.remove('valid');
        regEmailInput.classList.add('invalid');
        emailValidationMessage.textContent = 'Введите корректный email адрес';
    } else {
        regEmailInput.classList.remove('valid', 'invalid');
        emailValidationMessage.textContent = '';
    }
});

// Функция валидации email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
} 