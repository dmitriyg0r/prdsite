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

// Функция для загрузки аватара пользователя
async function loadUserAvatar() {
    const userAvatar = document.getElementById('userAvatar');
    const username = localStorage.getItem('username');

    if (!username) {
        // Если пользователь не авторизован, используем аватар по умолчанию
        userAvatar.src = '/default-avatar.png';
        return;
    }

    try {
        const response = await fetch(`http://localhost:5003/api/users/${username}/avatar`);
        const data = await response.json();

        if (data.success && data.data.avatarUrl) {
            userAvatar.src = `http://localhost:5003${data.data.avatarUrl}`;
        } else {
            userAvatar.src = '/default-avatar.png';
        }
    } catch (error) {
        console.error('Error loading avatar:', error);
        userAvatar.src = '/default-avatar.png';
    }
}

// Вызываем функцию при загрузке страницы
document.addEventListener('DOMContentLoaded', loadUserAvatar);