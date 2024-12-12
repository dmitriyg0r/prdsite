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

    // Загружаем список чатов
    await loadChatsList();
    
    // Запускаем периодическое обновление списка чатов
    setInterval(loadChatsList, 10000); // Обновляем каждые 10 секунд
});

// Функция для загрузки информации о пользователе
async function loadUserInfo(userId) {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/users/${userId}?currentUserId=${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Пользователь не найден');
        }
        const data = await response.json();
        return data.user;
    } catch (err) {
        console.error('Error loading user info:', err);
        throw err;
    }
}

// Инициализация чата
async function initializeChat() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const chatUserId = urlParams.get('userId');
        
        if (chatUserId) {
            const userInfo = await loadUserInfo(chatUserId);
            if (userInfo) {
                currentChatPartner = userInfo;
                updateChatHeader(userInfo);
                await loadChatHistory();
                startMessageUpdates();
                await markMessagesAsRead(chatUserId);
            }
        }
        
    } catch (err) {
        console.error('Error initializing chat:', err);
        alert('Ошибка при инициализации чата');
    }
}

// Добавляем функцию обновления заголовка чата
function updateChatHeader(userInfo) {
    const headerName = document.querySelector('.chat-header .user-name');
    const headerAvatar = document.querySelector('.chat-header .user-avatar');
    
    if (headerName) {
        headerName.textContent = userInfo.username;
    }
    
    if (headerAvatar) {
        headerAvatar.src = userInfo.avatar_url || '/uploads/avatars/default.png';
        headerAvatar.alt = userInfo.username;
    }
}

