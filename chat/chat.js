// Настройка marked в начале файла
marked.setOptions({
    breaks: true, // Переносы строк
    gfm: true, // GitHub Flavored Markdown
    headerIds: false, // Отключаем ID для заголовков
    mangle: false, // Отключаем экранирование email
    sanitize: false, // Отключаем встроенную санитизацию, так как используем DOMPurify
});

document.addEventListener('DOMContentLoaded', () => {
    // Добавляем стили для ответов
    const style = document.createElement('style');
    style.textContent = `
        .message-reply {
            display: flex !important;
            flex-direction: column;
            background: rgba(var(--primary-color-rgb), 0.08);
            border-radius: 8px;
            margin-bottom: 8px;
            padding: 8px 12px;
            animation: replyAppear 0.2s ease-out;
        }
        
        .reply-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--primary-color);
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .reply-content {
            color: var(--text-secondary);
            font-size: 13px;
            padding-left: 20px;
            border-left: 2px solid var(--primary-color);
        }
    `;
    document.head.appendChild(style);
});

let currentChatPartner = null;
let currentUser = null;
let messageUpdateInterval = null;
let selectedFile = null;
let typingTimeout = null;
let selectedMessageId = null;
let selectedMessageText = '';
let replyToMessageId = null;
let replyToMessageText = null;
let replyToMessageAuthor = null;

// Добавляем переменную для хранения предыдущего состояния чатов
let previousChatsState = new Map();

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
    
    // Запускаем периодическ��е обновление списка чатов
    setInterval(loadChatsList, 10000); // Обновляем каждые 10 секунд
});

// Функция для загрузки информции о пользователе
async function loadUserInfo(userId) {
    try {
        const response = await fetch(`https://adminflow.ru/api/users/${userId}?currentUserId=${currentUser.id}`);
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
        const response = await fetch(`https://adminflow.ru/api/messages/history/${currentUser.id}/${currentChatPartner.id}`);
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
                displayNewMessages(newMessages, true);
                if (window.scrollManager) {
                    window.scrollManager.checkScroll();
                }
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

    // Прокручиваем к последнему сообщению
    scrollToBottom();
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
            scrollManager?.scrollToBottom();
        });
    }
    
    // Проверяем необходимость показа кнопки
    scrollManager?.checkScroll();
}


function createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
    messageElement.dataset.messageId = message.id;

    // Добавляем информацию об отправителе для полученных сообщений
    if (message.sender_id !== currentUser.id) {
        const senderInfo = document.createElement('div');
        senderInfo.className = 'message-sender';
        senderInfo.textContent = message.sender_username || 'Пользователь';
        messageElement.appendChild(senderInfo);
    }

    // Если это голосовое сообщение
    if (message.message_type === 'voice') {
        const voiceContainer = document.createElement('div');
        voiceContainer.className = 'voice-message';

        // Создаем кнопку воспроизведения
        const playButton = document.createElement('button');
        playButton.className = 'voice-message-play';
        playButton.innerHTML = '<i class="fas fa-play"></i>';

        // Создаем визуализацию волны
        const waveform = document.createElement('div');
        waveform.className = 'voice-message-waveform';
        
        // Добавляем прогресс-бар
        const progress = document.createElement('div');
        progress.className = 'voice-message-progress';
        waveform.appendChild(progress);

        // Добавляем время
        const timeSpan = document.createElement('span');
        timeSpan.className = 'voice-message-time';
        timeSpan.textContent = '00:00';

        // Собираем все элементы
        voiceContainer.appendChild(playButton);
        voiceContainer.appendChild(waveform);
        voiceContainer.appendChild(timeSpan);
        messageElement.appendChild(voiceContainer);

        // Добавляем обработчик воспроизведения
        let audio = null;
        playButton.addEventListener('click', async () => {
            try {
                if (audio && !audio.paused) {
                    audio.pause();
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    return;
                }

                playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                const response = await fetch(`https://adminflow.ru/api/messages/voice/${message.id}`);
                if (!response.ok) throw new Error('Ошибка загрузки аудио');
                
                const blob = await response.blob();
                audio = new Audio(URL.createObjectURL(blob));
                
                audio.onplay = () => {
                    playButton.innerHTML = '<i class="fas fa-pause"></i>';
                };
                
                audio.onpause = () => {
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                };
                
                audio.onended = () => {
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    progress.style.width = '0%';
                };

                audio.ontimeupdate = () => {
                    const percent = (audio.currentTime / audio.duration) * 100;
                    progress.style.width = `${percent}%`;
                    timeSpan.textContent = formatTime(Math.floor(audio.currentTime));
                };

                audio.onloadedmetadata = () => {
                    timeSpan.textContent = formatTime(Math.floor(audio.duration));
                };

                await audio.play();

            } catch (error) {
                console.error('Ошибка воспроизведения:', error);
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                alert('Не удалось воспроизвести сообщение');
            }
        });
    } 
    // Если это обычное сообщение с файлом
    else if (message.attachment_url) {
        const fileContainer = document.createElement('div');
        fileContainer.className = 'file-container';
        
        const fileName = message.attachment_url.split('-').slice(2).join('-');
        const fileIcon = getFileIcon(null, fileName);
        
        fileContainer.innerHTML = `
            <i class="fas ${fileIcon} file-icon"></i>
            <div class="file-info">
                <div class="file-name">${fileName}</div>
                <a href="https://adminflow.ru/uploads/messages/${message.attachment_url}" 
                   class="file-download" 
                   target="_blank" 
                   download="${fileName}">
                    <i class="fas fa-download"></i>
                    Скачать
                </a>
            </div>
        `;
        
        messageElement.appendChild(fileContainer);
    }
    // Если есть текст сообщения
    if (message.message && message.message.trim()) {
        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.innerHTML = DOMPurify.sanitize(marked.parse(message.message));
        messageElement.appendChild(textElement);
    }

    // Добавляем время отправки
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date(message.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    messageElement.appendChild(timestamp);

    return messageElement;
}

// Функция форматирования времени для аудио
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function createAttachmentElement(message) {
    const attachmentElement = document.createElement('div');
    attachmentElement.className = 'message-attachment';

    if (!message.attachment_url) return attachmentElement;

    const fileUrl = `https://adminflow.ru${message.attachment_url}`;
    const fileName = message.attachment_name || message.attachment_url.split('/').pop();
    const fileType = message.attachment_type || '';

    // Определяем тип файла
    if (fileType.startsWith('image/')) {
        // Для изображений
        const img = document.createElement('img');
        img.src = fileUrl;
        img.alt = fileName;
        img.onclick = () => showImageModal(fileUrl);
        attachmentElement.appendChild(img);
    } else {
        // Для всех остальных файлов
        const fileContainer = document.createElement('div');
        fileContainer.className = 'file-container';

        // Выбираем иконку в зависимости от типа файла
        let iconClass = 'fa-file';
        if (fileType.includes('pdf')) iconClass = 'fa-file-pdf';
        else if (fileType.includes('word') || fileType.includes('document')) iconClass = 'fa-file-word';
        else if (fileType.includes('excel') || fileType.includes('sheet')) iconClass = 'fa-file-excel';
        else if (fileType.includes('video')) iconClass = 'fa-file-video';
        else if (fileType.includes('audio')) iconClass = 'fa-file-audio';
        else if (fileType.includes('zip') || fileType.includes('rar')) iconClass = 'fa-file-archive';
        else if (fileType.includes('code') || fileType.includes('text')) iconClass = 'fa-file-code';

        fileContainer.innerHTML = `
            <div class="file-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="file-info">
                <span class="file-name">${fileName}</span>
                <a href="${fileUrl}" class="file-download" download="${fileName}">
                    <i class="fas fa-download"></i> Скачать
                </a>
            </div>
        `;
        
        attachmentElement.appendChild(fileContainer);
    }

    return attachmentElement;
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    
    if (!messageInput || !currentChatPartner) {
        console.error('messageInput не найден или нет получателя');
        return;
    }

    const messageText = messageInput.value.trim();
    if (!messageText) {
        return;
    }

    try {
        // Немедленно очищаем значение
        messageInput.value = '';
        
        const response = await fetch('https://adminflow.ru/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                senderId: currentUser.id,
                receiverId: currentChatPartner.id,
                message: messageText,
                replyToMessageId: replyToMessageId || null
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.details || responseData.error || 'Ошибка при отправке сообщения');
        }

        if (responseData.success) {
            if (replyToMessageId) {
                cancelReply();
            }
            
            const messageElement = createMessageElement(responseData.message);
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.appendChild(messageElement);
                scrollToBottom();
            }
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert(`Не удалось отправить сообщение: ${error.message}`);
    }
}

