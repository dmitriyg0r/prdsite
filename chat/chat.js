let currentChatPartner = null;
let currentUser = null;
let messageUpdateInterval = null;
let selectedFile = null;
let typingTimeout = null;
let selectedMessageId = null;
let selectedMessageText = '';
let replyToMessageId = null;

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
    setupAttachmentHandlers();
});

async function initializeChat() {
    try {
        console.log('Загрузка списка друзей...');
        const response = await fetch(`https://adminflow.ru:5003/api/friends?userId=${currentUser.id}`);
        const data = await response.json();
        console.log('Ответ сервера:', data);

        if (data.friends) {
            displayFriendsList(data.friends);
            
            // Проверяем сохраненного собеседника в sessionStorage
            const savedPartner = sessionStorage.getItem('selectedChatUser');
            if (savedPartner) {
                const partner = JSON.parse(savedPartner);
                // Открываем чат с выбранным пользователем
                openChat(partner);
                // Очищаем данные из sessionStorage
                sessionStorage.removeItem('selectedChatUser');
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
            <div class="avatar-container">
                <img src="${friend.avatar_url || '../uploads/avatars/default.png'}" alt="${friend.username}" class="chat-avatar">
                <span class="status-indicator ${friend.is_online ? 'online' : 'offline'}"></span>
            </div>
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="last-message" id="last-message-${friend.id}">...</div>
                <div class="last-activity">${friend.is_online ? 'онлайн' : getLastActivityTime(friend.last_activity)}</div>
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

function getLastActivityTime(timestamp) {
    if (!timestamp) return 'не в сети';
    const lastActivity = new Date(timestamp);
    const now = new Date();
    const diff = now - lastActivity;
    
    if (diff < 60000) return 'был(а) т��лько что';
    if (diff < 3600000) return `был(а) ${Math.floor(diff/60000)} мн. назад`;
    if (diff < 86400000) return `был(а) ${Math.floor(diff/3600000)} ч. назад`;
    return 'был(а) давно';
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
    if (!friendId) {
        console.error('FriendId is undefined');
        return;
    }

    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/unread/${currentUser.id}/${friendId}`);
        const data = await response.json();
        
        const unreadElement = document.getElementById(`unread-${friendId}`);
        if (unreadElement) {
            if (data.count > 0) {
                unreadElement.textContent = data.count;
                unreadElement.style.display = 'flex';
            } else {
                unreadElement.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Error updating unread count:', err);
    }
}

async function openChat(friend) {
    if (!friend || !friend.id) {
        console.error('Invalid friend object:', friend);
        return;
    }

    const friendId = parseInt(friend.id); // Преобразуем ID в число
    if (isNaN(friendId)) {
        console.error('Invalid friend ID:', friend.id);
        return;
    }

    try {
        // Получаем информацию о друге
        const response = await fetch(`https://adminflow.ru:5003/api/users/${friendId}`);
        const data = await response.json();

        if (data.success) {
            currentChatPartner = data.user;
            
            // Обновляем UI
            document.querySelectorAll('.chat-partner').forEach(el => {
                el.classList.remove('active');
            });
            
            const chatPartnerElement = document.querySelector(`.chat-partner[data-friend-id="${friendId}"]`);
            if (chatPartnerElement) {
                chatPartnerElement.classList.add('active');
            }

            // Загружаем сообщения
            await loadMessages(friendId);
            
            // Помечаем сообщения как прочитанные
            await markMessagesAsRead(friendId);
            
            // Включаем обновление сообщений
            startMessageUpdates();
        }
    } catch (err) {
        console.error('Error opening chat:', err);
    }
}

async function loadChatHistory() {
    if (!currentChatPartner) return;

    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/history/${currentUser.id}/${currentChatPartner.id}`);
        const data = await response.json();

        if (data.success) {
            const messagesContainer = document.getElementById('messages');
            
            // Оптимизация проверки новых сообщений
            const currentMessageIds = new Set(
                Array.from(messagesContainer.querySelectorAll('.message'))
                    .map(el => el.dataset.messageId)
            );
            
            // Фильтрация только новых сообщений
            const newMessages = data.messages.filter(message => 
                !currentMessageIds.has(message.id.toString())
            );

            if (messagesContainer.children.length === 0) {
                displayMessages(data.messages);
                scrollToBottom();
            } else if (newMessages.length > 0) {
                const isScrolledToBottom = isUserAtBottom(messagesContainer);
                displayNewMessages(newMessages, isScrolledToBottom);
            }
        }
    } catch (err) {
        console.error('Ошибка загрузки истории чата:', err);
    }
}

// Вспомогательная функция для проверки положения скролла
function isUserAtBottom(container) {
    return container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
}

function displayMessages(messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messageElement.dataset.messageId = message.id;
        messagesContainer.appendChild(messageElement);
    });
}

function displayNewMessages(newMessages, shouldScroll) {
    const messagesContainer = document.getElementById('messages');
    const fragment = document.createDocumentFragment();

    newMessages.forEach(message => {
        const messageElement = createMessageElement(message);
        messageElement.dataset.messageId = message.id;
        fragment.appendChild(messageElement);
    });

    messagesContainer.appendChild(fragment);

    if (shouldScroll) {
        requestAnimationFrame(() => {
            scrollToBottom();
        });
    }
}

function createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender_id === currentUser.id ? 'message-sent' : 'message-received'}`;
    messageElement.dataset.messageId = message.id;
    messageElement.dataset.timestamp = message.created_at;

    // Если есть информация об ответе, показываем её
    if (message.reply_to_message) {
        const replyElement = document.createElement('div');
        replyElement.className = 'message-reply';
        
        // Определяем автора сообщения, на которое отвечают
        const replyAuthor = message.reply_to_message.sender_id === currentUser.id ? 'Вы' : message.reply_to_message.sender_username;
        
        // Обрезаем длинный текст ответа
        const replyText = message.reply_to_message.message;
        const maxReplyLength = 50;
        const truncatedReplyText = replyText.length > maxReplyLength 
            ? replyText.substring(0, maxReplyLength) + '...' 
            : replyText;

        replyElement.innerHTML = `
            <div class="reply-header">
                <i class="fas fa-reply"></i>
                <span class="reply-author">${replyAuthor}</span>
            </div>
            <div class="reply-content">${truncatedReplyText}</div>
        `;

        // Добавляем обработчик клика для прокрутки к исходному сообщению
        replyElement.addEventListener('click', () => {
            const originalMessage = document.querySelector(`.message[data-message-id="${message.reply_to_message.id}"]`);
            if (originalMessage) {
                originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                originalMessage.classList.add('message-highlight');
                setTimeout(() => {
                    originalMessage.classList.remove('message-highlight');
                }, 2000);
            }
        });

        messageElement.appendChild(replyElement);
    }

    // Основной текст сообщения
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Текст сообщения
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.message;
    messageContent.appendChild(messageText);

    // Информация о сообщении (вр��мя и статус)
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';

    // Время отправки
    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date(message.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    messageInfo.appendChild(messageTime);

    // Статус прочтения для отправленных сообщений
    if (message.sender_id === currentUser.id) {
        const readStatus = document.createElement('span');
        readStatus.className = 'message-status';
        readStatus.innerHTML = message.is_read 
            ? '<i class="fas fa-check-double"></i>' 
            : '<i class="fas fa-check"></i>';
        messageInfo.appendChild(readStatus);
    }

    messageContent.appendChild(messageInfo);
    messageElement.appendChild(messageContent);

    // Добавляем обработчик для контекстного меню
    messageElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, message.id, message.message);
    });

    return messageElement;
}

function createAttachmentElement(attachmentUrl) {
    const attachmentElement = document.createElement('div');
    attachmentElement.className = 'message-attachment';
    
    const fullUrl = `https://adminflow.ru:5003${attachmentUrl}`;

    if (attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
        const img = document.createElement('img');
        img.src = fullUrl;
        img.alt = 'Attachment';
        img.onclick = () => showImageModal(fullUrl);
        attachmentElement.appendChild(img);
    } else {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        const fileName = attachmentUrl.split('/').pop();
        fileInfo.innerHTML = `
            <i class="fas fa-file file-icon"></i>
            <a href="${fullUrl}" target="_blank" class="file-name">${fileName}</a>
        `;
        attachmentElement.appendChild(fileInfo);
    }

    return attachmentElement;
}

let isMessageSending = false;

async function sendMessage() {
    if (isMessageSending) return;
    
    const messageInput = document.getElementById('messageInput');
    const fileInput = document.getElementById('fileInput');
    const message = messageInput.value.trim();
    const file = fileInput.files[0];

    if (!message && !file || !currentChatPartner) return;

    try {
        isMessageSending = true;
        messageInput.disabled = true;

        const formData = new FormData();
        formData.append('senderId', currentUser.id);
        formData.append('receiverId', currentChatPartner.id);
        formData.append('message', message);
        
        // Добавляем ID сообщения, на которое отвечаем, если есть
        if (replyToMessageId) {
            formData.append('replyToMessageId', replyToMessageId);
        }
        
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Файл слишком большой (максимум 5MB)');
            }
            formData.append('file', file);
        }

        const response = await fetch('https://adminflow.ru:5003/api/messages/send-with-file', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            messageInput.value = '';
            fileInput.value = '';
            removeFilePreview();
            cancelReply(); // Очищаем предпросмотр ответа
            
            if (data.message) {
                const messagesContainer = document.getElementById('messages');
                const messageElement = createMessageElement(data.message);
                messageElement.dataset.messageId = data.message.id;
                messagesContainer.appendChild(messageElement);
                scrollToBottom();
            }
        } else {
            throw new Error(data.error || 'Ошибка отправки сообщения');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert(err.message || 'Произошла ошибка при отправке сообщения');
    } finally {
        isMessageSending = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

async function markMessagesAsRead(friendId) {
    if (!friendId) {
        console.error('FriendId is undefined');
        return;
    }

    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/mark-as-read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });

        const data = await response.json();
        if (data.success) {
            // Обновляем счетчик только если успешно обновили статус
            await updateUnreadCount(friendId);
        } else {
            console.error('Ошибка при об��овлении статуса сообщений:', data.error);
        }
    } catch (err) {
        console.error('Error marking messages as read:', err);
    }
}

