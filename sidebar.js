document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const toggleButton = document.querySelector('.sidebar-toggle');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    // Обработчик клика по кнопке
    toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('expanded');
        // Поворачиваем иконку
        toggleButton.querySelector('i').classList.toggle('fa-rotate-180');
    });

    // Обработчик для ссылок
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Устанавливаем активную ссылку
    const currentPath = window.location.pathname;
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') && currentPath.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });

    // Добавляем обработчик для переключателя темы
    const themeToggle = document.querySelector('.theme-toggle-container');
    const themeCheckbox = document.querySelector('.theme-checkbox');
    
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeCheckbox.checked = savedTheme === 'dark';
    }

    themeToggle.addEventListener('click', () => {
        themeCheckbox.checked = !themeCheckbox.checked;
        const newTheme = themeCheckbox.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}); 