async function markMessagesAsRead(friendId) {
    if (!friendId) {
        console.error('FriendId is undefined');
        return;
    }

    try {
        const response = await fetch(`https://adminflow.ru/api/messages/mark-as-read`, {
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
            // Обновляем счетчик олько если успешно обновили статус
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
    
    // Удаляем старые обработчики
    if(sendButton) {
        sendButton.removeEventListener('click', handleSendMessage);
        sendButton.addEventListener('click', handleSendMessage);
    }
    
    if(messageInput) {
        messageInput.removeEventListener('keypress', handleEnterPress);
        messageInput.addEventListener('keypress', handleEnterPress);
        
        // Обработчик набора текста
        messageInput.addEventListener('input', () => {
            if (typingTimeout) clearTimeout(typingTimeout);
            
            // Отправляем статус "печатает"
            fetch('https://adminflow.ru/api/messages/typing', {
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
                fetch('https://adminflow.ru/api/messages/typing', {
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

// Выносим логику отправки в отдельную функцию
async function handleSendMessage() {
    const messageInput = document.getElementById('messageInput');
    
    if (!messageInput || !currentChatPartner) {
        return;
    }

    const messageText = messageInput.value.trim();
    if (!messageText) {
        return;
    }

    try {
        messageInput.value = ''; // Очищаем поле сразу
        
        const response = await fetch('https://adminflow.ru/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                senderId: currentUser.id,
                receiverId: currentChatPartner.id,
                message: messageText,
                replyToMessageId: replyToMessageId || null
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.details || responseData.error || 'Ошибка при отправке сообщения');
        }

        if (responseData.success) {
            if (replyToMessageId) {
                cancelReply();
            }
            
            const messageElement = createMessageElement(responseData.message);
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.appendChild(messageElement);
                scrollToBottom();
            }
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert(`Не удалось отправить сообщение: ${error.message}`);
    }
}

// Обработчик нажатия Enter
function handleEnterPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
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
        const response = await fetch(`https://adminflow.ru/api/messages/history/${currentUser.id}/${friendId}`);
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
                // Добавляем только новые соо��щения
                newMessages.forEach(message => {
                    const messageElement = createMessageElement(message);
                    messagesContainer.appendChild(messageElement);
                });
                
                // Прокручиваем вниз только если были в нижней позиции
                if (isAtBottom) {
                    scrollToBottom();
                }
            }
            
            // Обновляем статусы уществующих сообщений
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

// Улучшенная функция прокрутки
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        // Используем requestAnimationFrame для гарантированной прокрутки после рендернга
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
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
        alert('Ошибка при загрузк изображения');
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
    const sendButton = document.getElementById('sendMessage');
    
    if (!attachButton || !fileInput || !sendButton) {
        console.error('Элементы прикрепления файлов не найдены');
        return;
    }
    
    attachButton.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) { // 50MB
                alert('Файл слишком большой (максимум 50MB)');
                fileInput.value = '';
                return;
            }
            selectedFile = file;
            showFilePreview(file);
        }
    });

    // Обновляем обработчик отправки сообщения
    sendButton.addEventListener('click', async () => {
        if (selectedFile) {
            await sendMessageWithFile(selectedFile);
        } else {
            // Обычная отправка сообщения
            await sendMessage();
        }
    });
}

// Обновляем функцию для отправки сообщения с файлом
async function sendMessageWithFile(file) {
    try {
        const messageInput = document.getElementById('messageInput');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderId', currentUser.id);
        formData.append('receiverId', currentChatPartner.id);
        formData.append('message', messageInput.value.trim());

        const response = await fetch('https://adminflow.ru/api/messages/send-with-file', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка при отправке файла');
        }

        const data = await response.json();
        
        if (data.success) {
            messageInput.value = '';
            document.getElementById('filePreview').innerHTML = '';
            selectedFile = null;
            
            const messageElement = createMessageElement(data.message);
            const messagesContainer = document.getElementById('messages');
            messagesContainer.appendChild(messageElement);
            scrollToBottom();
        } else {
            throw new Error(data.error || 'Ошибка при отправке файла');
        }
    } catch (error) {
        console.error('Ошибка при отправке файла:', error);
        alert('Не удалось отправить файл: ' + error.message);
    }
}

// Обновляем функцию для показа превью файла
function showFilePreview(file) {
    const previewContainer = document.getElementById('filePreview');
    const extension = file.name.split('.').pop().toLowerCase();
    const fileIcon = getFileIcon(file.type, file.name);
    
    previewContainer.innerHTML = `
        <div class="file-preview">
            <i class="fas ${fileIcon} file-icon"></i>
            <div class="file-preview-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <button class="remove-file" onclick="removeSelectedFile()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Добавляем функцию для удаления выбранного файла
function removeSelectedFile() {
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('filePreview');
    
    fileInput.value = '';
    previewContainer.innerHTML = '';
    selectedFile = null;
}

// Функция удаления сообщения
async function deleteMessage(messageId) {
    if (!messageId) {
        console.error('ID сообщения не указан');
        return;
    }

    try {
        // Находм собщение в DOM до его удаления
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

        const response = await fetch(`https://adminflow.ru/api/messages/delete/${messageId}`, {
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
            alert(data.error || 'Не удалось удлить сообщение');
        }
    } catch (error) {
        console.error('Ошибка при удалении сообщения:', error);
        alert('Произошла ошибка при удалении сообщения');
    }
}

// Добавляем се необходимые стили
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
        
        // Ищем ближайший элемент сообщения о места клика
        const messageElement = e.target.closest('.message');
        if (messageElement) {
            // Получаем текст сообщения (может быть в .message-text или в атрибуте alt избражения)
            const messageTextElement = messageElement.querySelector('.message-text');
            const messageImage = messageElement.querySelector('.message-attachment img');
            
            selectedMessageId = messageElement.dataset.messageId;
            selectedMessageText = messageTextElement ? messageTextElement.textContent : 
                                (messageImage ? 'Изображение' : 'Вложениие');
            
            // Проверяем, является ли сообщение наим
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

            // Получаем рамеры меню и окна
            const menuRect = contextMenu.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Проверяем и корректируем позицию по горизонтали
            if (x + menuRect.width > windowWidth) {
                contextMenu.style.left = `${x - menuRect.width}px`;
            } else {
                contextMenu.style.left = `${x}px`;
            }

            // Проверем и крректируем позицию по вертикали
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

    // Закрытие меню при клике вне его
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

    // создаем элемент предпросмотра
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

    // Очищаем и показываем прдпросмотр
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

// Добвляем обработчик видиости страницы
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
    
    // Первая загрука
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

// Функция загрузки списка чатов с защитой от дёрганья
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 2000; // Минимальный интервал между обновлениями

async function loadChatsList() {
    try {
        const now = Date.now();
        if (now - lastUpdateTime < UPDATE_INTERVAL) {
            return;
        }
        lastUpdateTime = now;

        const response = await fetch(`https://adminflow.ru/api/chats/${currentUser.id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            }
        });
        const data = await response.json();

        if (!data.success) return;

        const friendsList = document.getElementById('friends-list');
        if (!friendsList) return;

        data.chats.forEach(chat => {
            const chatId = chat.id.toString();
            const existingElement = friendsList.querySelector(`.chat-partner[data-friend-id="${chatId}"]`);
            
            if (existingElement) {
                // Обновляем только содержимое существующего элемента
                updateExistingChatElement(existingElement, chat);
            } else {
                // Добавляем новый элемент только если его нет
                const chatElement = createChatElement(chat);
                friendsList.appendChild(chatElement);
            }
        });

        // Удаляем чаты, которых больше нет в списке
        const currentChatIds = new Set(data.chats.map(chat => chat.id.toString()));
        friendsList.querySelectorAll('.chat-partner').forEach(el => {
            if (!currentChatIds.has(el.dataset.friendId)) {
                el.remove();
            }
        });

    } catch (error) {
        console.error('Ошибка при загрузке списка чатов:', error);
    }
}

function updateExistingChatElement(element, chat) {
    // Обновляем только текстовое содержимое и классы, не трогая структуру DOM
    const lastMessageEl = element.querySelector('.chat-last-message');
    const unreadCountEl = element.querySelector('.unread-count');
    const statusIndicator = element.querySelector('.status-indicator');
    const avatarImg = element.querySelector('.chat-avatar');

    // Обновляем последнее сообщение
    if (lastMessageEl) {
        const newMessageText = formatLastMessage(chat);
        if (lastMessageEl.textContent !== newMessageText) {
            lastMessageEl.textContent = newMessageText;
        }
    }

    // Обновляем счетчик непрочитанных
    if (chat.unread_count > 0) {
        if (!unreadCountEl) {
            const span = document.createElement('span');
            span.className = 'unread-count';
            span.textContent = chat.unread_count;
            element.appendChild(span);
        } else {
            unreadCountEl.textContent = chat.unread_count;
        }
    } else if (unreadCountEl) {
        unreadCountEl.remove();
    }

    // Обновляем статус онлайн
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${chat.is_online ? 'online' : 'offline'}`;
    }

    // Обновляем аватар только если изменился
    if (avatarImg && avatarImg.src !== chat.avatar_url) {
        avatarImg.src = chat.avatar_url || '../uploads/avatars/default.png';
    }

    // Обновляем активный статус
    if (currentChatPartner?.id === chat.id) {
        element.classList.add('active');
    } else {
        element.classList.remove('active');
    }
}

function createChatElement(chat) {
    const chatElement = document.createElement('div');
    chatElement.className = `chat-partner ${currentChatPartner?.id === chat.id ? 'active' : ''}`;
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
                ${formatLastMessage(chat)}
            </div>
        </div>
        ${chat.unread_count > 0 ? 
            `<span class="unread-count">${chat.unread_count}</span>` : 
            ''}
    `;

    chatElement.addEventListener('click', (e) => {
        e.preventDefault();
        selectChat(chat);
    });

    return chatElement;
}

function formatLastMessage(chat) {
    if (!chat.last_message) return 'Нет сообщений';
    
    const messageText = chat.last_message.length > 25 
        ? chat.last_message.substring(0, 25) + '...' 
        : chat.last_message;
        
    return chat.is_own_message ? `Вы: ${messageText}` : messageText;
}

// Функция выбора чата
async function selectChat(chat) {
    try {
        if (!chat || !chat.id) {
            console.error('Некорректные данные чата');
            return;
        }

        // Убираем активный класс у предыдущего чата
        const previousActive = document.querySelector('.chat-partner.active');
        if (previousActive) {
            previousActive.classList.remove('active');
        }

        // Добавляем активный класс новому чату
        const newActive = document.querySelector(`.chat-partner[data-friend-id="${chat.id}"]`);
        if (newActive) {
            newActive.classList.add('active');
        }

        // Очищаем предыдущие сообщения
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }

        // Останавливаем прдыдущие обновления
        if (messageUpdateInterval) {
            clearInterval(messageUpdateInterval);
        }

        currentChatPartner = chat;
        
        // Обновляем UI
        const chatPlaceholder = document.getElementById('chat-placeholder');
        const chatHeader = document.getElementById('chat-header');
        const messages = document.getElementById('messages');
        const chatHeaderAvatar = document.getElementById('chat-header-avatar');
        const chatHeaderName = document.getElementById('chat-header-name');
        const chatHeaderStatus = document.getElementById('chat-header-status');

        if (chatPlaceholder) chatPlaceholder.style.display = 'none';
        if (chatHeader) chatHeader.style.display = 'flex';
        if (messages) {
            messages.style.display = 'flex';
            messages.scrollTop = messages.scrollHeight;
        }
        
        // Обновляем заголовок чата
        if (chatHeaderAvatar) {
            chatHeaderAvatar.src = chat.avatar_url || '../uploads/avatars/default.png';
            chatHeaderAvatar.onerror = () => {
                chatHeaderAvatar.src = '../uploads/avatars/default.png';
            };
        }
        if (chatHeaderName) chatHeaderName.textContent = chat.username;
        if (chatHeaderStatus) {
            chatHeaderStatus.className = `user-status ${chat.is_online ? 'online' : ''}`;
            chatHeaderStatus.textContent = chat.is_online ? 'онлайн' : getLastActivityTime(chat.last_activity);
        }
        
        // Загружаем историю сообщений
        await loadChatHistory();
        if (window.scrollManager) {
            window.scrollManager.checkScroll();
        }
        
        // Запускаем обновление сообщений с небольшой задержкой
        setTimeout(() => {
            startMessageUpdates();
        }, 500);
        
        // Помечаем сообщения как прочитанные
        await markMessagesAsRead(chat.id);

    } catch (error) {
        console.error('Ошибка при выборе чата:', error);
    }
}

// Функция получения времени последней активност пользователя
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
    const response = await fetch(`https://adminflow.ru/api/chats/${currentUser.id}`);
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

function setupReplyFunctionality() {
    // Обработчик клика по сообщению-ответу
    document.getElementById('messages').addEventListener('click', (e) => {
        const replyElement = e.target.closest('.message-reply');
        if (replyElement) {
            const messageId = replyElement.dataset.replyToMessageId;
            if (messageId) {
                scrollToMessage(messageId);
            }
        }
    });
}

function scrollToMessage(messageId) {
    const message = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (message) {
        message.scrollIntoView({ behavior: 'smooth', block: 'center' });
        message.classList.add('highlight');
        setTimeout(() => message.classList.remove('highlight'), 2000);
    }
}

function setReplyTo(messageId, messageText, authorName) {
    replyToMessageId = messageId;
    replyToMessageText = messageText;
    replyToMessageAuthor = authorName;

    const replyPreview = document.getElementById('replyPreview');
    replyPreview.innerHTML = `
        <div class="reply-preview-content">
            <div class="reply-text">
                <span class="reply-author">${authorName}</span>
                <span class="reply-message">${messageText}</span>
            </div>
            <button class="close-reply" onclick="cancelReply()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    replyPreview.style.display = 'block';
}

function cancelReply() {
    replyToMessageId = null;
    replyToMessageText = null;
    replyToMessageAuthor = null;
    document.getElementById('replyPreview').style.display = 'none';
}

// Обновляем функцию sendMessage для поддержки ответов
async function sendMessage() {
    // ... existing code ...

    const messageData = {
        senderId: currentUser.id,
        receiverId: currentChatPartner.id,
        message: messageInput.value.trim(),
        replyToMessageId: replyToMessageId
    };

    try {
        const response = await fetch('https://adminflow.ru/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(messageData)
        });

        // ... rest of the existing code ...

        if (replyToMessageId) {
            cancelReply();
        }
    } catch (error) {
        // ... error handling ...
    }
}

// Добавляем обработчик контекстного меню
document.getElementById('replyMessageBtn').addEventListener('click', () => {
    const messageElement = document.querySelector(`.message[data-message-id="${selectedMessageId}"]`);
    if (messageElement) {
        const messageText = messageElement.querySelector('.message-text')?.textContent;
        const authorName = messageElement.classList.contains('message-sent') ? 'Вы' : currentChatPartner.username;
        setReplyTo(selectedMessageId, messageText, authorName);
    }
    hideContextMenu();
});

// Инициализация
setupReplyFunctionality();

// Добавляем подсказку дл Markdown в placeholder
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.placeholder = 'Сообщение... (*курсив*, **жирный**, `код`, ```блок кода```, > цитата)';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Добавляем прямой обработчик для кнопки отправк
    const sendButton = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');

    if (sendButton) {
        sendButton.onclick = async () => {
            if (!messageInput || !currentChatPartner) {
                return;
            }

            const messageText = messageInput.value.trim();
            if (!messageText) {
                return;
            }

            try {
                messageInput.value = ''; // Очищаем поле сразу
                
                const response = await fetch('https://adminflow.ru/api/messages/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        senderId: currentUser.id,
                        receiverId: currentChatPartner.id,
                        message: messageText,
                        replyToMessageId: replyToMessageId || null
                    })
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.details || responseData.error || 'Ошибка при отправке сообщения');
                }

                if (responseData.success) {
                    if (replyToMessageId) {
                        cancelReply();
                    }
                    
                    const messageElement = createMessageElement(responseData.message);
                    const messagesContainer = document.getElementById('messages');
                    if (messagesContainer) {
                        messagesContainer.appendChild(messageElement);
                        scrollToBottom();
                    }
                }
            } catch (error) {
                console.error('Ошибка при отправке сообщения:', error);
                alert(`Не удалось отправить сообщение: ${error.message}`);
            }
        };
    }

    // Добавляем обработчик для клавиши Enter
    if (messageInput) {
        messageInput.onkeypress = async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
        };
    }
});

// Socket.IO
const socket = io('https://adminflow.ru', {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    withCredentials: true,
    secure: true,
    rejectUnauthorized: false
});

// Обработчики Socket.IO событий
socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
    
    // Отправляем ID пользователя после подключения
    if (currentUser) {
        socket.emit('user_connected', { userId: currentUser.id });
    }
});

socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO server');
});

socket.on('new_message', (message) => {
    if (currentChatPartner && 
        (message.sender_id === currentChatPartner.id || 
         message.receiver_id === currentChatPartner.id)) {
        const messageElement = createMessageElement(message);
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.appendChild(messageElement);
            if (isScrolledToBottom(messagesContainer)) {
                scrollToBottom();
            }
        }
        // Помечаем сообщение как прочитанное, если оно для текущего чата
        if (message.sender_id === currentChatPartner.id) {
            markMessagesAsRead(currentChatPartner.id);
        }
    }
    // Обновляем список чатов для отображения последнего сообщения
    loadChatsList();
});

socket.on('user_status_changed', ({ userId, isOnline, lastActivity }) => {
    updateUserStatus(userId, isOnline, lastActivity);
});

socket.on('typing_status', ({ userId, isTyping }) => {
    if (currentChatPartner && userId === currentChatPartner.id) {
        const statusElement = document.getElementById('chat-header-status');
        if (statusElement) {
            if (isTyping) {
                statusElement.textContent = 'печатает...';
                statusElement.classList.add('typing');
            } else {
                statusElement.textContent = currentChatPartner.is_online ? 'онлайн' : 
                    getLastActivityTime(currentChatPartner.last_activity);
                statusElement.classList.remove('typing');
            }
        }
    }
});

function getFileIcon(fileType, fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
        // Документы
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        'txt': 'fa-file-lines',
        
        // Архивы
        'zip': 'fa-file-zipper',
        'rar': 'fa-file-zipper',
        '7z': 'fa-file-zipper',
        'tar': 'fa-file-zipper',
        'gz': 'fa-file-zipper',
        
        // Изображения
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image',
        'gif': 'fa-file-image',
        
        // Аудио/Видео
        'mp3': 'fa-file-audio',
        'wav': 'fa-file-audio',
        'mp4': 'fa-file-video',
        'avi': 'fa-file-video',
        
        // Код
        'js': 'fa-file-code',
        'py': 'fa-file-code',
        'html': 'fa-file-code',
        'css': 'fa-file-code',
    };
    
    return iconMap[extension] || 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}