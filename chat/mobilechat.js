document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        initMobileChat();
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            initMobileChat();
        }
    });
});

function initMobileChat() {
    // Проверяем существование всех необходимых элементов
    const elements = {
        chatList: document.querySelector('.chat-list'),
        chatArea: document.querySelector('.chat-area'),
        backButton: document.getElementById('backToChats'),
        chatPlaceholder: document.getElementById('chat-placeholder'),
        messagesArea: document.getElementById('messages'),
        chatHeader: document.querySelector('.chat-header')
    };

    // Проверяем наличие основных элементов
    if (!elements.chatList || !elements.chatArea) {
        console.error('Необходимые элементы чата не найдены');
        return;
    }

    // Начальное состояние
    elements.chatArea.style.display = 'none';
    elements.chatList.style.display = 'flex';

    // Обработчик для кнопки "Назад"
    if (elements.backButton) {
        elements.backButton.addEventListener('click', () => {
            // Показываем мобильное меню при возврате к списку чатов
            const mobileNav = document.querySelector('.mobile-nav');
            if (mobileNav) {
                mobileNav.style.cssText = 'display: block !important;';
            }

            elements.chatArea.style.display = 'none';
            elements.chatArea.style.animation = '';
            elements.chatList.style.display = 'flex';
            elements.chatList.style.animation = 'slideInFromLeft 0.3s ease-out';
        });
    }

    // Делегирование события клика на список чатов
    elements.chatList.addEventListener('click', async (e) => {
        const chatItem = e.target.closest('.chat-item, .chat-partner, .friend-item');
        if (!chatItem) return;

        e.preventDefault();
        e.stopPropagation();

        // Получаем userId из data-атрибута
        const userId = chatItem.dataset.friendId || chatItem.dataset.userId || chatItem.getAttribute('href')?.split('=')[1];
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
            if (elements.chatHeader) {
                elements.chatHeader.style.display = 'flex';
                const headerElements = {
                    name: document.getElementById('chat-header-name'),
                    avatar: document.getElementById('chat-header-avatar'),
                    status: document.getElementById('chat-header-status')
                };

                if (headerElements.name) headerElements.name.textContent = currentChatPartner.username;
                if (headerElements.avatar) {
                    headerElements.avatar.src = currentChatPartner.avatar_url || '../uploads/avatars/default.png';
                    headerElements.avatar.alt = currentChatPartner.username;
                }
                if (headerElements.status) {
                    headerElements.status.textContent = currentChatPartner.is_online ? 
                        'онлайн' : getLastActivityTime(currentChatPartner.last_activity);
                }
            }

            // Загружаем историю сообщений и запускаем обновления
            await loadChatHistory();
            startMessageUpdates();

            // Скрываем мобильное меню
            const mobileNav = document.querySelector('.mobile-nav');
            if (mobileNav) {
                mobileNav.style.cssText = 'display: none !important;';
            }

            // Переключаем отображение
            elements.chatList.style.display = 'none';
            elements.chatList.style.animation = '';
            elements.chatArea.style.display = 'flex';
            elements.chatArea.style.animation = 'slideInFromRight 0.3s ease-out';

            if (elements.chatPlaceholder) elements.chatPlaceholder.style.display = 'none';
            if (elements.messagesArea) elements.messagesArea.style.display = 'flex';

            // Прокручиваем к последнему сообщению
            scrollToBottom();

            // Помечаем сообщения как прочитанные
            await markMessagesAsRead(userId);

        } catch (error) {
            console.error('Ошибка при открытии чата:', error);
            alert('Не удалось загрузить чат');
        }
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
            height: 100vh !important;
            overflow: hidden;
        }

        .chat-list, .chat-area {
            width: 100% !important;
            height: 100vh !important;
            position: relative;
        }

        .chat-area {
            display: flex;
            flex-direction: column;
        }

        .messages-area {
            flex: 1;
            height: calc(100vh - 140px) !important;
            padding-bottom: 90px !important;
            overflow-y: auto;
            margin-bottom: 60px;
        }

        .input-area {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--surface-color);
            padding: 10px;
            border-top: 1px solid var(--border-light);
            z-index: 1001;
            margin-bottom: 60px;
        }

        .input-controls {
            display: flex;
            gap: 8px;
            align-items: center;
            padding: 0 5px;
        }

        #messageInput {
            flex: 1;
            min-width: 0;
        }

        .chat-header {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: var(--surface-color);
            border-bottom: 1px solid var(--border-light);
        }

        #filePreview, #replyPreview {
            margin-bottom: 8px;
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