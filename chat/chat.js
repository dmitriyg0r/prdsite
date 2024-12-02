document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.data) {
        window.location.href = '../Profile/profile.html';
        return;
    }

    loadFriendsList();
});

// Функция для загрузки списка друзей
function loadFriendsList() {
    fetch('/api/friends/list', {
        headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const friendsListDiv = document.getElementById('friends-list');
            friendsListDiv.innerHTML = data.data.map(friend => `
                <div class="chat-partner" onclick="openChat('${friend.username}')">
                    <img src="${friend.avatarUrl || '../assets/default-avatar.png'}" alt="Avatar" class="friend-avatar">
                    <span>${friend.username}</span>
                </div>
            `).join('');
        }
    })
    .catch(error => console.error('Error loading friends list:', error));
}

// Функция для открытия чата с другом
function openChat(username) {
    // Set the current chat partner
    currentChatPartner = username;
    loadChatHistory(username);
}

// Функция для загрузки истории чата
async function loadChatHistory(username) {
    try {
        const response = await fetch(`/api/chat/history/${username}`, {
            headers: {
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const chatMessages = document.getElementById('messages');
            chatMessages.innerHTML = data.data.map(message => createMessageElement(message)).join('');
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Функция для создания элемента сообщения
function createMessageElement(message) {
    const currentUser = JSON.parse(localStorage.getItem('user')).data.username;
    const isSent = message.from === currentUser;
    const time = new Date(message.timestamp).toLocaleTimeString();

    return `
        <div class="message ${isSent ? 'message-sent' : 'message-received'}">
            ${message.message}
            <div class="message-time">${time}</div>
        </div>
    `;
}

// Обработчик отправки сообщения
document.getElementById('sendMessage').addEventListener('click', sendMessage);

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || !currentChatPartner) return;

    try {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).data.username}`
            },
            body: JSON.stringify({
                to: currentChatPartner,
                message: message
            })
        });

        const data = await response.json();

        if (data.success) {
            const chatMessages = document.getElementById('messages');
            const newMessage = createMessageElement({
                from: JSON.parse(localStorage.getItem('user')).data.username,
                message: message,
                timestamp: new Date()
            });

            chatMessages.insertAdjacentHTML('beforeend', newMessage);
            input.value = '';

            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
} 