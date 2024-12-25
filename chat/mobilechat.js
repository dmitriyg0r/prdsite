document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, является ли устройство мобильным
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Инициализация обработчиков для мобильной версии
        initMobileChat();
    }

    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            initMobileChat();
        }
    });
});

function initMobileChat() {
    const chatList = document.querySelector('.chat-list');
    const chatArea = document.querySelector('.chat-area');
    const backButton = document.getElementById('backToChats');

    // Обработчик для кнопки "Назад"
    backButton.addEventListener('click', () => {
        chatArea.style.display = 'none';
        chatList.style.display = 'flex';
        // Анимация возврата
        chatList.style.animation = 'slideInFromLeft 0.3s ease-out';
    });

    // Обработчик выбора чата
    document.querySelectorAll('.chat-partner').forEach(partner => {
        partner.addEventListener('click', () => {
            chatList.style.display = 'none';
            chatArea.style.display = 'flex';
            // Анимация открытия чата
            chatArea.style.animation = 'slideInFromRight 0.3s ease-out';
        });
    });
}

// Добавляем стили анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFromRight {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes slideInFromLeft {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style); 