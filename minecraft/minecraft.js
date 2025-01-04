document.addEventListener('DOMContentLoaded', function() {
    const serverIP = '188.127.241.209';
    const serverPort = '25971';
    const statusElement = document.getElementById('server-status');
    const playersOnlineElement = document.getElementById('players-online');
    const playersMaxElement = document.getElementById('players-max');
    
    // Функция для проверки статуса сервера
    async function checkServerStatus() {
        try {
            // Пробуем сначала через прокси-сервис для обхода CORS
            const proxyUrl = `https://cors-anywhere.herokuapp.com/https://api.mcsrvstat.us/2/${serverIP}:${serverPort}`;
            const response = await fetch(proxyUrl, {
                headers: {
                    'Origin': window.location.origin
                }
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            updateServerStatus(data);
        } catch (error) {
            console.warn('Ошибка при проверке через API:', error);
            // Fallback: устанавливаем базовую проверку через WebSocket
            try {
                const ws = new WebSocket(`ws://${serverIP}:${serverPort}`);
                
                ws.onopen = () => {
                    updateServerStatus({ online: true, players: { online: '?', max: '?' }});
                    ws.close();
                };
                
                ws.onerror = () => {
                    updateServerStatus({ online: false });
                };
            } catch (wsError) {
                console.error('Ошибка при WebSocket проверке:', wsError);
                updateServerStatus({ online: false });
            }
        }
    }

    // Выносим обновление статуса в отдельную функцию
    function updateServerStatus(data) {
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
