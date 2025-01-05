document.addEventListener('DOMContentLoaded', function() {
    const serverIP = '188.127.241.209';
    const serverPort = '25971';
    const statusElement = document.getElementById('server-status');
    const playersOnlineElement = document.getElementById('players-online');
    const playersMaxElement = document.getElementById('players-max');
    
    async function checkServerStatus() {
        try {
            const response = await fetch(`https://api.mcsrvstat.us/2/${serverIP}:${serverPort}`);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            updateServerStatus({
                online: data.online || false,
                players: {
                    online: data.players?.online || 0,
                    max: data.players?.max || 0
                }
            });
        } catch (error) {
            console.warn('Ошибка при проверке статуса сервера:', error);
            updateServerStatus({ online: false });
        }
    }

    function updateServerStatus(data) {
        statusElement.classList.add('loaded');
        if (data.online) {
            statusElement.textContent = 'Онлайн';
            statusElement.style.color = '#4CAF50';
            playersOnlineElement.textContent = data.players?.online || '?';
            playersMaxElement.textContent = data.players?.max || '?';
        } else {
            statusElement.textContent = 'Оффлайн';
            statusElement.style.color = '#f44336';
            playersOnlineElement.textContent = '0';
            playersMaxElement.textContent = '0';
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

document.getElementById('payment-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const minecraftLogin = document.getElementById('minecraft-login').value;
    
    try {
        // Здесь должна быть интеграция с вашей платёжной системой
        // После успешной оплаты:
        const response = await fetch('process_payment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                minecraft_login: minecraftLogin,
                payment_status: 'completed'
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Оплата прошла успешно! Доступ к серверу открыт.');
        } else {
            throw new Error(result.error || 'Произошла ошибка при обработке платежа');
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});
