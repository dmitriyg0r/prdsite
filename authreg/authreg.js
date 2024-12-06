document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('https://adminflow.ru:5003/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Сохраняем данные пользователя
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Показываем сообщение об успехе
            showSuccessMessage('Успешная авторизация');
            
            // Перенаправляем на profile.html
            setTimeout(() => {
                window.location.href = '/profile.html';
            }, 1000);
        } else {
            showErrorMessage(data.error);
        }
    } catch (err) {
        showErrorMessage('Ошибка подключения к серверу');
    }
});

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