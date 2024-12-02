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

// Функция для входа в систему
async function login(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (data.success) {
            // Сохраняем роль пользователя
            localStorage.setItem('userRole', data.data.role);
            localStorage.setItem('username', data.data.username);
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error during login:', error);
        return false;
    }
}