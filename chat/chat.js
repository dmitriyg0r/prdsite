// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.data) {
        // Redirect to login if not authenticated
        window.location.href = '../Profile/profile.html';
        return;
    }
    
    // Загружаем список собеседников и сообщения
    loadChatPartners();
    loadMessages();
});

// Получаем элементы DOM
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendMessage');

// Функция для загрузки сообщений
function loadMessages() {
    fetch('get_messages.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сети');
            }
            return response.json();
        })
        .then(messages => {
            messagesDiv.innerHTML = '';
            if (Array.isArray(messages)) {
                messages.forEach(message => {
                    const messageElement = document.createElement('div');
                    messageElement.className = 'message';
                    messageElement.textContent = message.text;
                    messagesDiv.appendChild(messageElement);
                });
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });
}

// Обработчик отправки сообщения
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        const newMessage = {
            text: message,
            timestamp: Date.now()
        };
        
        fetch('save_messages.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMessage)
        })
        .then(response => {
            if (response.ok) {
                messageInput.value = '';
                loadMessages(); // Перезагружаем сообщения после успешной отправки
            }
        })
        .catch(error => {
            console.error('Ошибка отправки:', error);
        });
    }
});

// Отправка по Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendButton.click();
    }
});

// Загружаем сообщения каждые 5 секунд
setInterval(loadMessages, 5000);

// Загружаем сообщения при старте
loadMessages();

// Fetch and display chat partners
function loadChatPartners() {
    fetch('/api/chat/partners', {
        headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const chatPartnersDiv = document.getElementById('chat-partners');
            chatPartnersDiv.innerHTML = data.data.map(username => `
                <div class="chat-partner" onclick="openChat('${username}')">
                    <span>${username}</span>
                </div>
            `).join('');
        }
    })
    .catch(error => console.error('Error loading chat partners:', error));
}

// Call loadChatPartners on page load
document.addEventListener('DOMContentLoaded', () => {
    loadChatPartners();
    loadMessages(); // Load messages for the first chat partner if needed
}); 