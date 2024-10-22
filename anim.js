function toggleTheme() {
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    
    // Добавляем класс 'animating' перед сменой темы
    themeToggle.classList.add('animating');
    
    // Переключаем тему
    body.classList.toggle('darkmode');
    
    // Обновляем localStorage
    if (body.classList.contains('darkmode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
    
    // Удаляем класс 'animating' после завершения анимации
    setTimeout(() => {
        themeToggle.classList.remove('animating');
    }, 500); // 500ms соответствует длительности анимации в CSS
}

// Добавляем слушатель событий к переключателю темы
const themeToggle = document.querySelector('.theme-toggle');
themeToggle.addEventListener('click', toggleTheme);
