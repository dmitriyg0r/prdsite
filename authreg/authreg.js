// Константа с базовым URL API
const API_URL = 'https://adminflow.ru:5003';

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
            // Сохраняем данные пользователя
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Показываем сообщение об успехе
            showSuccessMessage('Успешная авторизация');
            
            // Перенаправляем на profile.html с правильным путём
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