async function loadChatHistory() {
    if (!currentChatPartner) return;

    try {
        const response = await fetch(`https://adminflow.ru:5003/api/messages/history/${currentUser.id}/${currentChatPartner.id}`);
        const data = await response.json();

        if (data.success) {
             const messagesContainer = document.getElementById('messages');
             if (!messagesContainer) {
                 console.error('Messages container not found');
                 return;
             }

            // Оптимизация проверки новых сообщений
            const currentMessageIds = new Set(
                Array.from(messagesContainer.querySelectorAll('.message'))
                    .map(el => el.dataset.messageId)
            );
            
            // Фильтрация только новых сообщений
            const newMessages = data.messages.filter(message => 
                !currentMessageIds.has(message.id.toString())
            );
            
           if (newMessages.length > 0) {
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
     if (!messagesContainer) {
         console.error('Messages container not found');
         return;
    }
    while(messagesContainer.firstChild) {
        messagesContainer.removeChild(messagesContainer.firstChild);
    }
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messageElement.dataset.messageId = message.id;
        messagesContainer.appendChild(messageElement);
    });
}

function displayNewMessages(newMessages, shouldScroll) {
     const messagesContainer = document.getElementById('messages');
     if (!messagesContainer) {
         console.error('Messages container not found');
         return;
    }
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
    
    // Очищаем и нормализуем путь к файлу
    let fullUrl = attachmentUrl;
    
    // Удаляем дублирование пути
    if (attachmentUrl.includes('/uploads/messages')) {
        fullUrl = `https://adminflow.ru:5003${attachmentUrl}`;
    } else {
        fullUrl = `https://adminflow.ru:5003/uploads/messages/${attachmentUrl}`;
    }
    
    // Удаляем возможные двойные слеши
    fullUrl = fullUrl.replace(/([^:]\/)\/+/g, '$1');
    
    try{
     fullUrl = new URL(fullUrl).href
    } catch(e){
        console.error('Error while processing url', fullUrl, e)
    }


    console.log('Оработанный URL вложения:', fullUrl); // Для отладки

    if (isImageFile(attachmentUrl)) {
        const img = document.createElement('img');
        img.src = fullUrl;
        img.alt = 'Изображение';
        img.onerror = () => {
            console.error('Ошибка загрузки изображения:', fullUrl);
            img.src = '../uploads/avatars/default.png'; // Заглушка при ошибке
        };
        img.onload = () => {
            console.log('Изображение успешно загружено:', fullUrl);
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


async function sendMessage() {
    if (!currentChatPartner || (!messageInput.value.trim() && !selectedFile)) {
        return;
    }
    const messageInput = document.getElementById('messageInput');
    try {
        const formData = new FormData();
        formData.append('senderId', currentUser.id);
        formData.append('receiverId', currentChatPartner.id);
        formData.append('message', messageInput.value.trim());
        
        if (selectedFile) {
            formData.append('file', selectedFile);
        }

        if (replyToMessageId) {
            formData.append('replyToMessageId', replyToMessageId);
        }

        const response = await fetch('https://adminflow.ru:5003/api/messages/send-with-file', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            messageInput.value = '';
            selectedFile = null;
            removeFilePreview();
            cancelReply();
            
            const messageElement = createMessageElement(data.message);
            document.getElementById('messages').appendChild(messageElement);
            scrollToBottom();
        } else {
            console.error('Ошибка при отправке сообщения:', data.error);
            alert('Ошибка при отправке сообщения');
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert('Ошибка при отправке сообщений');
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
    const sendButton = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');
    
   
    if(sendButton) sendButton.removeEventListener('click', sendMessage);
    if(messageInput) messageInput.removeEventListener('keypress', handleEnterPress);
  
    if (sendButton)  sendButton.addEventListener('click', sendMessage);
    if (messageInput) messageInput.addEventListener('keypress', handleEnterPress);

    if(messageInput){
        messageInput.addEventListener('input', () => {
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


// Функция показа модального окна с изображением
function showImageModal(imageUrl) {
    const modal = document.querySelector('.image-modal');
    const modalImage = document.getElementById('modalImage');
    
    // Показываем индикатор загрузки
    modalImage.style.opacity = '0.5';
    if(modal) modal.style.display = 'flex';
    
    // Загружаем изображение
    modalImage.onload = () => {
        modalImage.style.opacity = '1';
    };
    
    modalImage.onerror = () => {
        console.error('Ошибка загрузки изображения в модальном окне:', imageUrl);
        if(modal) modal.style.display = 'none';
        alert('Ошибка при загрузке изображения');
    };
    
    modalImage.src = imageUrl;
}

// Закрытие модального окна
const closeModalBtn = document.querySelector('.close-modal');
if(closeModalBtn){
    closeModalBtn.onclick = function() {
        document.querySelector('.image-modal').style.display = 'none';
    };
}

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
    
    // Есл контейнер не существует, создаем его
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
    while(previewContainer.firstChild) {
        previewContainer.removeChild(previewContainer.firstChild);
    }
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
        while(previewContainer.firstChild) {
        previewContainer.removeChild(previewContainer.firstChild);
    }
    }
    selectedFile = null;
    
    // Очищаем input файла
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Функция удаления сообщения
async function deleteMessage(messageId) {
    if (!messageId) {
        console.error('ID сообщения не указан');
        return;
    }

    try {
        // Находим сообщение в DOM до его удаления
        const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
        if (!messageElement) {
            console.error('Сообщение не найдено в DOM');
            return;
        }

        // Проверяем, есть ли вложение
        const attachmentElement = messageElement.querySelector('.message-attachment');
        let attachmentUrl = null;
        if (attachmentElement) {
            const imgElement = attachmentElement.querySelector('img');
            const fileLink = attachmentElement.querySelector('.file-name');
            attachmentUrl = imgElement ? imgElement.src : (fileLink ? fileLink.href : null);
        }

        const response = await fetch(`https://adminflow.ru:5003/api/messages/delete/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                userId: currentUser.id,
                attachmentUrl: attachmentUrl // Передаем URL вложения, если оно есть
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Добавляем анимацию удаления
            messageElement.style.animation = 'fadeOut 0.3s ease-out';
            messageElement.addEventListener('animationend', () => {
                messageElement.remove();
            });
        } else {
            console.error('Ошибка при удалении сообщения:', data.error);
            alert(data.error || 'Не удалось удалить сообщение');
        }
    } catch (error) {
        console.error('Ошибка при удалении сообщения:', error);
        alert('Произошла ошибка при удалении сообщения');
    }
}

// Добавляем все необходимые стили
const chatStyles = document.createElement('style');
chatStyles.textContent = `
    /* Анимация удаления сообщения */
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-20px);
        }
    }

    /* Стили контекстного меню */
    .context-menu {
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.1s ease, transform 0.1s ease;
        position: fixed;
        z-index: 1000;
        background-color: var(--text-container-background);
        border: 1px solid var(--border-color);
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }

    .context-menu-visible {
        opacity: 1;
        transform: scale(1);
    }

    /* Анимация появления предпросмотра ответа */
    .reply-preview {
        animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(chatStyles);

// Обновляем обработчики контекстного меню
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
        
        // Ищем ближайший элемент сообщения от места клика
        const messageElement = e.target.closest('.message');
        if (messageElement) {
            // Получаем текст сообщения (может быть в .message-text или в атрибуте alt изображения)
            const messageTextElement = messageElement.querySelector('.message-text');
            const messageImage = messageElement.querySelector('.message-attachment img');
            
            selectedMessageId = messageElement.dataset.messageId;
            selectedMessageText = messageTextElement ? messageTextElement.textContent : 
                                (messageImage ? 'Изображение' : 'Вложение');
            
            // Проверяем, является ли сообщение нашим
            const isSentMessage = messageElement.classList.contains('message-sent');
            const deleteButton = document.getElementById('deleteMessageBtn');
            
            // Показываем кнопку удаления только для наших сообщений
            if (deleteButton) {
                deleteButton.style.display = isSentMessage ? 'block' : 'none';
            }

            // Позиционруем меню
            const x = e.pageX;
            const y = e.pageY;
            
            // Показываем меню
            contextMenu.style.display = 'block';

            // Получаем размеры меню и окна
            const menuRect = contextMenu.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Проверяем и корректируем позицию по горизонтали
            if (x + menuRect.width > windowWidth) {
                contextMenu.style.left = `${x - menuRect.width}px`;
            } else {
                contextMenu.style.left = `${x}px`;
            }

            // Проверяем и корректируем позицию по вертикали
            if (y + menuRect.height > windowHeight) {
                contextMenu.style.top = `${y - menuRect.height}px`;
            } else {
                contextMenu.style.top = `${y}px`;
            }

            // Добавляем класс для анимации появления
            contextMenu.classList.add('context-menu-visible');
        }
    });

    // Обработчик для кнопки ответа
    const replyButton = document.getElementById('replyMessageBtn');
    if (replyButton) {
        replyButton.addEventListener('click', () => {
            if (selectedMessageId && selectedMessageText) {
                showReplyPreview(selectedMessageText);
                hideContextMenu();
            }
        });
    }

    // Обработчик для кнопки удаления
    const deleteButton = document.getElementById('deleteMessageBtn');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            if (selectedMessageId) {
                deleteMessage(selectedMessageId);
                hideContextMenu();
            }
        });
    }

    // Закрытие м��ню при клике вне его
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // Закрытие меню при скролле
    if(messagesArea) {
        messagesArea.addEventListener('scroll', () => {
            hideContextMenu();
        });
    }

    // Закрытие меню при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
        }
    });
}

// Функция скрытия контекстного меню
function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.classList.remove('context-menu-visible');
        contextMenu.style.display = 'none';
    }
}

