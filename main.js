// Элементы управления темой
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Загрузка сохраненной темы
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.checked = true;
}

// Функция переключения темы
function toggleTheme() {
    const isDark = themeToggle.checked;
    if (isDark) {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
}

// Добавляем обработчик события
if (themeToggle) {
    themeToggle.addEventListener('change', toggleTheme);
}

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

// Вызываем функцию при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateNavigationMenu();
    // ... остальной код ...
});

// Обновляем меню при изменении состояния авторизации
window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        updateNavigationMenu();
    }
});
