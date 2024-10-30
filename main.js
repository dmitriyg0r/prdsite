document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const homeworkForm = document.getElementById('homework-form');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadMessage = document.getElementById('upload-message');
    const fileList = document.getElementById('file-list');

    // Проверяем, есть ли сохраненная тема в localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('darkmode');
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('darkmode');
        body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
        // Сохраняем текущую тему в localStorage
        localStorage.setItem('theme', body.classList.contains('darkmode') ? 'dark' : 'light');
    });

    // Улучшение: Используем const вместо var
    document.getElementById('menu-toggle').addEventListener('click', function() {
        const menu = document.getElementById('menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    // Добавляем обработчик события для формы добавления задания
    if (homeworkForm) {
        homeworkForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const subject = document.getElementById('subject').value;
            const task = document.getElementById('task').value;

            if (subject && task) {
                const homeworkItem = document.createElement('div');
                homeworkItem.classList.add('homework-item');
                homeworkItem.innerHTML = `<strong>${subject}:</strong> ${task} <button class="delete-button">Удалить</button>`;

                const homeworkList = document.getElementById('homework-list');
                if (homeworkList) {
                    homeworkList.appendChild(homeworkItem);

                    // Очищаем форму
                    document.getElementById('subject').value = '';
                    document.getElementById('task').value = '';

                    // Добавляем обработчик события для кнопки удаления
                    homeworkItem.querySelector('.delete-button').addEventListener('click', function() {
                        homeworkItem.remove();
                    });
                }
            }
        });
    }

    // Добавляем обработчик события для формы загрузки файлов
    if (uploadForm && fileInput && uploadMessage) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (response.ok) {
                    uploadMessage.textContent = 'Файл успешно загружен!';
                    uploadMessage.style.color = 'green';
                    fetchFiles();
                } else {
                    uploadMessage.textContent = result.message;
                    uploadMessage.style.color = 'red';
                }
            } catch (error) {
                uploadMessage.textContent = 'Ошибка при загрузке файла.';
                uploadMessage.style.color = 'red';
            }
        });
    }

    // Получение списка файлов
    async function fetchFiles() {
        try {
            const response = await fetch('/files');
            const files = await response.json();
            if (fileList) {
                fileList.innerHTML = '';
                files.forEach(file => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `/download/${file}`;
                    a.textContent = file;
                    li.appendChild(a);
                    fileList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Ошибка при получении списка файлов:', error);
        }
    }

    // Инициализация списка файлов при загрузке страницы
    fetchFiles();

    // Вызываем функцию для отображения правильной таблицы
    showCorrectTable();

    // Вызываем функцию подсветки при загрузке страницы
    highlightToday();

    // Обновляем подсветку и таблицу каждую минуту
    setInterval(() => {
        highlightToday();
        showCorrectTable();
    }, 60000);

    document.documentElement.style.scrollBehavior = 'smooth';

    const modal = document.getElementById('postModal');
    if (modal) {
        modal.style.transition = 'opacity 0.3s ease';
        modal.style.opacity = 0;

        const addPostBtn = document.querySelector('.add-post-btn');
        if (addPostBtn) {
            addPostBtn.addEventListener('click', () => {
                modal.style.display = 'block';
                setTimeout(() => modal.style.opacity = 1, 10);
            });
        }

        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.opacity = 0;
                setTimeout(() => modal.style.display = 'none', 300);
            });
        }
    }
});

// Функция для получения номера недели
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// Функция для отображения правильной таблицы
function showCorrectTable() {
    const currentWeek = getWeekNumber(new Date());
    const tables = document.querySelectorAll('.table-container');

    tables.forEach((table, index) => {
        const isVisible = (currentWeek % 2 === 0 && index === 1) || 
                         (currentWeek % 2 !== 0 && index === 0);
        table.style.display = isVisible ? 'block' : 'none';
        
        if (isVisible) {
            table.style.animation = 'fadeIn 0.3s ease-in-out';
        }
    });
}

// Функция для подсветки текущего дня
function highlightToday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const todayName = daysOfWeek[dayOfWeek];

    const rows = document.querySelectorAll('table tr');
    if (rows) {
        rows.forEach(row => {
            const firstCell = row.querySelector('td:first-child, th:first-child');
            if (firstCell) {
                if (firstCell.textContent.trim() === todayName) {
                    row.classList.add('today-highlight');
                } else {
                    row.classList.remove('today-highlight');
                }
            }
        });
    }
}