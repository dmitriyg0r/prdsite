// Функция для применения темы
function applyTheme(theme) {
    const body = document.body;
    const themeToggle = document.querySelector('.theme-checkbox');
    const themeIcon = document.querySelector('.theme-icon');

    if (theme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.checked = true;
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    } else {
        body.removeAttribute('data-theme');
        if (themeToggle) themeToggle.checked = false;
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }
}

// Применяем тему при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Получаем сохраненную тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Добавляем обработчик для переключателя темы
    const themeToggle = document.querySelector('.theme-checkbox');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }
});