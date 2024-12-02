document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.data) {
        window.location.href = '../Profile/profile.html';
        return;
    }

    loadFriendsList();
});

// Функция для загрузки списка друзей
function loadFriendsList() {
    fetch('/api/friends/list', {
        headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const friendsListDiv = document.getElementById('friends-list');
            friendsListDiv.innerHTML = data.data.map(friend => `
                <div class="chat-partner" onclick="openChat('${friend.username}')">
                    <img src="${friend.avatarUrl ? `/api/${friend.avatarUrl}` : '../assets/default-avatar.png'}" alt="Avatar" class="friend-avatar">
                    <span>${friend.username}</span>
                </div>
            `).join('');
        }
    })
    .catch(error => console.error('Error loading friends list:', error));
}

// Глобальная переменная для текущего собеседника
let currentChatPartner = null;

// Функция для открытия чата с пользователем
async function openChat(username) {
    currentChatPartner = username;
    
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

// Обработчик события видимости страницы
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
            ${message.message}
            <div class="message-info">
                <span class="message-time">${time}</span>
                ${statusIcon}
            </div>
        </div>
    `;
}

// Запускаем периодическую проверку статуса сообщений
setInterval(checkMessageStatus, 3000);

// Обработчик отправки сообщения
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