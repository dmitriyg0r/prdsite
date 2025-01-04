document.addEventListener('DOMContentLoaded', function() {
    const serverIP = '188.127.241.209';
    const serverPort = '25971';
    const statusElement = document.getElementById('server-status');
    const playersOnlineElement = document.getElementById('players-online');
    const playersMaxElement = document.getElementById('players-max');
    
    // Функция для проверки статуса сервера
    async function checkServerStatus() {
        try {
            const response = await fetch(`https://api.mcsrvstat.us/2/${serverIP}:${serverPort}`);
            const data = await response.json();
            
            if (data.online) {
                statusElement.textContent = 'Онлайн';
                statusElement.style.color = '#4CAF50';
                playersOnlineElement.textContent = data.players?.online || 0;
                playersMaxElement.textContent = data.players?.max || 0;
            } else {
                statusElement.textContent = 'Оффлайн';
                statusElement.style.color = '#f44336';
                playersOnlineElement.textContent = '0';
                playersMaxElement.textContent = '0';
            }
        } catch (error) {
            statusElement.textContent = 'Ошибка проверки';
            statusElement.style.color = '#f44336';
            console.error('Ошибка при проверке статуса сервера:', error);
        }
    }

    // Копирование IP адреса
    const copyButton = document.getElementById('copy-button');
    const serverIpInput = document.getElementById('server-ip');

    copyButton.addEventListener('click', function() {
        serverIpInput.select();
        document.execCommand('copy');
        
        // Визуальная обратная связь
        copyButton.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    });

    // Проверяем статус сервера при загрузке страницы
    checkServerStatus();
    
    // Обновляем статус каждые 60 секунд
    setInterval(checkServerStatus, 60000);
});
