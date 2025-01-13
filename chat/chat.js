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

    // Обработчик для кнопки возврата к списку чатов
    document.getElementById('backToChats').addEventListener('click', () => {
        document.querySelector('.chat-list').classList.add('active');
        if (window.innerWidth <= 768) {
            document.querySelector('.chat-area').style.display = 'none';
        }
    });

    // Обработчик выбора чата для мобильной версии
    document.querySelectorAll('.chat-partner').forEach(partner => {
        partner.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.querySelector('.chat-list').classList.remove('active');
                document.querySelector('.chat-area').style.display = 'flex';
            }
        });
    });
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
    
    // Запускаем периодическое обновление списка чатов
    setInterval(loadChatsList, 10000); // Обновляем каждые 10 секунд
});

// Функция для загрузки информции о пользователе
async function loadUserInfo(userId) {
    try {
        const response = await fetch(`https://space-point.ru/api/users/${userId}?currentUserId=${currentUser.id}`);
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
        const response = await fetch(`https://space-point.ru/api/messages/history/${currentUser.id}/${currentChatPartner.id}`);
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
        senderInfo.textContent = message.sender_name || 'Пользователь';
        messageElement.appendChild(senderInfo);
    }

    if (message.message_type === 'voice') {
        // Создаем голосовое сообщение
        const voiceContainer = document.createElement('div');
        voiceContainer.className = 'voice-message';
        
        const playButton = document.createElement('button');
        playButton.className = 'voice-message-play';
        playButton.innerHTML = '<i class="fas fa-play"></i>';

        const waveform = document.createElement('div');
        waveform.className = 'voice-message-waveform';
        
        const progress = document.createElement('div');
        progress.className = 'voice-message-progress';
        waveform.appendChild(progress);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'voice-message-time';
        timeSpan.textContent = '00:00';

        voiceContainer.appendChild(playButton);
        voiceContainer.appendChild(waveform);
        voiceContainer.appendChild(timeSpan);
        messageElement.appendChild(voiceContainer);

        // Обработчик воспроизведения
        let audio = null;
        playButton.addEventListener('click', async () => {
            try {
                if (audio && !audio.paused) {
                    audio.pause();
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    return;
                }

                playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                const response = await fetch(`https://space-point.ru/api/messages/voice/${message.id}`);
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
                    timeSpan.textContent = formatTime(audio.currentTime);
                };

                audio.onloadedmetadata = () => {
                    timeSpan.textContent = formatTime(audio.duration);
                };

                await audio.play();

            } catch (error) {
                console.error('Ошибка воспроизведения:', error);
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                alert('Не удалось воспроизвести сообщение');
            }
        });

        // Добавляем контекстное меню для голосовых сообщений
        if (message.sender_id === currentUser.id) {
            voiceContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, [
                    {
                        text: 'Удалить сообщение',
                        onClick: async () => {
                            try {
                                const response = await fetch(`https://space-point.ru/api/messages/${message.id}`, {
                                    method: 'DELETE'
                                });

                                if (response.ok) {
                                    messageElement.remove();
                                } else {
                                    throw new Error('Ошибка при удалении сообщения');
                                }
                            } catch (error) {
                                console.error('Ошибка:', error);
                                alert('Не удалось удалить сообщение');
                            }
                        }
                    }
                ]);
            });
        }
    } else {
        // Обработка текстовых сообщений
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Добавляем ответ на сообщение, если есть
        if (message.reply_to_message_id) {
            const replyContent = document.createElement('div');
            replyContent.className = 'message-reply';
            // Здесь нужно добавить логику получения текста сообщения, на которое отвечают
            messageContent.appendChild(replyContent);
        }

        // Создаем контейнер для текста сообщения
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        
        // Обрабатываем текст сообщения через marked и DOMPurify
        if (message.message) {
            const sanitizedHtml = DOMPurify.sanitize(marked.parse(message.message));
            messageText.innerHTML = sanitizedHtml;
        }

        messageContent.appendChild(messageText);
        messageElement.appendChild(messageContent);
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

// Вспомогательная функция для форматирования времени
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function createAttachmentElement(attachmentUrl) {
    const attachmentElement = document.createElement('div');
    attachmentElement.className = 'message-attachment';
    
    // Очищаем и нормализуем путь к файлу
    let fullUrl = attachmentUrl;
    
    // Удаляем дублирование ти
    if (attachmentUrl.includes('/uploads/messages')) {
        fullUrl = `https://space-point.ru${attachmentUrl}`;
    } else {
        fullUrl = `https://space-point.ru/uploads/messages/${attachmentUrl}`;
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
        
        const response = await fetch('https://space-point.ru/api/messages/send', {
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
        const response = await fetch(`https://space-point.ru/api/messages/mark-as-read`, {
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
            fetch('https://space-point.ru/api/messages/typing', {
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
                fetch('https://space-point.ru/api/messages/typing', {
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
        
        const response = await fetch('https://space-point.ru/api/messages/send', {
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
        const response = await fetch(`https://space-point.ru/api/messages/history/${currentUser.id}/${friendId}`);
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
    
     // чищаем предыдущее превью
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

        const response = await fetch(`https://space-point.ru/api/messages/delete/${messageId}`, {
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
        messageUpdateInterval = null;
    }
    
    // Первая загрузка только если чат активен
    if (currentChatPartner && document.visibilityState === 'visible') {
        loadMessages(currentChatPartner.id);
    }
    
    // Устанавливаем интервал с проверкой видимости
    messageUpdateInterval = setInterval(() => {
        if (!currentChatPartner || document.visibilityState !== 'visible') {
            clearInterval(messageUpdateInterval);
            messageUpdateInterval = null;
            return;
        }
        loadMessages(currentChatPartner.id);
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

        const response = await fetch(`https://space-point.ru/api/chats/${currentUser.id}`, {
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

        // Очищаем предыдущие обновления и ресурсы
        if (messageUpdateInterval) {
            clearInterval(messageUpdateInterval);
            messageUpdateInterval = null;
        }

        // Очищаем все аудио элементы
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            audio.pause();
            audio.src = '';
            audio.remove();
        });

        // Освобождаем память от URL объектов
        const audioBlobs = document.querySelectorAll('audio[src^="blob:"]');
        audioBlobs.forEach(audio => {
            URL.revokeObjectURL(audio.src);
        });

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
        
        // Запускаем обновление сообщений с защитой от утечек
        setTimeout(() => {
            if (document.visibilityState === 'visible') {
                startMessageUpdates();
            }
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
    const response = await fetch(`https://space-point.ru/api/chats/${currentUser.id}`);
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
        const response = await fetch('https://space-point.ru/api/messages/send', {
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
                
                const response = await fetch('https://space-point.ru/api/messages/send', {
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

// Инициализация Socket.IO
const socket = io('https://space-point.ru', {
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

// Добавляем обработчик видимости страницы
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentChatPartner) {
        startMessageUpdates();
    } else {
        if (messageUpdateInterval) {
            clearInterval(messageUpdateInterval);
            messageUpdateInterval = null;
        }
    }
});

// Добавляем очистку при уходе со страницы
window.addEventListener('beforeunload', () => {
    if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
    }
    
    // Очищаем все аудио ресурсы
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
    });
    
    // Освобождаем память от URL объектов
    const audioBlobs = document.querySelectorAll('audio[src^="blob:"]');
    audioBlobs.forEach(audio => {
        URL.revokeObjectURL(audio.src);
    });
});