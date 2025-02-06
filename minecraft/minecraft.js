import TochkaPaymentChecker from './payment-checker.js';

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

    // Создаем модальное окно
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-card">
            <button class="modal-close">&times;</button>
            <h3 class="modal-title"></h3>
            <div class="modal-price"></div>
            <form class="minecraft-login-form">
                <input type="text" 
                       class="minecraft-login-input" 
                       placeholder="Ваш логин Minecraft"
                       required>
                <button type="submit" class="pay-button">Оплатить</button>
            </form>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const modal = {
        overlay: modalOverlay,
        card: modalOverlay.querySelector('.modal-card'),
        closeBtn: modalOverlay.querySelector('.modal-close'),
        title: modalOverlay.querySelector('.modal-title'),
        price: modalOverlay.querySelector('.modal-price'),
        form: modalOverlay.querySelector('.minecraft-login-form'),
        currentPrice: 0,
        currentTitle: ''
    };

    // Обработчики для карточек
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('click', function() {
            modal.currentTitle = this.querySelector('h4').textContent;
            modal.currentPrice = this.querySelector('.price').textContent;
            
            modal.title.textContent = modal.currentTitle;
            modal.price.textContent = modal.currentPrice;
            modal.overlay.classList.add('active');
        });
    });

    // Закрытие модального окна
    modal.closeBtn.addEventListener('click', () => {
        modal.overlay.classList.remove('active');
    });

    modal.overlay.addEventListener('click', (e) => {
        if (e.target === modal.overlay) {
            modal.overlay.classList.remove('active');
        }
    });

    // Обработка отправки формы
    modal.form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const login = this.querySelector('.minecraft-login-input').value;
        const price = parseInt(modal.currentPrice.replace('₽', ''));

        showLoadingIndicator();
        
        try {
            const paymentChecker = new TochkaPaymentChecker();
            const paymentResult = await paymentChecker.checkPayment(price, login);
            
            if (paymentResult.found) {
                // Добавляем пользователя в whitelist
                const response = await fetch('/api/add-to-whitelist', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        minecraftLogin: login,
                        paymentDetails: paymentResult.paymentDetails
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    window.location.href = '/minecraft/success.html';
                } else {
                    throw new Error('Не удалось добавить пользователя в whitelist');
                }
            } else {
                alert('Платеж не найден. Пожалуйста, убедитесь, что вы совершили оплату и правильно указали логин в описании платежа.');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при проверке платежа. Пожалуйста, попробуйте позже или свяжитесь с администрацией.');
        } finally {
            hideLoadingIndicator();
        }
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
