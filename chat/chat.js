document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.data) {
        window.location.href = '../Profile/profile.html';
        return;
    }

    loadFriendsList();

    const chatHeader = document.getElementById('chat-header');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    
    if (chatHeader) {
        chatHeader.style.display = 'none';
    }
    if (chatPlaceholder) {
        chatPlaceholder.style.display = 'flex';
    }
});

// Функция для получения последних сообщений
async function getLastMessages() {
    try {
        const response = await fetch('/api/chat/last-messages', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.success ? data.data : {};
    } catch (error) {
        console.error('Error fetching last messages:', error);
        return {};
    }
}

// Функция для загрузки списка друзей с последними сообщениями
async function loadFriendsList() {
    try {
        const response = await fetch('/api/chat/friends', {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const lastMessages = await getLastMessages();

        if (data.success) {
            const friendsList = document.getElementById('friends-list');
            if (!friendsList) {
                console.error('Friends list element not found');
                return;
            }

            friendsList.innerHTML = data.data.map(friend => {
                const lastMessage = lastMessages[friend.username] || { message: 'Нет сообщений', timestamp: null };
                return createFriendElement(friend, lastMessage);
            }).join('');
        } else {
            console.error('Failed to load friends list:', data.message);
        }
    } catch (error) {
        console.error('Error loading friends list:', error);
        const friendsList = document.getElementById('friends-list');
        if (friendsList) {
            friendsList.innerHTML = '<div class="error-message">Не удалось загрузить список друзей</div>';
        }
    }
}

// Функция для создания элемента в списке друзей
function createFriendElement(friend, lastMessage) {
    const messageTime = lastMessage.timestamp ? new Date(lastMessage.timestamp).toLocaleTimeString() : '';
    const messageText = lastMessage.message.length > 30 
        ? lastMessage.message.substring(0, 30) + '...' 
        : lastMessage.message;

    return `
        <div class="chat-partner" data-username="${friend.username}" onclick="openChat('${friend.username}', '${friend.avatarUrl ? `/api/${friend.avatarUrl}` : '../assets/default-avatar.png'}')">
            <img src="${friend.avatarUrl ? `/api/${friend.avatarUrl}` : '../assets/default-avatar.png'}" alt="Avatar" class="friend-avatar">
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="last-message-container">
                    <span class="last-message">${messageText}</span>
                    ${messageTime ? `<span class="last-message-time">${messageTime}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Обновляем последнее сообщение в списке чатов
function updateLastMessage(username, message) {
    const chatPartner = document.querySelector(`.chat-partner[data-username="${username}"]`);
    if (chatPartner) {
        const lastMessageElement = chatPartner.querySelector('.last-message');
        const lastMessageTimeElement = chatPartner.querySelector('.last-message-time');
        
        if (lastMessageElement) {
            const messageText = message.length > 30 ? message.substring(0, 30) + '...' : message;
            lastMessageElement.textContent = messageText;
        }
        
        if (lastMessageTimeElement) {
            lastMessageTimeElement.textContent = new Date().toLocaleTimeString();
        }
    }
}

// Добавляем стили для последнего сообщения
const styles = `
.last-message-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
}

.last-message {
    color: var(--text-secondary);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.last-message-time {
    color: var(--text-secondary);
    font-size: 0.8rem;
    white-space: nowrap;
}

.error-message {
    padding: 20px;
    color: var(--text-color);
    text-align: center;
}
`;

// Добавляем стили на страницу
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Глобальная переменная для текущего собеседника
let currentChatPartner = null;

// Функция для открытия чата с пользователем
async function openChat(username, avatarUrl) {
    currentChatPartner = username;
    
    // Обновляем активный чат в списке
    const allChatPartners = document.querySelectorAll('.chat-partner');
    allChatPartners.forEach(partner => {
        partner.classList.remove('active');
    });

    // Находим и активируем текущий чат
    const currentPartner = Array.from(allChatPartners).find(partner => 
        partner.getAttribute('data-username') === username
    );
    if (currentPartner) {
        currentPartner.classList.add('active');
    }

    // Показываем заголовок чата и скрываем плейсхолдер
    const chatHeader = document.getElementById('chat-header');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    
    if (chatHeader) {
        chatHeader.style.display = 'flex';
    }
    if (chatPlaceholder) {
        chatPlaceholder.style.display = 'none';
    }
    
    // Обновляем заголовок чата
    const chatHeaderName = document.getElementById('chat-header-name');
    const chatHeaderAvatar = document.getElementById('chat-header-avatar');
    if (chatHeaderName) {
        chatHeaderName.textContent = username;
    }
    if (chatHeaderAvatar && avatarUrl) {
        chatHeaderAvatar.src = avatarUrl;
    }

    try {
        // Загружаем историю сообщений
        const response = await fetch(`/api/chat/history/${username}`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const chatMessages = document.getElementById('messages');
            chatMessages.innerHTML = data.data.map(message => createMessageElement(message)).join('');
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Отмечаем все непрочитанные сообщения как прочитанные
            markMessagesAsRead(username);
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Функция для отметки сообщений как прочитанных
async function markMessagesAsRead(fromUser) {
    try {
        const response = await fetch('/api/chat/mark-as-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: JSON.stringify({
                fromUser: fromUser
            })
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем статус сообщений в интерфейсе
            const messages = document.querySelectorAll('.message-received');
            messages.forEach(message => {
                const statusElement = message.querySelector('.message-status');
                if (statusElement) {
                    statusElement.className = 'message-status status-read';
                    statusElement.innerHTML = '<i class="fas fa-check-double"></i>';
                }
            });
        }
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Функция для проверки новых сообщений
async function checkNewMessages() {
    if (!currentChatPartner) return;

    try {
        const response = await fetch(`/api/chat/new-messages/${currentChatPartner}`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success && data.data.length > 0) {
            // Добавляем новые сообщения в чат
            const chatMessages = document.getElementById('messages');
            data.data.forEach(message => {
                chatMessages.insertAdjacentHTML('beforeend', createMessageElement(message));
            });
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Отмечаем новые сообщения как прочитанные
            markMessagesAsRead(currentChatPartner);
        }
    } catch (error) {
        console.error('Error checking new messages:', error);
    }
}

// Запускаем периодическую проверку новых сообщений
setInterval(checkNewMessages, 5000);

// Обработчик события вид��мости страницы
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentChatPartner) {
        markMessagesAsRead(currentChatPartner);
    }
});

// Функция для проверки статуса прочтения сообщений
async function checkMessageStatus() {
    if (!currentChatPartner) return;

    try {
        const response = await fetch(`/api/chat/message-status/${currentChatPartner}`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем статус для каждого сообщения
            data.data.forEach(messageStatus => {
                const messageElement = document.querySelector(`[data-message-id="${messageStatus.messageId}"]`);
                if (messageElement && messageStatus.isRead) {
                    const statusElement = messageElement.querySelector('.message-status');
                    if (statusElement) {
                        statusElement.className = 'message-status status-read';
                        statusElement.innerHTML = '<i class="fas fa-check-double"></i>';
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error checking message status:', error);
    }
}

// Функция для создания элемента сообщения
function createMessageElement(message) {
    const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
    const isSent = message.from === currentUser;
    const time = new Date(message.timestamp).toLocaleTimeString();
    
    // Определяем статус сообщения
    let statusIcon = '';
    if (isSent) {
        statusIcon = message.isRead 
            ? '<div class="message-status status-read"><i class="fas fa-check-double"></i></div>'
            : '<div class="message-status status-sent"><i class="fas fa-check"></i></div>';
    }

    return `
        <div class="message ${isSent ? 'message-sent' : 'message-received'}" data-message-id="${message.id}">
            <div class="message-content">
                ${message.message}
                <div class="message-info">
                    <span class="message-time">${time}</span>
                    ${statusIcon}
                </div>
            </div>
        </div>
    `;
}

// Запускаем периодическую проверку статуса сообщений
setInterval(checkMessageStatus, 3000);

// Добавляем обработчик события keypress для поля ввода
document.getElementById('messageInput').addEventListener('keypress', function(event) {
    // Проверяем, была ли нажата клавиша Enter (код 13)
    if (event.key === 'Enter' && !event.shiftKey) {
        // Предотвращаем стандартное поведение (перенос строки)
        event.preventDefault();
        // Вызываем функцию отправки сообщения
        sendMessage();
    }
});

// Обработчик клика по кнопке отправки
document.getElementById('sendMessage').addEventListener('click', sendMessage);

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || !currentChatPartner) return;

    try {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: JSON.stringify({
                to: currentChatPartner,
                message: message,
                isRead: false // Изначально сообщение не прочитано
            })
        });

        const data = await response.json();

        if (data.success) {
            const chatMessages = document.getElementById('messages');
            const newMessage = createMessageElement({
                from: JSON.parse(localStorage.getItem('user')).data.username,
                message: message,
                timestamp: new Date(),
                isRead: false
            });

            chatMessages.insertAdjacentHTML('beforeend', newMessage);
            input.value = '';

            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });

            // Обновляем последнее сообщение в списке чатов
            updateLastMessage(currentChatPartner, message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Функция для обновления статуса сообщения
function updateMessageStatus(messageId, isRead) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const statusElement = messageElement.querySelector('.message-status');
        if (statusElement) {
            statusElement.className = `message-status status-${isRead ? 'read' : 'sent'}`;
            statusElement.innerHTML = isRead 
                ? '<i class="fas fa-check-double"></i>'
                : '<i class="fas fa-check"></i>';
        }
    }
} 