// Функция показа предпросмотра ответа
function showReplyPreview(messageText) {
    const replyPreview = document.getElementById('replyPreview');
    if (!replyPreview) {
        console.error('Элемент предпросмотра ответа не найден');
        return;
    }

    // Сохраняем ID сообщения, на которое отвечаем
    replyToMessageId = selectedMessageId;

    // Обрезаем текст, если он слишком длинный
    const maxLength = 50;
    const displayText = messageText.length > maxLength 
        ? messageText.substring(0, maxLength) + '...' 
        : messageText;

    // Создаем элемент предпросмотра
    const previewContent = document.createElement('div');
    previewContent.className = 'reply-preview-content';
    previewContent.innerHTML = `
        <div class="reply-text">
            <i class="fas fa-reply"></i>
            <span>Ответ на: ${displayText}</span>
        </div>
        <button class="close-reply" onclick="cancelReply()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Очищаем и показываем предпросмотр
     while(replyPreview.firstChild) {
        replyPreview.removeChild(replyPreview.firstChild);
    }
    replyPreview.appendChild(previewContent);
    replyPreview.style.display = 'block';

    // Фокусируем поле ввода
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.focus();
    }
}

// Функция отмены ответа
function cancelReply() {
    const replyPreview = document.getElementById('replyPreview');
    if (replyPreview) {
        replyPreview.style.display = 'none';
       while(replyPreview.firstChild) {
            replyPreview.removeChild(replyPreview.firstChild);
        }
    }
    replyToMessageId = null;
}

// Добвляем обработчик видимости страницы
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
    if(currentChatPartner) loadMessages(currentChatPartner.id);
    
    // Устанавливаем интервал обновления
    messageUpdateInterval = setInterval(() => {
        if (currentChatPartner && document.visibilityState === 'visible') {
            loadMessages(currentChatPartner.id);
        }
    }, 3000);
}

// Функция обновления статуса пользователя
function updateUserStatus(userId, isOnline, lastActivity) {
    const userElement = document.querySelector(`.chat-partner[data-friend-id="${userId}"]`);
    
    if (userElement) {
        const statusIndicator = userElement.querySelector('.status-indicator');
        const lastActivityElement = userElement.querySelector('.last-activity');
        
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }
        if (lastActivityElement) {
            lastActivityElement.textContent = isOnline ? 'онлайн' : getLastActivityTime(lastActivity);
        }
    }
}

// Функция обновления последнего сообщения
function updateLastMessage(message) {
    const userId = message.sender_id === currentUser.id ? message.receiver_id : message.sender_id;
    const lastMessageElement = document.getElementById(`last-message-${userId}`);
    
    if (lastMessageElement) {
        const isOwnMessage = message.sender_id === currentUser.id;
        const messageText = message.message.length > 25 
            ? message.message.substring(0, 25) + '...' 
            : message.message;
        lastMessageElement.textContent = `${isOwnMessage ? 'Вы: ' : ''}${messageText}`;
    }
}

// Функция загрузки списка чатов
async function loadChatsList() {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/chats/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            const friendsList = document.getElementById('friends-list');
            if (!friendsList) {
                console.error('Friends list container not found');
                return;
            }
            while(friendsList.firstChild) {
                 friendsList.removeChild(friendsList.firstChild);
             }

            data.chats.forEach(chat => {
                const chatElement = document.createElement('div');
                chatElement.className = 'chat-partner';
                chatElement.dataset.friendId = chat.id;
                
                chatElement.innerHTML = `
                    <div class="avatar-container">
                        <img src="${chat.avatar_url || '../uploads/avatars/default.png'}" 
                             alt="${chat.username}" 
                             class="chat-avatar">
                        <span class="status-indicator ${chat.is_online ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="chat-info">
                        <div class="chat-name">${chat.username}</div>
                        <div class="chat-last-message" id="last-message-${chat.id}">
                            ${chat.last_message ? 
                                (chat.is_own_message ? 'Вы: ' : '') + 
                                (chat.last_message.length > 25 ? 
                                    chat.last_message.substring(0, 25) + '...' : 
                                    chat.last_message) : 
                                'Нет сообщений'}
                        </div>
                    </div>
                    ${chat.unread_count > 0 ? 
                        `<span class="unread-count">${chat.unread_count}</span>` : 
                        ''}
                `;

                // Добавляем обработчик клика
                chatElement.addEventListener('click', () => selectChat(chat));
                friendsList.appendChild(chatElement);
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке списка чатов:', error);
    }
}

// Функция выбора чата
async function selectChat(chat) {
    currentChatPartner = chat;
    
    // Обновляем UI
    const chatPlaceholder = document.getElementById('chat-placeholder');
    const chatHeader = document.getElementById('chat-header');
    const messages = document.getElementById('messages');
    const chatHeaderAvatar = document.getElementById('chat-header-avatar')
    const chatHeaderName = document.getElementById('chat-header-name')
    const chatHeaderStatus = document.getElementById('chat-header-status')

    if (chatPlaceholder) chatPlaceholder.style.display = 'none';
    if(chatHeader) chatHeader.style.display = 'flex';
    if (messages) messages.style.display = 'flex';
    
    // Обновляем заголовок чата
    if(chatHeaderAvatar) chatHeaderAvatar.src = chat.avatar_url || '../uploads/avatars/default.png';
    if(chatHeaderName) chatHeaderName.textContent = chat.username;
    if(chatHeaderStatus){
    chatHeaderStatus.className = 
        `user-status ${chat.is_online ? 'online' : ''}`;
    chatHeaderStatus.textContent = 
        chat.is_online ? 'онлайн' : getLastActivityTime(chat.last_activity);
    }
    
    // Загружаем историю сообщений
    await loadChatHistory();
    
    // Запускаем обновление сообщений
    startMessageUpdates();
    
    // Помечаем сообщения как прочитанные
    await markMessagesAsRead(chat.id);
}

// Функция получения времени последней активности пользователя
function getLastActivityTime(lastActivity) {
   if (!lastActivity) return 'неизвестно';
   
    const date = new Date(lastActivity);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
  
    if (diffInDays > 0) {
        return `${diffInDays} д. назад`;
    } else if (diffInHours > 0) {
        return `${diffInHours} ч. назад`;
    } else if (diffInMinutes > 0) {
        return `${diffInMinutes} мин. назад`;
    } else {
        return 'только что';
    }
}

// Функция для обновления счетчика непрочитанных сообщений
async function updateUnreadCount(friendId) {
  if(!friendId) return
  try {
    const response = await fetch(`https://adminflow.ru:5003/api/chats/${currentUser.id}`);
    const data = await response.json();
    if(data.success) {
          const chat = data.chats.find(chat => chat.id == friendId)
           if(chat){
              const unreadCountElement = document.querySelector(`.chat-partner[data-friend-id="${friendId}"] .unread-count`);
                if (unreadCountElement) {
                     unreadCountElement.textContent = chat.unread_count > 0 ? chat.unread_count : '';
                  unreadCountElement.style.display = chat.unread_count > 0 ? 'inline' : 'none';
                }
           }

    } else{
           console.error('Ошибка при загрузке списка чатов:', data.error)
       }
    } catch (error) {
        console.error('Ошибка при загрузке списка чатов:', error);
    }
}