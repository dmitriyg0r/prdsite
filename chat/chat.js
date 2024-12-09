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
    setupContextMenu();
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
    
    if (diff < 60000) return 'был(а) т что';
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

    const friendId = parseInt(friend.id);
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
            
            // Скрываем placeholder и показываем чат
            document.getElementById('chat-placeholder').style.display = 'none';
            document.getElementById('chat-header').style.display = 'flex';
            document.getElementById('messages').style.display = 'flex';
            
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
        
        const replyAuthor = message.reply_to_message.sender_id === currentUser.id ? 'Вы' : message.reply_to_message.sender_username;
        const truncatedReplyText = message.reply_to_message.message.length > 50 
            ? message.reply_to_message.message.substring(0, 50) + '...' 
            : message.reply_to_message.message;

        replyElement.innerHTML = `
            <div class="reply-header">
                <i class="fas fa-reply"></i>
                <span class="reply-author">${replyAuthor}</span>
            </div>
            <div class="reply-content">${truncatedReplyText}</div>
        `;

        messageElement.appendChild(replyElement);
    }

    // Основной контент сообщения
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Текст сообщения
    if (message.message) {
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = message.message;
        messageContent.appendChild(messageText);
    }

    // Если есть вложение
    if (message.attachment_url) {
        const attachmentElement = createAttachmentElement(message.attachment_url);
        messageContent.appendChild(attachmentElement);
    }

    // Информация о сообщении (время и статус)
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';

    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date(message.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    messageInfo.appendChild(messageTime);

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

    return messageElement;
}

function createAttachmentElement(attachmentUrl) {
    const attachmentElement = document.createElement('div');
    attachmentElement.className = 'message-attachment';
    
    // Проверяем, начинается ли URL с http
    const fullUrl = attachmentUrl.startsWith('http') 
        ? attachmentUrl 
        : `https://adminflow.ru:5003/uploads/messages/${attachmentUrl}`;

    console.log('Attachment URL:', fullUrl); // Для отладки

    if (isImageFile(attachmentUrl)) {
        const img = document.createElement('img');
        img.src = fullUrl;
        img.alt = 'Изображение';
        img.onerror = () => {
            console.error('Ошибка загрузки изображения:', fullUrl);
            img.src = '../uploads/avatars/default.png'; // Заглушка при ошибке
        };
        img.onclick = () => showImageModal(fullUrl);
        attachmentElement.appendChild(img);
    } else {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        const fileName = attachmentUrl.split('/').pop();
        fileInfo.innerHTML = `
            <i class="fas fa-file file-icon"></i>
            <a href="${fullUrl}" target="_blank" class="file-name" download>${fileName}</a>
        `;
        attachmentElement.appendChild(fileInfo);
    }

    return attachmentElement;
}

