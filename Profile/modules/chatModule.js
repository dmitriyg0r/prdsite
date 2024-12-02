import { API_BASE_URL, showError, showSuccess, apiRequest } from './utils.js';

// Глобальные переменные для чата
let currentChatPartner = null;
let checkMessagesInterval;

// Функция открытия чата
export async function openChat(username) {
    currentChatPartner = username;
    
    const chatContainer = document.getElementById('chat-container');
    const chatTitle = document.getElementById('chat-title');
    
    if (chatContainer && chatTitle) {
        chatContainer.style.display = 'block';
        chatTitle.textContent = `Чат с ${username}`;
        
        // Очищаем предыдущие сообщения
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // Загружаем историю сообщений
        await loadChatHistory(username);
        
        // Отмечаем сообщения как прочитанные
        await markMessagesAsRead(username);
        
        // Начинаем проверку новых сообщений
        startCheckingMessages();
    }
}

// Функция закрытия чата
export function closeChat() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'none';
    }
    
    currentChatPartner = null;
    stopCheckingMessages();
}

// Функция загрузки истории сообщений
export async function loadChatHistory(username) {
    try {
        const response = await apiRequest(`/chat/history/${username}`);

        if (response.success) {
            const chatMessages = document.getElementById('chat-messages');
            const scrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 1;
            
            // Создаём временный div для сравнения содержимого
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = response.data.map(message => createMessageElement(message)).join('');

            // Проверяем, есть ли изменения в сообщениях
            if (chatMessages.innerHTML !== tempDiv.innerHTML) {
                chatMessages.innerHTML = tempDiv.innerHTML;
                
                // Сохраняем прокрутку
                if (scrolledToBottom) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        showError('Ошибка при загрузке истории сообщений');
    }
}

// Функция отправки сообщения
export async function sendMessage() {
    const input = document.getElementById('chat-input');
    const fileInput = document.getElementById('chat-file-input');
    const message = input.value.trim();
    const file = fileInput.files[0];
    
    if (!message && !file) return;
    if (!currentChatPartner) return;

    try {
        const formData = new FormData();
        if (message) formData.append('message', message);
        if (file) formData.append('file', file);
        formData.append('to', currentChatPartner);

        const response = await apiRequest('/chat/send', {
            method: 'POST',
            headers: {
                // Не добавляем Content-Type, он будет установлен автоматически для FormData
            },
            body: formData
        });

        if (response.success) {
            // Очищаем поля ввода
            input.value = '';
            fileInput.value = '';
            
            // Добавляем новое сообщение в чат
            const chatMessages = document.getElementById('chat-messages');
            const newMessage = createMessageElement({
                from: JSON.parse(localStorage.getItem('user')).data.username,
                message: message,
                timestamp: new Date(),
                attachment: response.data.attachment
            });
            
            chatMessages.insertAdjacentHTML('beforeend', newMessage);
            
            // Прокручиваем к новому сообщению
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Ошибка при отправке сообщения');
    }
}

// Функция создания элемента сообщения
function createMessageElement(message) {
    const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
    const isSent = message.from === currentUser;
    const time = new Date(message.timestamp).toLocaleTimeString();
    
    let attachmentHtml = '';
    if (message.attachment) {
        if (message.attachment.filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
            attachmentHtml = `
                <div class="message-attachment">
                    <img src="${message.attachment.path}" alt="Attachment" class="message-image">
                </div>
            `;
        } else {
            attachmentHtml = `
                <div class="message-attachment">
                    <a href="${message.attachment.path}" target="_blank" class="message-file">
                        <i class="fas fa-file"></i> ${message.attachment.filename}
                    </a>
                </div>
            `;
        }
    }
    
    return `
        <div class="message ${isSent ? 'message-sent' : 'message-received'}">
            <div class="message-content">
                ${message.message}
                ${attachmentHtml}
            </div>
            <div class="message-info">
                <span class="message-time">${time}</span>
                ${isSent ? `<span class="message-status ${message.isRead ? 'read' : ''}">
                    <i class="fas fa-check"></i>
                </span>` : ''}
            </div>
        </div>
    `;
}

// Функция для отметки сообщений как прочитанных
async function markMessagesAsRead(fromUser) {
    try {
        await apiRequest('/chat/mark-as-read', {
            method: 'POST',
            body: JSON.stringify({ fromUser })
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Функция для проверки новых сообщений
async function checkNewMessages() {
    if (!currentChatPartner) return;

    try {
        const response = await apiRequest(`/chat/new-messages/${currentChatPartner}`);

        if (response.success && response.data.length > 0) {
            await loadChatHistory(currentChatPartner);
            await markMessagesAsRead(currentChatPartner);
        }
    } catch (error) {
        console.error('Error checking new messages:', error);
    }
}

// Функция для начала проверки сообщений
export function startCheckingMessages() {
    if (currentChatPartner) {
        checkMessagesInterval = setInterval(checkNewMessages, 5000);
    }
}

// Функция для остановки проверки сообщений
export function stopCheckingMessages() {
    clearInterval(checkMessagesInterval);
}

// Функция для удаления сообщения
export async function deleteMessage(messageId) {
    try {
        const response = await apiRequest(`/chat/message/${messageId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            await loadChatHistory(currentChatPartner);
            showSuccess('Сообщение удалено');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        showError('Ошибка при удалении сообщения');
    }
}

// Инициализация обработчиков событий
export function initializeChatHandlers() {
    // Обработчик отправки сообщения по Enter
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Обработчик закрытия чата
    const closeButton = document.getElementById('close-chat');
    if (closeButton) {
        closeButton.addEventListener('click', closeChat);
    }
}

// Функция инициализации чата
export function initializeChat() {
    // Инициализация обработчиков событий чата
    initializeChatHandlers();
    
    // Проверяем наличие сохраненного партнера для чата
    const chatPartner = localStorage.getItem('chatPartner');
    if (chatPartner) {
        openChat(chatPartner);
        localStorage.removeItem('chatPartner');
    }
}

// Экспортируем все необходимые функции
export {
    currentChatPartner,
    openChat,
    closeChat,
    sendMessage,
    deleteMessage,
    initializeChatHandlers,
    createMessageElement,
    markMessagesAsRead,
    checkNewMessages
};