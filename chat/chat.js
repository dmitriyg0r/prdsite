let currentChatPartner = null;
let currentUser = null;
let messageUpdateInterval = null;
let selectedFile = null;

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

    // Устанавливаем интервал обновления каждую секунду
    if (messageUpdateInterval) clearInterval(messageUpdateInterval);
    messageUpdateInterval = setInterval(loadChatHistory, 1000);
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
    messageElement.dataset.timestamp = message.created_at;

    // Добавляем информацию об отправителе для входящих сообщений
    if (message.sender_id !== currentUser.id) {
        const senderInfo = document.createElement('div');
        senderInfo.className = 'message-sender';
        senderInfo.textContent = message.sender_username;
        messageElement.appendChild(senderInfo);
    }

    // Если есть reply_data, показываем его
    if (message.reply_data) {
        const replyElement = document.createElement('div');
        replyElement.className = 'message-reply';
        replyElement.textContent = `↳ ${message.reply_data.message}`;
        messageElement.appendChild(replyElement);
    }

    // Основной текст сообщения
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.message;
    messageElement.appendChild(messageText);

    // Добавляем вложения, если есть
    if (message.attachment_url) {
        const attachmentElement = createAttachmentElement(message.attachment_url);
        messageElement.appendChild(attachmentElement);
    }

    // Время сообщения
    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    timeElement.textContent = new Date(message.created_at).toLocaleTimeString();
    messageElement.appendChild(timeElement);

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
        
        if (file) {
            // Проверка размера файла
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
    // Удаляем старые обработчики перед добавлением новых
    const sendButton = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');
    
    // Удаляем старые обработчики
    sendButton?.removeEventListener('click', sendMessage);
    messageInput?.removeEventListener('keypress', handleEnterPress);

    // Добавляем новые обработчики
    sendButton?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keypress', handleEnterPress);
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

        if (!data.success) {
            console.error('Error loading messages:', data.error);
            return;
        }

        displayMessages(data.messages);
        markMessagesAsRead(friendId);
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
        await fetch('https://adminflow.ru:5003/api/messages/read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });
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