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

// Проверка аутентификации
//function checkAuth() {
//    const user = localStorage.getItem('user');
//    if (!user && !window.location.href.includes('profile.html')) {
//        // Если пользователь не авторизован и не на странице входа,
//        // перенаправляем на страницу входа
//        window.location.href = '/Profile/profile.html';
//    }
//}
//
//// Выход из системы
//function logout() {
//    localStorage.removeItem('user');
//    window.location.href = '/Profile/profile.html';
//}

// Проверяем при загрузке каждой страницы
//document.addEventListener('DOMContentLoaded', checkAuth);