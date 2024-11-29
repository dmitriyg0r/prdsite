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

// Отправка сообщения
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        database.ref('messages').push({
            text: message,
            timestamp: Date.now()
        });
        messageInput.value = '';
    }
});

// Получение сообщений
database.ref('messages').on('child_added', (snapshot) => {
    const message = snapshot.val();
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = message.text;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}); 