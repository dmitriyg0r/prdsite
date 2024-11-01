document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-checkbox');
    const themeIcon = document.querySelector('.theme-icon');
    const body = document.documentElement;

    // Функция обновления иконки
    function updateThemeIcon(isDark) {
        if (isDark) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';
        updateThemeIcon(savedTheme === 'dark');
    }

    // Обработчик переключения темы
    themeToggle.addEventListener('change', () => {
        const isDark = themeToggle.checked;
        if (isDark) {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
        updateThemeIcon(isDark);
    });
});