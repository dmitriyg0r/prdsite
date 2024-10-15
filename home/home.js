// Автоматическое изменение размера текстового поля
const taskTextarea = document.getElementById('task');

taskTextarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

// Обработка формы добавления задания
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
        taskTextarea.style.height = 'auto'; // Сбрасываем высоту текстового поля

        // Добавляем обработчик события для кнопки удаления
        homeworkItem.querySelector('.delete-button').addEventListener('click', function() {
            homeworkItem.remove();
        });
    }
});