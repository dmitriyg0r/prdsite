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

    // Обработчик выбора чата - теперь слушаем клики на родительском элементе
    const friendsList = document.querySelector('.friends-list');
    if (friendsList) {
        friendsList.addEventListener('click', async (e) => {
            // Находим ближайший родительский элемент с классом chat-partner
            const chatPartner = e.target.closest('.chat-partner');
            if (!chatPartner) return; // Если клик был не по чату, выходим

            e.preventDefault(); // Предотвращаем стандартное поведение
            
            const userId = chatPartner.dataset.userId;
            if (!userId) return;

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
        });
    }

    // Оставляем обработчик свайпов как дополнительную функцию
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 100;
        const diff = touchEndX - touchStartX;

        if (diff > swipeThreshold && chatArea && chatArea.style.display === 'flex') {
            backButton.click();
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
`;
document.head.appendChild(style);