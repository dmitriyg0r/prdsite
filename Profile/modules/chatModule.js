// Функция для перенаправления на страницу чата
export function initializeChat() {
    // Проверяем авторизацию
    const user = localStorage.getItem('user');
    const chatLink = document.querySelector('a[href="../chat/chat.html"]');
    
    if (user && chatLink) {
        chatLink.style.display = 'flex';
    }
}

// Экспортируем только необходимую функцию
export {
    initializeChat
};