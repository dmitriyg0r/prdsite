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
// Функция для определения мобильного устройства
function isMobileDevice() {
    // Проверяем не только User Agent, но и размер экрана
    const mobileUserAgent = (
        navigator.userAgent.match(/Android/i) ||
        navigator.userAgent.match(/webOS/i) ||
        navigator.userAgent.match(/iPhone/i) ||
        navigator.userAgent.match(/iPad/i) ||
        navigator.userAgent.match(/iPod/i) ||
        navigator.userAgent.match(/BlackBerry/i) ||
        navigator.userAgent.match(/Windows Phone/i)
    );

    // Проверяем ширину экрана (меньше 768px считаем мобильным)
    const isMobileWidth = window.innerWidth <= 768;

    // Возвращаем true только если это реально мобильное устройство
    return mobileUserAgent && isMobileWidth;
}

// Функция для загрузки мобильных стилей
function loadMobileStyles() {
    if (isMobileDevice()) {
        const mobileStylesheet = document.createElement('link');
        mobileStylesheet.rel = 'stylesheet';
        mobileStylesheet.href = 'mobile.css';
        document.head.appendChild(mobileStylesheet);
        document.body.classList.add('mobile-device');
    } else {
        // Удаляем класс mobile-device, если это не мобильное устройство
        document.body.classList.remove('mobile-device');
    }
}

// Запускаем определение устройства при загрузке страницы
document.addEventListener('DOMContentLoaded', loadMobileStyles);

// Добавляем проверку при изменении размера окна
window.addEventListener('resize', loadMobileStyles);