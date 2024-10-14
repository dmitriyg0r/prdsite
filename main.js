const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Проверяем, есть ли сохраненная тема в localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('darkmode');
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('darkmode');
    // Сохраняем текущую тему в localStorage
    if (body.classList.contains('darkmode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

document.getElementById('menu-toggle').addEventListener('click', function() {
    var menu = document.getElementById('menu');
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
});

// Добавляем обработчик события для формы добавления задания
document.getElementById('homework-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const subject = document.getElementById('subject').value;
    const task = document.getElementById('task').value;

    if (subject && task) {
        const homeworkItem = document.createElement('div');
        homeworkItem.classList.add('homework-item');
        homeworkItem.innerHTML = `<strong>${subject}:</strong> ${task} <button class="delete-button">Удалить</button>`;

        document.getElementById('homework-list').appendChild(homeworkItem);

        // Очищаем форму
        document.getElementById('subject').value = '';
        document.getElementById('task').value = '';

        // Добавляем обработчик события для кнопки удаления
        homeworkItem.querySelector('.delete-button').addEventListener('click', function() {
            homeworkItem.remove();
        });
    }
});