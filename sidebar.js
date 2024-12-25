document.addEventListener('DOMContentLoaded', function() {
    // Получаем все ссылки в меню
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    // Добавляем обработчик для каждой ссылки
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Удаляем класс active у всех ссылок
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Добавляем класс active текущей ссылке
            this.classList.add('active');
        });
    });

    // Устанавливаем активную ссылку при загрузке страницы
    const currentPath = window.location.pathname;
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') && currentPath.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });
}); 