// Вспомогательная функция для проверки типа файла
function isImageFile(url) {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

let isMessageSending = false;

async function sendMessage() {
    if (!currentChatPartner || (!messageInput.value.trim() && !selectedFile)) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('senderId', currentUser.id);
        formData.append('receiverId', currentChatPartner.id);
        formData.append('message', messageInput.value.trim());
        
        if (selectedFile) {
            formData.append('file', selectedFile);
            console.log('Отправка файла:', selectedFile.name); // Для отладки
        }

        if (replyToMessageId) {
            formData.append('replyToMessageId', replyToMessageId);
        }

        const response = await fetch('https://adminflow.ru:5003/api/messages/send-with-file', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log('Ответ сервера:', data); // Для отладки
        
        if (data.success) {
            messageInput.value = '';
            selectedFile = null;
            removeFilePreview();
            cancelReply();
            
            // Добавляем новое сообщение в чат
            const messageElement = createMessageElement(data.message);
            document.getElementById('messages').appendChild(messageElement);
            scrollToBottom();
        } else {
            console.error('Ошибка при отправке сообщения:', data.error);
            alert('Ошибка при отправке сообщения');
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert('Ошибка при отправке сообщения');
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
            console.error('Ошибка при обновлении статуса сообщений:', data.error);
        }
    } catch (err) {
        console.error('Error marking messages as read:', err);
    }
}

function setupEventListeners() {
    // Удаляем старые обработчики перед добавлением ��овых
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

// Очистка при ходе со страницы
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
            if (!messagesContainer) {
                console.error('Messages container not found');
                return;
            }

            const isAtBottom = isScrolledToBottom(messagesContainer);
            
            // Получаем существующие сообщения
            const existingMessages = new Set(
                Array.from(messagesContainer.children).map(el => el.dataset.messageId)
            );
            
            // Находим только новые сообщения
            const newMessages = data.messages.filter(msg => !existingMessages.has(msg.id.toString()));
            
            // Если есть новые сообщения
            if (newMessages.length > 0) {
                // Добавляем только новые сообщения
                newMessages.forEach(message => {
                    const messageElement = createMessageElement(message);
                    messagesContainer.appendChild(messageElement);
                });
                
                // Прокручиваем вниз только если были в нижней позиции
                if (isAtBottom) {
                    scrollToBottom();
                }
            }
            
            // Обновляем статусы существующих сообщений
            data.messages.forEach(message => {
                const existingMessage = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
                if (existingMessage) {
                    updateMessageStatus(existingMessage, message);
                }
            });

            // Помечаем сообщения как прочитанные
            if (newMessages.length > 0) {
                await markMessagesAsRead(friendId);
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
    }
}

// Функция обновления статуса сообщения
function updateMessageStatus(messageElement, messageData) {
    const statusElement = messageElement.querySelector('.message-status');
    if (statusElement) {
        statusElement.innerHTML = messageData.is_read 
            ? '<i class="fas fa-check-double"></i>' 
            : '<i class="fas fa-check"></i>';
    }
}

// Функция прокрутки чата вниз
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Функция отметки сообщений как прочитанных
async function markMessagesAsRead(friendId) {
    try {
        await fetch('https://adminflow.ru:5003/api/messages/mark-as-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });
    } catch (error) {
        console.error('Ошибка при обновлении статуса сообщений:', error);
    }
}

// Функция показа модального окна с изображением
function showImageModal(imageUrl) {
    const modal = document.querySelector('.image-modal');
    const modalImage = document.getElementById('modalImage');
    
    // Показываем индикатор загрузки
    modalImage.style.opacity = '0.5';
    modal.style.display = 'flex';
    
    // Загружаем изображение
    modalImage.onload = () => {
        modalImage.style.opacity = '1';
    };
    
    modalImage.onerror = () => {
        console.error('Ошибка загрузки изображения в модальном окне:', imageUrl);
        modal.style.display = 'none';
        alert('Ошибка при загрузке изображения');
    };
    
    modalImage.src = imageUrl;
}

// Закрытие модального окна
document.querySelector('.close-modal').onclick = function() {
    document.querySelector('.image-modal').style.display = 'none';
};

// Добавляем обработчики для прикрепления файлов
function setupAttachmentHandlers() {
    const attachButton = document.getElementById('attachButton');
    const fileInput = document.getElementById('fileInput');
    
    if (!attachButton || !fileInput) {
        console.error('Элементы прикрепления файлов не найдены');
        return;
    }
    
    attachButton.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Файл слишком большой (максимум 5MB)');
                fileInput.value = '';
                return;
            }
            selectedFile = file;
            showFilePreview(file);
        }
    });
}

