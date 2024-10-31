document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-checkbox');
    const body = document.documentElement;

    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';
    }

    // Обработчик переключения темы
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
});