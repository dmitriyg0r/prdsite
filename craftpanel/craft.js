const API_URL = (() => {
    switch(window.location.hostname) {
        case 'localhost':
            return 'http://localhost:3000';
        case 'space-point.ru':
            return 'https://space-point.ru';
        default:
            return 'https://space-point.ru';
    }
})();

document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const errorMessage = document.getElementById('error-message');
    
    if (!username) {
        errorMessage.textContent = 'Пожалуйста, введите имя пользователя';
        errorMessage.style.display = 'block';
        return;
    }
    
    try {
        // Сначала проверяем, есть ли пользователь в White_List
        const response = await fetch(`${API_URL}/api/White_List`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Проверяем, есть ли пользователь в списке
            const userExists = result.data.some(entry => 
                entry.user.toLowerCase() === username.toLowerCase()
            );
            
            if (userExists) {
                // Сохраняем имя пользователя в localStorage для использования в панели
                localStorage.setItem('craftUser', username);
                // Перенаправляем на панель
                window.location.href = '/dashboard';
            } else {
                errorMessage.textContent = 'Пользователь не найден в White List';
                errorMessage.style.display = 'block';
            }
        } else {
            errorMessage.textContent = 'Ошибка при проверке пользователя';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        errorMessage.textContent = 'Ошибка сервера. Пожалуйста, попробуйте позже.';
        errorMessage.style.display = 'block';
    }
});