function showFilePreview(file) {
    let previewContainer = document.getElementById('filePreview');
    
    // Если контейнер не существует, создаем его
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'filePreview';
        const inputArea = document.querySelector('.input-area');
        if (inputArea) {
            inputArea.insertBefore(previewContainer, inputArea.firstChild);
        } else {
            console.error('Элемент input-area не найден');
            return;
        }
    }
    
    const isImage = file.type.startsWith('image/');
    
    // Создаем превью
    const previewContent = document.createElement('div');
    previewContent.className = 'file-preview';
    previewContent.innerHTML = `
        ${isImage ? `<img src="${URL.createObjectURL(file)}" class="file-preview-image" alt="Preview">` : ''}
        <div class="file-preview-info">
            <i class="fas ${isImage ? 'fa-image' : 'fa-file'}"></i>
            <span class="file-name">${file.name}</span>
            <button class="remove-file" type="button">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Очищаем предыдущее превью
    previewContainer.innerHTML = '';
    previewContainer.appendChild(previewContent);
    
    // Добавляем обработчик для кнопки удаления
    const removeButton = previewContent.querySelector('.remove-file');
    if (removeButton) {
        removeButton.addEventListener('click', removeFilePreview);
    }
}

function removeFilePreview() {
    const previewContainer = document.getElementById('filePreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    selectedFile = null;
    
    // Очищаем input файла
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

function setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    const messagesArea = document.getElementById('messages');
    
    if (!contextMenu || !messagesArea) {
        console.error('Элементы контекстного меню не найдены');
        return;
    }

    // Обработчик правого клика на сообщении
    messagesArea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Находим ближайший элемент сообщения
        const messageElement = e.target.closest('.message');
        if (messageElement) {
            // Получаем текст сообщения
            const messageTextElement = messageElement.querySelector('.message-text');
            if (messageTextElement) {
                selectedMessageId = messageElement.dataset.messageId;
                selectedMessageText = messageTextElement.textContent;
                
                // Позиционируем меню
                const rect = messagesArea.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${x}px`;
                contextMenu.style.top = `${y}px`;

                // Проверяем, не выходит ли меню за пределы экрана
                const menuRect = contextMenu.getBoundingClientRect();
                if (menuRect.right > window.innerWidth) {
                    contextMenu.style.left = `${x - menuRect.width}px`;
                }
                if (menuRect.bottom > window.innerHeight) {
                    contextMenu.style.top = `${y - menuRect.height}px`;
                }
            }
        }
    });

    // Обработчики пунктов меню
    document.getElementById('replyMessageBtn').addEventListener('click', () => {
        if (selectedMessageId && selectedMessageText) {
            showReplyPreview(selectedMessageText);
            contextMenu.style.display = 'none';
        }
    });

    document.getElementById('deleteMessageBtn').addEventListener('click', () => {
        if (selectedMessageId) {
            deleteMessage(selectedMessageId);
            contextMenu.style.display = 'none';
        }
    });

    // Закрытие меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    });

    // Закрытие меню при скролле
    messagesArea.addEventListener('scroll', () => {
        contextMenu.style.display = 'none';
    });

    // Закрытие меню при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            contextMenu.style.display = 'none';
        }
    });
}

// Обновляем функцию showReplyPreview
function showReplyPreview(messageText) {
    const replyPreview = document.getElementById('replyPreview');
    if (!replyPreview) {
        console.error('Элемент предпросмотра ответа не найден');
        return;
    }

    replyPreview.style.display = 'block';
    replyToMessageId = selectedMessageId;

    // Обрезаем текст, если он слишком длинный
    const maxLength = 50;
    const displayText = messageText.length > maxLength 
        ? messageText.substring(0, maxLength) + '...' 
        : messageText;

    replyPreview.innerHTML = `
        <div class="reply-text">
            <i class="fas fa-reply"></i>
            Ответ на: ${displayText}
        </div>
        <button class="close-reply" onclick="cancelReply()">
            <i class="fas fa-times"></i>
        </button>
    `;
}

// Обновляем функцию cancelReply
function cancelReply() {
    const replyPreview = document.getElementById('replyPreview');
    if (replyPreview) {
        replyPreview.style.display = 'none';
        replyPreview.innerHTML = '';
    }
    replyToMessageId = null;
}

// Добавляем обработчик видимости страницы
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentChatPartner) {
        loadMessages(currentChatPartner.id);
    }
});

// Функция проверки прокрутки до конца
function isScrolledToBottom(element) {
    if (!element) return false;
    return Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 1;
}

// Функция обновления сообщений
function startMessageUpdates() {
    if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
    }
    
    // Первая загрузка
    loadMessages(currentChatPartner.id);
    
    // Устанавливаем интервал обновления
    messageUpdateInterval = setInterval(() => {
        if (currentChatPartner && document.visibilityState === 'visible') {
            loadMessages(currentChatPartner.id);
        }
    }, 3000);
}