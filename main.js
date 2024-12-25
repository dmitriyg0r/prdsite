document.addEventListener('DOMContentLoaded', () => {
    // Элементы управления темой
    const themeToggle = document.querySelector('.theme-toggle-container');
    const themeCheckbox = document.querySelector('.theme-checkbox');
    const body = document.body;

    // Загрузка сохраненной темы
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeCheckbox) {
        themeCheckbox.checked = savedTheme === 'dark';
    }

    // Обработчик переключения темы
    if (themeToggle && themeCheckbox) {
        themeToggle.addEventListener('click', () => {
            themeCheckbox.checked = !themeCheckbox.checked;
            const newTheme = themeCheckbox.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Обновление навигационного меню
    updateNavigationMenu();
});

// Добавляем функцию для обновления меню
function updateNavigationMenu() {
    const user = JSON.parse(localStorage.getItem('user'));
    const sidebarNav = document.querySelector('.sidebar-nav');
    
    // Находим существующую кнопку чата, если она есть
    const existingChatLink = document.querySelector('.sidebar-link[href="/chat/chat.html"]');
    
    // Если пользователь авторизован и кнопки чата еще нет
    if (user && !existingChatLink) {
        const chatLink = document.createElement('a');
        chatLink.href = '/chat/chat.html';
        chatLink.className = 'sidebar-link';
        chatLink.innerHTML = `
            <i class="fas fa-comments"></i>
            <span>Чат</span>
        `;
        
        // Добавляем кнопку чата перед кнопкой профиля
        const profileLink = document.querySelector('.sidebar-link[href="/Profile/profile.html"]');
        if (profileLink) {
            sidebarNav.insertBefore(chatLink, profileLink);
        } else {
            sidebarNav.appendChild(chatLink);
        }
    }
    // Если пользователь не авторизован и кнопка чата есть
    else if (!user && existingChatLink) {
        existingChatLink.remove();
    }
}

// Обновляем меню при изменении состояния авторизации
window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        updateNavigationMenu();
    }
});