function setupEventListeners() {
    // Удаляем старые обработчики перед добавлением новых
    const sendButton = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');
    
    // Удаляем старые обработчики
    sendButton?.removeEventListener('click', sendMessage);
    messageInput?.removeEventListener('keypress', handleEnterPress);

    // Добавляем новые обработчики
    sendButton?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keypress', handleEnterPress);

    messageInput?.addEventListener('input', () => {
        if (typingTimeout) clearTimeout(typingTimeout);
        
        // Отправляем статус "печатает"
        fetch('https://adminflow.ru:5003/api/messages/typing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: currentChatPartner.id,
                isTyping: true
            })
        });
        
        // Сбрасываем статус через 2 секунды
        typingTimeout = setTimeout(() => {
            fetch('https://adminflow.ru:5003/api/messages/typing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    friendId: currentChatPartner.id,
                    isTyping: false
                })
            });
        }, 2000);
    });
}

// Выносим обработчик Enter в отдельную функцию
function handleEnterPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// Очистка при уходе со страницы
window.addEventListener('beforeunload', () => {
    if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
    }
});

// Функция загрузки сообщений
async function loadMessages(friendId) {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/history/${currentUser.id}/${friendId}`);
        const data = await response.json();

        if (data.success) {
            const messagesContainer = document.getElementById('messages');
            messagesContainer.innerHTML = '';

            data.messages.forEach(message => {
                const messageElement = createMessageElement(message);
                messagesContainer.appendChild(messageElement);
            });

            // Прокручиваем к последнему сообщению
            scrollToBottom();

            // Помечаем сообщения как прочитанные
            markMessagesAsRead(friendId);
        } else {
            console.error('Ошибка загрузки сообщений:', data.error);
        }
    } catch (err) {
        console.error('Error loading messages:', err);
    }
}

// Функция прокрутки чата вниз
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    // Используем плавную прокрутку
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// Функция отметки сообщений как прочитанных
async function markMessagesAsRead(friendId) {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/mark-as-read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });

        const data = await response.json();
        if (data.success) {
            // Обновляем счетчик непрочитанных сообщений
            updateUnreadCount(friendId);
        } else {
            console.error('Ошибка при обновлении статуса сообщений:', data.error);
        }
    } catch (err) {
        console.error('Error marking messages as read:', err);
    }
}

// Функция показа модального окна с изображением
function showImageModal(imageUrl) {
    const modal = document.querySelector('.image-modal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageUrl; // спользуем полный URL
    modal.style.display = 'flex';
}

// Закрытие модального окна
document.querySelector('.close-modal').onclick = function() {
    document.querySelector('.image-modal').style.display = 'none';
};

// Добавляем обработчики для прикрепления файлов
function setupAttachmentHandlers() {
    const attachButton = document.getElementById('attachButton');
    const fileInput = document.getElementById('fileInput');
    const messageInput = document.getElementById('messageInput');

    attachButton?.addEventListener('click', () => fileInput.click());

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Проверка размера и типа файла
        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

        if (file.size > maxSize) {
            alert('Файл слишком большой. Максимальный размер: 5MB');
            fileInput.value = '';
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            alert('Неподдерживаемый тип файла. Разрешены: JPG, PNG, GIF, PDF');
            fileInput.value = '';
            return;
        }

        selectedFile = file;
        showFilePreview(file);
    });
}

// Функция отображения превью файла
function showFilePreview(file) {
    const previewContainer = document.createElement('div');
    previewContainer.id = 'filePreview';
    previewContainer.className = 'file-preview';

    const isImage = file.type.startsWith('image/');
    
    if (isImage) {
        const img = document.createElement('img');
        img.className = 'file-preview-image';
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        previewContainer.appendChild(img);
    }

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-preview-info';
    fileInfo.innerHTML = `
        <i class="fas ${isImage ? 'fa-image' : 'fa-file'}"></i>
        <span class="file-name">${file.name}</span>
        <button class="remove-file" onclick="removeFilePreview()">
            <i class="fas fa-times"></i>
        </button>
    `;
    previewContainer.appendChild(fileInfo);

    // Удаляем старый превью если есть
    removeFilePreview();
    
    // Добавляем новый превью перед полем ввода
    const inputArea = document.querySelector('.input-area');
    inputArea.insertBefore(previewContainer, inputArea.firstChild);
}

// Функция удаления превью файла
function removeFilePreview() {
    const preview = document.getElementById('filePreview');
    if (preview) {
        preview.remove();
    }
    selectedFile = null;
}

// Функция отправки сообщения с файлом
async function sendMessageWithFile(message) {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('senderId', currentUser.id);
    formData.append('receiverId', currentChatPartner.id);
    formData.append('message', message);

    try {
        const response = await fetch('https://adminflow.ru:5003/api/messages/send-with-file', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            loadMessages(currentChatPartner.id);
        } else {
            alert('Ошибка при отправке файла');
        }
    } catch (err) {
        console.error('Error sending file:', err);
        alert('Ошибка при отправке файла');
    }
}

function showContextMenu(event, messageId, messageText) {
    event.preventDefault();
    const contextMenu = document.getElementById('contextMenu');
    
    // Сохраняем ID и текст выбранного сообщения
    selectedMessageId = messageId;
    selectedMessageText = messageText;
    
    // Позиционируем меню
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.display = 'block';
}

document.getElementById('replyMessageBtn').addEventListener('click', () => {
    if (selectedMessageId) {
        showReplyPreview(selectedMessageText);
        document.getElementById('contextMenu').style.display = 'none';
    }
});

function showReplyPreview(messageText) {
    const replyPreview = document.getElementById('replyPreview');
    replyPreview.style.display = 'block';

    // Обрезаем текст, если он слишком длинный
    const maxLength = 50;
    const displayText = messageText.length > maxLength 
        ? messageText.substring(0, maxLength) + '...' 
        : messageText;

    // Добавляем кнопку закрытия
    replyPreview.innerHTML = `
        <div class="reply-text">Ответ на: ${displayText}</div>
        <button class="close-reply" onclick="cancelReply()">×</button>
    `;
    
    // Сохраняем ID сообщения, на которое отвечаем
    replyToMessageId = selectedMessageId;
}

function cancelReply() {
    const replyPreview = document.getElementById('replyPreview');
    replyPreview.style.display = 'none';
    replyToMessageId = null;
}

// Закрытие контекстного меню при клике вне его
document.addEventListener('click', (event) => {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none';
    }
});

// Обработчик для удаления сообщения
document.getElementById('deleteMessageBtn').addEventListener('click', () => {
    if (selectedMessageId) {
        deleteMessage(selectedMessageId);
        document.getElementById('contextMenu').style.display = 'none';
    }
});

async function deleteMessage(messageId) {
    if (!messageId) {
        console.error('Message ID is undefined');
        return;
    }

    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/delete/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await response.json();
        if (data.success) {
            const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
        } else {
            alert(data.error || 'Ошибка при удалении сообщения');
        }
    } catch (err) {
        console.error('Error deleting message:', err);
        alert('Ошибка при удалении сообщения');
    }
}

// Добавляем периодическое обновление счетчиков
function startUnreadCountUpdates() {
    const updateInterval = setInterval(() => {
        const friendsList = document.querySelectorAll('.chat-partner');
        friendsList.forEach(friend => {
            const friendId = friend.dataset.friendId;
            updateUnreadCount(friendId);
        });
    }, 5000); // Обновляем каждые 5 секунд

    return updateInterval;
}

function startMessageUpdates() {
    if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
    }
    
    // Немедленно загружаем сообщения
    loadChatHistory();
    
    // Устанавливаем интервал обновления
    messageUpdateInterval = setInterval(() => {
        if (currentChatPartner) {
            loadChatHistory();
        }
    }, 3000); // Обновление каждые 3 секунды
} 