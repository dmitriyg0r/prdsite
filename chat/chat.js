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