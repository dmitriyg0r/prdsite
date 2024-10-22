document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Здесь должен быть запрос к серверу для проверки учетных данных
    // Пример использования fetch:
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Перенаправление на главную страницу или панель управления
            window.location.href = '/dashboard';
        } else {
            document.getElementById('error-message').textContent = 'Неверное имя пользователя или пароль';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('error-message').textContent = 'Произошла ошибка при входе';
    });
});
