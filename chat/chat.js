// Конфигурация Firebase (замените на свои данные)
const firebaseConfig = {
    // Ваши данные конфигурации Firebase
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Получаем элементы DOM
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendMessage');

// Функция для сохранения сообщений в локальный файл
function saveMessages(messages) {
    const data = JSON.stringify(messages);
    const blob = new Blob([data], {type: 'application/json'});
    const url = 'save_messages.php';
    
    fetch(url, {
        method: 'POST',
        body: data
    });
}

// Функция для загрузки сообщений
function loadMessages() {
    fetch('get_messages.php')
        .then(response => response.json())
        .then(messages => {
            messagesDiv.innerHTML = '';
            messages.forEach(message => {
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                messageElement.textContent = message.text;
                messagesDiv.appendChild(messageElement);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
}

// Модифицируем отправку сообщения
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        const newMessage = {
            text: message,
            timestamp: Date.now()
        };
        
        fetch('save_messages.php', {
            method: 'POST',
            body: JSON.stringify(newMessage)
        });
        
        messageInput.value = '';
    }
});

// Загружаем сообщения каждые 5 секунд
setInterval(loadMessages, 5000);

// Загружаем сообщения при старте
loadMessages(); 