let currentChatPartner = null;
let currentUser = null;
let messageUpdateInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Проверка авторизации
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        window.location.href = '../authreg/authreg.html';
        return;
    }

    // Инициализация чата
    await initializeChat();
    setupEventListeners();
});

async function initializeChat() {
    try {
        console.log('Загрузка списка друзей...');
        const response = await fetch(`https://adminflow.ru:5003/api/friends?userId=${currentUser.id}`);
        const data = await response.json();
        console.log('Ответ сервера:', data);

        if (data.friends) {
            displayFriendsList(data.friends);
            // Проверяем, есть ли сохраненный собеседник
            const savedPartner = localStorage.getItem('chatPartner');
            if (savedPartner) {
                openChat(JSON.parse(savedPartner));
                localStorage.removeItem('chatPartner');
            }
        } else {
            console.error('Ошибка загрузки друзей:', data.error);
        }
    } catch (err) {
        console.error('Error initializing chat:', err);
    }
}

function displayFriendsList(friends) {
    const friendsList = document.getElementById('friends-list');
    console.log('Displaying friends:', friends);
    if (!friendsList) {
        console.error('friends-list element not found');
        return;
    }

    friendsList.innerHTML = friends.map(friend => `
        <div class="chat-partner" data-friend-id="${friend.id}">
            <img src="${friend.avatar_url || '../uploads/avatars/default.png'}" alt="${friend.username}" class="chat-avatar">
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="last-message" id="last-message-${friend.id}">...</div>
            </div>
            <div class="unread-count" id="unread-${friend.id}"></div>
        </div>
    `).join('');

    // Добавляем обработчики событий для каждого друга
    document.querySelectorAll('.chat-partner').forEach(partner => {
        partner.addEventListener('click', () => {
            const friendId = partner.dataset.friendId;
            const friend = friends.find(f => f.id === parseInt(friendId));
            if (friend) {
                openChat(friend);
            }
        });
    });

    // Загружаем последние сообщения и счетчики для каждого друга
    friends.forEach(friend => {
        loadLastMessage(friend.id);
        updateUnreadCount(friend.id);
    });
}

async function loadLastMessage(friendId) {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/last/${currentUser.id}/${friendId}`);
        const data = await response.json();

        const lastMessageElement = document.getElementById(`last-message-${friendId}`);
        if (lastMessageElement) {
            if (data.success && data.message) {
                const isOwnMessage = data.message.sender_id === currentUser.id;
                const messageText = data.message.message.length > 25 
                    ? data.message.message.substring(0, 25) + '...' 
                    : data.message.message;
                lastMessageElement.textContent = `${isOwnMessage ? 'Вы: ' : ''}${messageText}`;
            } else {
                lastMessageElement.textContent = 'Нет сообщений';
            }
        }
    } catch (err) {
        console.error('Error loading last message:', err);
    }
}

async function updateUnreadCount(friendId) {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/unread/${currentUser.id}`);
        const data = await response.json();

        const unreadElement = document.getElementById(`unread-${friendId}`);
        if (unreadElement && data.success) {
            const unreadCount = data.unreadCounts.find(count => count.sender_id === friendId);
            unreadElement.textContent = unreadCount ? unreadCount.count : '';
            unreadElement.style.display = unreadCount && unreadCount.count > 0 ? 'block' : 'none';
        }
    } catch (err) {
        console.error('Error updating unread count:', err);
    }
}

