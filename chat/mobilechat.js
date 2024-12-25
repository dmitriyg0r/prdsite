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
    const chatHeader = document.getElementById('chat-header');

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
    const chatItems = document.querySelectorAll('.chat-item, .chat-partner, .friend-item');
    chatItems.forEach(item => {
        ['click', 'touchend'].forEach(eventType => {
            item.addEventListener(eventType, async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Получаем userId из data-атрибута или из href
                const userId = item.dataset.userId || item.getAttribute('href')?.split('=')[1];
                
                if (!userId) {
                    console.error('UserId not found');
                    return;
                }

                try {
                    // Загружаем информацию о пользователе
                    const response = await fetch(`https://adminflow.ru/api/users/${userId}?currentUserId=${currentUser.id}`);
                    if (!response.ok) throw new Error('Ошибка загрузки данных пользователя');
                    const data = await response.json();
                    
                    // Обновляем currentChatPartner
                    currentChatPartner = data.user;

                    // Обновляем заголовок чата
                    if (chatHeader) {
                        chatHeader.style.display = 'flex';
                        const headerName = document.getElementById('chat-header-name');
                        const headerAvatar = document.getElementById('chat-header-avatar');
                        const headerStatus = document.getElementById('chat-header-status');
                        
                        if (headerName) headerName.textContent = currentChatPartner.username;
                        if (headerAvatar) {
                            headerAvatar.src = currentChatPartner.avatar_url || '../uploads/avatars/default.png';
                            headerAvatar.alt = currentChatPartner.username;
                        }
                        if (headerStatus) {
                            headerStatus.textContent = currentChatPartner.is_online ? 'онлайн' : 
                                getLastActivityTime(currentChatPartner.last_activity);
                        }
                    }

                    // Загружаем историю сообщений
                    await loadChatHistory();

                    // Переключаем отображение
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

                    // Прокручиваем к последнему сообщению
                    scrollToBottom();

                    // Помечаем сообщения как прочитанные
                    await markMessagesAsRead(userId);

                } catch (error) {
                    console.error('Ошибка при открытии чата:', error);
                    alert('Не удалось загрузить чат');
                }
            }, { passive: false });
        });

        // Добавляем стили для улучшения отзывчивости
        item.style.cursor = 'pointer';
        item.style.touchAction = 'manipulation';
    });
}

// Объединяем все стили в одном месте
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
            padding-bottom: 60px !important;
        }

        .input-area {
            position: fixed;
            bottom: 60px;
            left: 0;
            right: 0;
            background: var(--surface-color);
            padding: 10px;
            border-top: 1px solid var(--border-light);
            z-index: 1000;
        }

        #messageInput {
            width: calc(100% - 80px) !important;
        }

        .chat-header {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: var(--surface-color);
            border-bottom: 1px solid var(--border-light);
        }
    }

    .chat-partner {
        cursor: pointer;
        -webkit-tap-highlight-color: rgba(0,0,0,0);
        user-select: none;
        touch-action: manipulation;
    }

    @media (hover: none) {
        .chat-partner:active {
            background-color: rgba(0,0,0,0.1);
        }
    }
`;
document.head.appendChild(style);