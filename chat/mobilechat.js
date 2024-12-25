document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, является ли устройство мобильным
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        initMobileChat();
    }

    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            initMobileChat();
        }
    });
});

function initMobileChat() {
    const chatList = document.querySelector('.chat-list');
    const chatArea = document.querySelector('.chat-area');
    const backButton = document.getElementById('backToChats');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    const messagesArea = document.getElementById('messages');

    // Начальное состояние
    if (chatArea) {
        chatArea.style.display = 'none';
    }
    if (chatList) {
        chatList.style.display = 'flex';
    }

    // Обработчик для кнопки "Назад"
    if (backButton) {
        backButton.addEventListener('click', () => {
            if (chatArea) {
                chatArea.style.display = 'none';
                chatArea.style.animation = '';
            }
            if (chatList) {
                chatList.style.display = 'flex';
                chatList.style.animation = 'slideInFromLeft 0.3s ease-out';
            }
        });
    }

    // Обработчик выбора чата
    document.querySelectorAll('.chat-partner').forEach(partner => {
        partner.addEventListener('click', () => {
            if (chatList) {
                chatList.style.display = 'none';
                chatList.style.animation = '';
            }
            if (chatArea) {
                chatArea.style.display = 'flex';
                chatArea.style.animation = 'slideInFromRight 0.3s ease-out';
            }
            if (chatPlaceholder) {
                chatPlaceholder.style.display = 'none';
            }
            if (messagesArea) {
                messagesArea.style.display = 'flex';
            }
        });
    });

    // Добавляем обработчик свайпов
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    // Обработка свайпов
    function handleSwipe() {
        const swipeThreshold = 100; // Минимальное расстояние для свайпа
        const diff = touchEndX - touchStartX;

        // Свайп вправо (возврат к списку чатов)
        if (diff > swipeThreshold && chatArea && chatArea.style.display === 'flex') {
            backButton.click();
        }
        // Свайп влево (скрыть список чатов)
        else if (diff < -swipeThreshold && chatList && chatList.style.display === 'flex') {
            // Если есть активный чат, показываем его
            if (currentChatPartner) {
                chatList.style.display = 'none';
                chatArea.style.display = 'flex';
                chatArea.style.animation = 'slideInFromRight 0.3s ease-out';
            }
        }
    }
}

// Добавляем стили анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFromRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }

    @keyframes slideInFromLeft {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
    }

    @media screen and (max-width: 768px) {
        .chat-container {
            margin-left: 0 !important;
        }

        .chat-list, .chat-area {
            width: 100% !important;
            height: calc(100vh - 60px) !important;
        }

        .messages-area {
            height: calc(100vh - 180px) !important;
        }

        .input-area {
            position: fixed;
            bottom: 60px;
            left: 0;
            right: 0;
            background: var(--surface-color);
            padding: 10px;
            border-top: 1px solid var(--border-light);
        }

        #messageInput {
            width: calc(100% - 80px) !important;
        }
    }
`;
document.head.appendChild(style);