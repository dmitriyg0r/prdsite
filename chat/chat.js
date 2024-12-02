let activeContextMenu = null;
let currentAttachment = null;

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.data) {
        window.location.href = '../Profile/profile.html';
        return;
    }

    // Запрашиваем разрешение на уведомления при первой загрузке
    if ("Notification" in window) {
        console.log('Текущий статус разрешения:', Notification.permission);
        if (Notification.permission === "default") {
            await requestNotificationPermission();
        }
    } else {
        console.log('Уведомления не поддерживаются в этом браузере');
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

    // Добавляем обработчики событий для прикрепления файлов
    const fileInput = document.getElementById('fileInput');
    const attachButton = document.getElementById('attachButton');
    const attachmentPreview = document.getElementById('attachmentPreview');

    attachButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Добавляем контекстное меню в DOM
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item delete" data-action="delete">
            <i class="fas fa-trash"></i>
            Удалить
        </div>
    `;
    document.body.appendChild(contextMenu);

    // Обработчик клика вне контекстного меню
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
        }
    });

    // Отключаем стандартное контекстное меню в области сообщений
    document.getElementById('messages').addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
});

// Функция для загрузки списка друзей
function loadFriendsList() {
    fetch('/api/friends/list', {
        headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
        }
    })
    .then(response => response.json())
    .then(async data => {
        if (data.success) {
            const friendsListDiv = document.getElementById('friends-list');
            // Получаем последние сообщения для каждого друга
            const friendsWithMessages = await Promise.all(
                data.data.map(async friend => {
                    const lastMessage = await getLastMessage(friend.username);
                    return {
                        ...friend,
                        lastMessage: lastMessage
                    };
                })
            );
            friendsListDiv.innerHTML = friendsWithMessages.map(friend => createFriendElement(friend)).join('');

            // Повторно добавляем класс active к текущему чату
            if (currentChatPartner) {
                const currentChat = Array.from(document.querySelectorAll('.chat-partner')).find(chat => 
                    chat.querySelector('.friend-name').textContent === currentChatPartner
                );
                if (currentChat) {
                    currentChat.classList.add('active');
                }
            }
        }
    })
    .catch(error => console.error('Error loading friends list:', error));
}

// Функция для получения последнего сообщения
async function getLastMessage(username) {
    try {
        const response = await fetch(`/api/chat/history/${username}`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const lastMsg = data.data[data.data.length - 1];
            const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
            const isOwnMessage = lastMsg.from === currentUser;
            
            // Обрезаем сообщение если оно слишком длинное
            const truncatedMessage = lastMsg.message.length > 30 
                ? lastMsg.message.substring(0, 30) + '...' 
                : lastMsg.message;
            
            return isOwnMessage ? `Вы: ${truncatedMessage}` : truncatedMessage;
        }
        return 'Нет сообщений';
    } catch (error) {
        console.error('Error getting last message:', error);
        return 'Нет сообщений';
    }
}

// Глобальная переменная для текущего собеседника
let currentChatPartner = null;

// Функция для создания элемента в списке друзей
function createFriendElement(friend) {
    return `
        <div class="chat-partner" onclick="openChat('${friend.username}', '${friend.avatarUrl ? `/api/${friend.avatarUrl}` : '../assets/default-avatar.png'}')">
            <img src="${friend.avatarUrl ? `/api/${friend.avatarUrl}` : '../assets/default-avatar.png'}" alt="Avatar" class="friend-avatar">
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="last-message">${friend.lastMessage}</div>
            </div>
        </div>
    `;
}

// Функция для открытия чата с пользователем
async function openChat(username, avatarUrl) {
    currentChatPartner = username;
    
    // Убираем класс active у всех чатов и добавляем его текущему
    const allChats = document.querySelectorAll('.chat-partner');
    allChats.forEach(chat => chat.classList.remove('active'));
    const currentChat = Array.from(allChats).find(chat => 
        chat.querySelector('.friend-name').textContent === username
    );
    if (currentChat) {
        currentChat.classList.add('active');
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
    if (chatHeaderAvatar) {
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

// Обновленная функция для проверки новых сообщений
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
            const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
            const chatMessages = document.getElementById('messages');
            
            data.data.forEach(message => {
                chatMessages.insertAdjacentHTML('beforeend', createMessageElement(message));
                
                // Показваем уведомление только если:
                // 1. Вкладка не активна
                // 2. Сообщение не от текущего пользователя
                // 3. Документ скрыт
                if (message.from !== currentUser && 
                    (document.hidden || !document.hasFocus())) {
                    console.group('Попытка показа уведомления');
                    console.log('Сообщение от:', message.from);
                    console.log('Текущий пользователь:', currentUser);
                    console.log('Документ скрыт:', document.hidden);
                    console.log('Документ в фокусе:', document.hasFocus());
                    console.log('Текст сообщения:', message.message);
                    console.groupEnd();
                    
                    // Пробуем создать тестовое уведомление
                    try {
                        new Notification('Тестовое уведомление');
                    } catch (error) {
                        console.error('Ошибка при создании тестового уведомления:', error);
                    }
                    
                    showNotification(message.message, message.from);
                }
            });
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
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

// Обновленная функция создания элемента сообщения
function createMessageElement(message) {
    const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
    const isSent = message.from === currentUser;
    const time = new Date(message.timestamp).toLocaleTimeString();
    
    let statusIcon = '';
    if (isSent) {
        statusIcon = message.isRead 
            ? '<div class="message-status status-read"><i class="fas fa-check-double"></i></div>'
            : '<div class="message-status status-sent"><i class="fas fa-check"></i></div>';
    }

    // Создаем разметку для прикрепленного файла
    let attachmentHtml = '';
    if (message.attachment) {
        const fileExtension = message.attachment.filename.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
        
        // Получаем полный URL файла
        const fileUrl = new URL(message.attachment.path, window.location.origin).href;
        
        if (isImage) {
            attachmentHtml = `
                <div class="message-attachment">
                    <img src="${fileUrl}" 
                         alt="${message.attachment.filename}" 
                         onclick="openImageModal('${fileUrl}')"
                         onerror="this.onerror=null; this.src='../assets/error-image.png';"
                         loading="lazy">
                </div>
            `;
        } else {
            let fileIcon = 'fa-file';
            if (fileExtension === 'pdf') fileIcon = 'fa-file-pdf';
            else if (['doc', 'docx'].includes(fileExtension)) fileIcon = 'fa-file-word';
            else if (['txt'].includes(fileExtension)) fileIcon = 'fa-file-text';

            attachmentHtml = `
                <div class="message-attachment">
                    <div class="file-preview" onclick="downloadFile('${fileUrl}', '${message.attachment.filename}')">
                        <i class="fas ${fileIcon} file-icon"></i>
                        <div class="file-info">
                            <span class="file-name">${message.attachment.filename}</span>
                            <span class="file-size">${formatFileSize(message.attachment.size)}</span>
                        </div>
                        <i class="fas fa-download"></i>
                    </div>
                </div>
            `;
        }
    }

    const messageElement = `
        <div class="message ${isSent ? 'message-sent' : 'message-received'}" 
             data-message-id="${message.id}"
             oncontextmenu="showContextMenu(event, this)">
            <div class="message-content">
                ${message.message ? `<div class="message-text">${message.message}</div>` : ''}
                ${attachmentHtml}
                <div class="message-info">
                    <span class="message-time">${time}</span>
                    ${statusIcon}
                </div>
            </div>
        </div>
    `;

    return messageElement;
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

    if ((!message && !currentAttachment) || !currentChatPartner) return;

    try {
        const formData = new FormData();
        formData.append('to', currentChatPartner);
        formData.append('message', message);
        
        if (currentAttachment) {
            formData.append('file', currentAttachment);
        }

        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const chatMessages = document.getElementById('messages');
            const newMessage = createMessageElement({
                from: JSON.parse(localStorage.getItem('user')).data.username,
                message: message,
                timestamp: new Date(),
                isRead: false,
                attachment: data.data.attachment
            });

            chatMessages.insertAdjacentHTML('beforeend', newMessage);
            input.value = '';
            removeAttachment(); // Очищаем прикрепленный файл

            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });

            loadFriendsList();
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

// Обновленная функция запроса разрешения на уведомления
async function requestNotificationPermission() {
    try {
        console.log('Запрашиваем разрешение на уведомления...');
        const permission = await Notification.requestPermission();
        console.log('Получен ответ на запрос разрешения:', permission);
        return permission === 'granted';
    } catch (error) {
        console.error('Ошибка при запросе разрешения на уведомления:', error);
        return false;
    }
}

// Обновленная функция показа уведомлений
async function showNotification(message, from) {
    console.group('Показ уведомления');
    console.log('Параметры:', { message, from });
    console.log('Текущий статус разрешения:', Notification.permission);
    console.log('Поддержка уведомлений:', 'Notification' in window);
    
    try {
        if (!("Notification" in window)) {
            console.error("Уведомления не поддерживаются");
            return;
        }

        // Повторно запрашиваем разрешение, если оно не получено
        if (Notification.permission !== "granted") {
            const permission = await Notification.requestPermission();
            console.log('Новый статус разрешения:', permission);
            if (permission !== 'granted') {
                console.warn('Разрешение не получено');
                return;
            }
        }

        // Создаем уведомление с уникальным идентификатором
        const notificationId = `msg_${Date.now()}`;
        const notificationOptions = {
            body: message,
            icon: "/flow.ico", // Используем абсолютный путь
            tag: notificationId,
            requireInteraction: true,
            renotify: true, // Показывать каждое новое уведомление
            silent: false,
            timestamp: Date.now()
        };

        console.log('Создание уведомления с опциями:', notificationOptions);

        const notification = new Notification(
            `Сообщение от ${from}`, 
            notificationOptions
        );

        // Добавляем обработчики событий
        notification.addEventListener('show', () => {
            console.log(`Уведомление ${notificationId} показано`);
        });

        notification.addEventListener('error', (e) => {
            console.error(`Ошибка уведомления ${notificationId}:`, e);
        });

        notification.addEventListener('click', () => {
            console.log(`Уведомление ${notificationId} нажато`);
            window.focus();
            openChat(from);
            notification.close();
        });

        // Автоматическое закрытие через 10 секунд
        setTimeout(() => {
            notification.close();
            console.log(`Уведомление ${notificationId} автоматически закрыто`);
        }, 10000);

    } catch (error) {
        console.error('Ошибка при создании уведомления:', error);
    } finally {
        console.groupEnd();
    }
}

// Добавляем обработчик видимости страницы
document.addEventListener('visibilitychange', () => {
    console.log('Изменение видимости страницы:', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
    });
});

// Добавляем обработчик фокуса окна
window.addEventListener('focus', () => {
    console.log('Окно получило фокус');
});

window.addEventListener('blur', () => {
    console.log('Окно потеряло фокус');
});

// Функция для обработки выбора файла
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Проверяем размер файла (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишкм большой. Максимальный размер: 5MB');
        event.target.value = ''; // Очищаем input
        return;
    }

    currentAttachment = file;
    updateAttachmentPreview(file);
}

// Функция для обновления превью прикрепленного файла
function updateAttachmentPreview(file) {
    const preview = document.getElementById('attachmentPreview');
    const fileSize = formatFileSize(file.size);

    preview.innerHTML = `
        <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${fileSize}</span>
        </div>
        <button class="remove-attachment" onclick="removeAttachment()">
            <i class="fas fa-times"></i>
        </button>
    `;
    preview.classList.add('active');
}

// Функция для форматирования размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Функция для удаления прикрепленного файла
function removeAttachment() {
    currentAttachment = null;
    document.getElementById('fileInput').value = '';
    const preview = document.getElementById('attachmentPreview');
    preview.innerHTML = '';
    preview.classList.remove('active');
}

// Добавляем функции для работы с изображениями и файлами
function openImageModal(imagePath) {
    // Создаем модальное окно, если его еще нет
    let modal = document.querySelector('.image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <button class="close-button" onclick="closeImageModal()">
                <i class="fas fa-times"></i>
            </button>
            <img src="" alt="Preview">
        `;
        document.body.appendChild(modal);
    }

    const modalImg = modal.querySelector('img');
    modalImg.src = imagePath;
    modal.classList.add('active');

    // Закрытие по клику вне изображения
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });
}

function closeImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function downloadFile(url, filename) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading file:', error);
        alert('Ошибка при скачивании файла');
    }
}

// Добавляем обработчик клавиши Escape для закрытия модального окна
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

// Функция для показа контекстного меню
function showContextMenu(e, messageElement) {
    e.preventDefault();
    
    // Проверяем, является ли сообщение нашим
    const messageContent = messageElement.querySelector('.message-content');
    if (!messageElement.classList.contains('message-sent')) {
        return; // Не показываем меню для чужих сообщений
    }

    const contextMenu = document.querySelector('.context-menu');
    
    // Позиционируем меню
    const rect = messageElement.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Проверяем, не выходит ли меню за пределы экрана
    const menuWidth = 150; // Примерная ширина меню
    const menuHeight = 40; // Примерная высота меню
    
    const rightEdge = window.innerWidth - menuWidth;
    const bottomEdge = window.innerHeight - menuHeight;
    
    contextMenu.style.left = `${Math.min(x, rightEdge)}px`;
    contextMenu.style.top = `${Math.min(y, bottomEdge)}px`;
    
    // Сохраняем ID сообщения в меню
    const messageId = messageElement.dataset.messageId;
    contextMenu.dataset.messageId = messageId;
    
    // Показываем меню
    contextMenu.classList.add('active');
    activeContextMenu = contextMenu;
}

// Функция для скрытия контекстного меню
function hideContextMenu() {
    if (activeContextMenu) {
        activeContextMenu.classList.remove('active');
        activeContextMenu = null;
    }
}

// Добавляем обработчик для действий контекстного меню
document.addEventListener('click', async (e) => {
    const menuItem = e.target.closest('.context-menu-item');
    if (!menuItem) return;

    const action = menuItem.dataset.action;
    const contextMenu = menuItem.closest('.context-menu');
    const messageId = contextMenu.dataset.messageId;

    if (action === 'delete') {
        await deleteMessage(messageId);
    }

    hideContextMenu();
});

// Функция удаления сообщения
async function deleteMessage(messageId) {
    try {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;

        // Добавляем анимацию удаления
        messageElement.classList.add('deleting');

        const response = await fetch(`/api/chat/message/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Ждем окончания анимации перед удалением элемента
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        } else {
            messageElement.classList.remove('deleting');
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Ошибка при удалении сообщения');
    }
}

// Закрываем контекстное меню при нажатии Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideContextMenu();
    }
});

// Закрываем контекстное меню при скролле
document.getElementById('messages').addEventListener('scroll', () => {
    hideContextMenu();
}); 