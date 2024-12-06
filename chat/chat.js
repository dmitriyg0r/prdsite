let currentChatPartner = null;
let currentUser = null;
let messageUpdateInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация пользователя
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        window.location.href = '../authreg/authreg.html';
        return;
    }

    // Загрузка списка друзей для чата
    await loadFriendsList();

    // Настройка обработчиков событий
    setupEventListeners();

    // Проверяем, есть ли сохраненный партнер для чата
    const savedPartner = localStorage.getItem('chatPartner');
    if (savedPartner) {
        openChat(JSON.parse(savedPartner));
        localStorage.removeItem('chatPartner');
    }
});

// Загрузка списка друзей
async function loadFriendsList() {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/friends?userId=${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            displayFriendsList(data.friends);
            // Загружаем количество непрочитанных сообщений
            await updateUnreadCounts();
        }
    } catch (err) {
        console.error('Error loading friends list:', err);
    }
}

// Отображение списка друзей
function displayFriendsList(friends) {
    const friendsList = document.getElementById('friends-list');
    friendsList.innerHTML = friends.map(friend => `
        <div class="chat-partner" data-user-id="${friend.id}" onclick="openChat(${JSON.stringify(friend)})">
            <img src="${friend.avatar_url || '/uploads/avatars/default.png'}" alt="${friend.username}" class="friend-avatar">
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="last-message" id="last-message-${friend.id}">Загрузка...</div>
            </div>
            <div class="unread-count" id="unread-${friend.id}"></div>
        </div>
    `).join('');

    // Загружаем последние сообщения для каждого друга
    friends.forEach(friend => loadLastMessage(friend.id));
}

// Загрузка последнего сообщения
async function loadLastMessage(friendId) {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/last/${currentUser.id}/${friendId}`);
        const data = await response.json();

        const lastMessageElement = document.getElementById(`last-message-${friendId}`);
        if (lastMessageElement) {
            if (data.success && data.message) {
                const isOwnMessage = data.message.sender_id === currentUser.id;
                lastMessageElement.textContent = `${isOwnMessage ? 'Вы: ' : ''}${data.message.message}`;
            } else {
                lastMessageElement.textContent = 'Нет сообщений';
            }
        }
    } catch (err) {
        console.error('Error loading last message:', err);
    }
}

// Обновление счетчиков непрочитанных сообщений
async function updateUnreadCounts() {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/unread/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            data.unreadCounts.forEach(({ sender_id, count }) => {
                const unreadElement = document.getElementById(`unread-${sender_id}`);
                if (unreadElement) {
                    unreadElement.textContent = count > 0 ? count : '';
                }
            });
        }
    } catch (err) {
        console.error('Error updating unread counts:', err);
    }
}

// Открытие чата с пользователем
async function openChat(friend) {
    currentChatPartner = friend;
    
    // Обновляем UI
    const chatHeader = document.getElementById('chat-header');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    const messagesArea = document.getElementById('messages');
    
    chatHeader.style.display = 'flex';
    chatPlaceholder.style.display = 'none';
    
    // Обновляем заголовок чата
    document.getElementById('chat-header-avatar').src = friend.avatar_url || '/uploads/avatars/default.png';
    document.getElementById('chat-header-name').textContent = friend.username;

    // Загружаем историю сообщений
    await loadChatHistory();

    // Отмечаем сообщения как прочитанные
    await markMessagesAsRead();

    // Устанавливаем интервал обновления сообщений
    if (messageUpdateInterval) clearInterval(messageUpdateInterval);
    messageUpdateInterval = setInterval(loadChatHistory, 5000);
}

// Загрузка истории сообщений
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

// Отображение сообщений
function displayMessages(messages) {
    const messagesArea = document.getElementById('messages');
    messagesArea.innerHTML = messages.map(message => {
        const isOwnMessage = message.sender_id === currentUser.id;
        return `
            <div class="message ${isOwnMessage ? 'message-sent' : 'message-received'}" data-message-id="${message.id}">
                ${message.reply_data ? `
                    <div class="reply-to">
                        <div class="reply-line"></div>
                        <div class="reply-text">${message.reply_data.message}</div>
                    </div>
                ` : ''}
                <div class="message-content">
                    ${message.message}
                    ${message.attachment_url ? `
                        <div class="message-attachment">
                            <img src="${message.attachment_url}" alt="Вложение" onclick="showImageModal(this.src)">
                        </div>
                    ` : ''}
                </div>
                <div class="message-info">
                    <span class="message-time">${new Date(message.created_at).toLocaleTimeString()}</span>
                    ${isOwnMessage ? `
                        <span class="message-status">
                            <i class="fas ${message.is_read ? 'fa-check-double' : 'fa-check'}"></i>
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Прокручиваем к последнему сообщению
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Отправка сообщения
async function sendMessage() {
    if (!currentChatPartner) return;

    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    const replyPreview = document.getElementById('replyPreview');
    const replyToId = replyPreview?.dataset.replyToId;

    if (!message) return;

    try {
        const response = await fetch('https://adminflow.ru:5003/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                senderId: currentUser.id,
                receiverId: currentChatPartner.id,
                message,
                replyTo: replyToId || null
            })
        });

        const data = await response.json();

        if (data.success) {
            input.value = '';
            if (replyPreview) replyPreview.remove();
            await loadChatHistory();
            await loadFriendsList(); // Обновляем список для отображения последнего сообщения
        }
    } catch (err) {
        console.error('Error sending message:', err);
        alert('Ошибка при отправке сообщения');
    }
}

// Отметка сообщений как прочитанных
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

        // Обновляем счетчики непрочитанных сообщений
        await updateUnreadCounts();
    } catch (err) {
        console.error('Error marking messages as read:', err);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Отправка сообщения по кнопке
    document.getElementById('sendMessage').addEventListener('click', sendMessage);

    // Отправка сообщения по Enter
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Обработка прикрепления файлов
    const fileInput = document.getElementById('fileInput');
    const attachButton = document.getElementById('attachButton');

    attachButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
}

// Очистка при уходе со страницы
window.addEventListener('beforeunload', () => {
    if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
    }
}); 