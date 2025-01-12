document.addEventListener('DOMContentLoaded', function() {
    const serverIP = '188.127.241.209';
    const serverPort = 25971;
    const statusElement = document.getElementById('server-status');
    const playersOnlineElement = document.getElementById('players-online');
    const playersMaxElement = document.getElementById('players-max');
    
    // Функция копирования IP адреса
    function setupCopyButtons() {
        const copyButton1 = document.getElementById('copy-button-1');
        const copyButton2 = document.getElementById('copy-button-2');
        
        if (copyButton1) {
            copyButton1.addEventListener('click', () => {
                const ip = document.getElementById('server-ip-1').value;
                navigator.clipboard.writeText(ip);
                copyButton1.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyButton1.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            });
        }

        if (copyButton2) {
            copyButton2.addEventListener('click', () => {
                const ip = document.getElementById('server-ip-2').value;
                navigator.clipboard.writeText(ip);
                copyButton2.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyButton2.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            });
        }
    }

    async function checkServerStatus() {
        try {
            console.log('🔄 Начинаем проверку статуса сервера...');
            
            statusElement.innerHTML = `
                <span class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></span>
                Проверка...
            `;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            // Используем локальный прокси
            const response = await fetch('proxy.php', {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('📋 Данные сервера:', data);

            if (data.online) {
                console.log('✅ Сервер онлайн');
                statusElement.innerHTML = 'Онлайн';
                statusElement.style.color = '#4CAF50';
                playersOnlineElement.textContent = data.players?.online || '0';
                playersMaxElement.textContent = data.players?.max || '0';
            } else {
                console.log('❌ Сервер оффлайн');
                statusElement.innerHTML = 'Оффлайн';
                statusElement.style.color = '#f44336';
                playersOnlineElement.textContent = '0';
                playersMaxElement.textContent = '0';
            }
        } catch (error) {
            console.error('🚫 Ошибка при проверке статуса сервера:', error);
            
            statusElement.innerHTML = error.name === 'AbortError' 
                ? 'Таймаут подключения' 
                : 'Ошибка проверки';
            
            statusElement.style.color = '#f44336';
            playersOnlineElement.textContent = '0';
            playersMaxElement.textContent = '0';
        }
    }

    // Инициализация
    console.log('🚀 Инициализация скрипта...');
    setupCopyButtons();
    checkServerStatus();
    // Обновляем статус каждые 60 секунд
    setInterval(checkServerStatus, 60000);

    document.querySelectorAll('.accordion-header').forEach(button => {
        button.addEventListener('click', () => {
            const accordionItem = button.parentElement;
            accordionItem.classList.toggle('active');
        });
    });
});

function showLoadingIndicator() {
    const button = document.querySelector('.payment-btn');
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
    button.disabled = true;
}

function hideLoadingIndicator() {
    const button = document.querySelector('.payment-btn');
    button.innerHTML = 'Оплатить доступ';
    button.disabled = false;
}

document.getElementById('payment-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    showLoadingIndicator();
    
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
    } finally {
        hideLoadingIndicator();
    }
});
