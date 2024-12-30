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

        try {
            // Добавляем обработку ошибок загрузки
            const userId = chatItem.dataset.friendId || 
                          chatItem.dataset.userId || 
                          chatItem.getAttribute('href')?.split('=')[1];

            if (!userId) {
                console.error('UserId not found');
                return;
            }

            // Показываем индикатор загрузки
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            elements.chatArea.appendChild(loadingIndicator);

            try {
                const response = await fetch(`https://adminflow.ru/api/users/${userId}?currentUserId=${currentUser.id}`);
                if (!response.ok) throw new Error('Ошибка загрузки данных пользователя');
                const data = await response.json();

                // Очищаем предыдущие данные чата
                if (elements.messagesArea) {
                    elements.messagesArea.innerHTML = '';
                }

                // Обновляем UI и запускаем чат
                currentChatPartner = data.user;
                await loadChatHistory();
                startMessageUpdates();

                // Скрываем мобильное меню и показываем чат
                const mobileNav = document.querySelector('.mobile-nav');
                if (mobileNav) {
                    mobileNav.style.cssText = 'display: none !important;';
                }

                elements.chatList.style.display = 'none';
                elements.chatArea.style.display = 'flex';
                
                if (elements.chatPlaceholder) {
                    elements.chatPlaceholder.style.display = 'none';
                }
                if (elements.messagesArea) {
                    elements.messagesArea.style.display = 'flex';
                }

                scrollToBottom();
                await markMessagesAsRead(userId);

            } finally {
                // Удаляем индикатор загрузки
                const loadingIndicator = elements.chatArea.querySelector('.loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
            }

        } catch (error) {
            console.error('Ошибка при открытии чата:', error);
            alert('Не удалось загрузить чат. Попробуйте еще раз.');
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
            padding-bottom: 60px;
        }

        .messages-area {
            flex: 1;
            height: calc(100vh - 180px) !important;
            overflow-y: auto;
            padding-bottom: 20px;
        }

        .input-area {
            position: fixed;
            bottom: 60px;
            left: 0;
            right: 0;
            background: var(--surface-color);
            padding: 10px;
            border-top: 1px solid var(--border-light);
            z-index: 1001;
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