// Элементы управления темой
const themeToggle = document.getElementById('theme-toggle');
const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
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

// Добавляем обработчики событий
if (themeToggle) {
    themeToggle.addEventListener('change', toggleTheme);
}

if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('change', toggleTheme);
}

document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const menuLinks = document.querySelectorAll('.sidebar-link');

    // Функция открытия/закрытия меню
    function toggleMenu() {
        if (!menuToggle || !sidebar || !overlay) return; // Проверка на существование элементов
        
        menuToggle.classList.toggle('active');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Переключение класса для блокировки прокрутки
        body.classList.toggle('menu-open');
    }

    // Обработчики событий для открытия/закрытия меню
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', toggleMenu);
    }

    // Закрытие меню при клике на пункты меню
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) { // Только для мобильных устройств
                toggleMenu();
            }
        });
    });

    // Обработка свайпов
    let touchStartX = 0;
    let touchEndX = 0;

    if (sidebar) {
        sidebar.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sidebar.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) { // Свайп влево
                toggleMenu();
            }
        }, { passive: true });

        // Добавляем свайп вправо для открытия меню
        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchEndX - touchStartX > 50 && touchStartX < 50) { // Свайп вправо от левого края
                if (!sidebar.classList.contains('active')) {
                    toggleMenu();
                }
            }
        }, { passive: true });
    }
});