async function openChat(friend) {
    currentChatPartner = friend;
    
    // Обновляем UI
    document.querySelectorAll('.chat-partner').forEach(el => 
        el.classList.remove('active')
    );
    document.querySelector(`[data-friend-id="${friend.id}"]`)?.classList.add('active');

    // Показываем заголоок чата
    const chatHeader = document.getElementById('chat-header');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    
    chatHeader.style.display = 'block';
    chatPlaceholder.style.display = 'none';
    
    document.getElementById('chat-header-avatar').src = friend.avatar_url || '../uploads/avatars/default.png';
    document.getElementById('chat-header-name').textContent = friend.username;

    // Загружаем историю сообщений
    await loadChatHistory();
    
    // Отмечаем сообщения как прочитанные
    await markMessagesAsRead();

    // Устанавливаем интервал обновления
    if (messageUpdateInterval) clearInterval(messageUpdateInterval);
    messageUpdateInterval = setInterval(loadChatHistory, 5000);
}

async function loadChatHistory() {
    if (!currentChatPartner) return;

    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/history/${currentUser.id}/${currentChatPartner.id}`);
        const data = await response.json();

        if (data.success) {
            displayMessages(data.messages);
        }
    } catch (err) {
        console.error('Error loading chat history:', err);
    }
}

function displayMessages(messages) {
    const messagesArea = document.getElementById('messages');
    if (!messagesArea) return;

    messagesArea.innerHTML = messages.map(message => {
        const isOwnMessage = message.sender_id === currentUser.id;
        const messageTime = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="message ${isOwnMessage ? 'message-sent' : 'message-received'}">
                ${message.reply_data ? `
                    <div class="reply-to">
                        <div class="reply-line"></div>
                        <div class="reply-content">${message.reply_data.message}</div>
                    </div>
                ` : ''}
                <div class="message-content">${message.message}</div>
                <div class="message-info">
                    <span class="message-time">${messageTime}</span>
                    ${isOwnMessage ? `
                        <span class="message-status">
                            <i class="fas ${message.is_read ? 'fa-check-double' : 'fa-check'}"></i>
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    messagesArea.scrollTop = messagesArea.scrollHeight;
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const fileInput = document.getElementById('fileInput');
    const message = messageInput.value.trim();
    const file = fileInput.files[0];

    if (!message && !file) return;
    if (!currentChatPartner) return;

    try {
        const formData = new FormData();
        formData.append('senderId', currentUser.id);
        formData.append('receiverId', currentChatPartner.id);
        formData.append('message', message);
        
        if (file) {
            formData.append('file', file);
        }

        const response = await fetch('https://adminflow.ru:5003/api/messages/send-with-file', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            messageInput.value = '';
            fileInput.value = '';
            await loadMessages(currentChatPartner.id);
            scrollToBottom();
        } else {
            console.error('Error sending message');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

async function markMessagesAsRead() {
    if (!currentChatPartner) return;

    try {
        await fetch('https://adminflow.ru:5003/api/messages/read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: currentChatPartner.id
            })
        });

        // Обновляем сетчик непрочитанных сообщений
        await updateUnreadCount(currentChatPartner.id);
    } catch (err) {
        console.error('Error marking messages as read:', err);
    }
}

function setupEventListeners() {
    // Отправка сообщения по кнопке
    document.getElementById('sendMessage')?.addEventListener('click', sendMessage);

    // Отправка сообщения по Enter
    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Добавляем обработчик для предпросмотра файла
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Если это изображение, можно показать предпросмотр
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Показываем предпросмотр изображения
                    const preview = document.createElement('div');
                    preview.className = 'file-preview';
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <span class="file-name">${file.name}</span>
                        <button class="remove-file">×</button>
                    `;
                    document.querySelector('.input-area').insertBefore(
                        preview, 
                        document.getElementById('messageInput')
                    );
                };
                reader.readAsDataURL(file);
            } else {
                // Для других типов файлов показываем только имя
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                preview.innerHTML = `
                    <i class="fas fa-file"></i>
                    <span class="file-name">${file.name}</span>
                    <button class="remove-file">×</button>
                `;
                document.querySelector('.input-area').insertBefore(
                    preview, 
                    document.getElementById('messageInput')
                );
            }
        }
    });
}

// Очистка при уходе со страницы
window.addEventListener('beforeunload', () => {
    if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
    }
}); 