document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Перенаправление на панель после успешного входа
            window.location.href = '/dashboard';
        } else {
            document.getElementById('error-message').textContent = result.error;
            document.getElementById('error-message').style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
    }
});
