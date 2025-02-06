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

            // Используем локальный JSON файл
            const response = await fetch('server-status.json', {
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
            // Сначала закрываем все accordion items
            document.querySelectorAll('.accordion-item').forEach(item => {
                if (item !== button.parentElement && item.classList.contains('active')) {
                    item.classList.remove('active');
                }
            });
            
            // Затем открываем/закрываем текущий accordion item
            const accordionItem = button.parentElement;
            accordionItem.classList.toggle('active');
        });
    });

    // Добавляем обработчики для карточек с тарифами
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('click', async function() {
            const price = this.querySelector('.price').textContent.replace('₽', '');
            const title = this.querySelector('h4').textContent;
            showLoadingIndicator();
            
            try {
                const response = await fetch('/api/create-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        minecraftLogin: document.getElementById('minecraft-login').value || '',
                        amount: parseInt(price),
                        description: `Тариф ${title}`
                    })
                });

                const result = await response.json();
                
                if (result.confirmationUrl) {
                    window.location.href = result.confirmationUrl;
                } else {
                    throw new Error('Не удалось получить ссылку на оплату');
                }
            } catch (error) {
                console.error('Ошибка при создании платежа:', error);
                alert('Пожалуйста, сначала введите ваш логин Minecraft в форме ниже');
            } finally {
                hideLoadingIndicator();
            }
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
        // Отправляем запрос на наш бэкенд
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                minecraftLogin: minecraftLogin,
                amount: 50
            })
        });

        const result = await response.json();
        
        if (result.confirmationUrl) {
            window.location.href = result.confirmationUrl;
        } else {
            throw new Error('Не удалось получить ссылку на оплату');
        }
    } catch (error) {
        console.error('Ошибка при создании платежа:', error);
        alert('Произошла ошибка при создании платежа. Пожалуйста, попробуйте позже.');
    } finally {
        hideLoadingIndicator();
    }
});
