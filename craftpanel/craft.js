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
        const response = await fetch(`${API_URL}/api/White_List`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const userExists = result.data.some(entry => 
                entry.user.toLowerCase() === username.toLowerCase()
            );
            
            if (userExists) {
                // Сохраняем имя пользователя
                localStorage.setItem('craftUser', username);
                
                // Скрываем форму входа
                document.getElementById('login-section').style.display = 'none';
                
                // Показываем панель с iframe и устанавливаем URL
                const donatePanel = document.getElementById('donate-panel');
                const donateFrame = document.getElementById('donate-frame');
                donateFrame.src = 'http://188.127.241.209:25991/';
                donatePanel.style.display = 'block';
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

// Проверяем авторизацию при загрузке страницы
window.addEventListener('load', () => {
    const craftUser = localStorage.getItem('craftUser');
    if (craftUser) {
        document.getElementById('login-section').style.display = 'none';
        const donatePanel = document.getElementById('donate-panel');
        const donateFrame = document.getElementById('donate-frame');
        donateFrame.src = 'http://188.127.241.209:25991/';
        donatePanel.style.display = 'block';
    }
});
