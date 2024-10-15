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
    document.addEventListener('DOMContentLoaded', () => {
        const uploadForm = document.getElementById('upload-form');
        const fileInput = document.getElementById('file-input');
        const uploadMessage = document.getElementById('upload-message');
        const fileList = document.getElementById('file-list');
    
        // Обработка загрузки файла
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
    
        // Получение списка файлов
        async function fetchFiles() {
            try {
                const response = await fetch('/files');
                const files = await response.json();
                fileList.innerHTML = '';
                files.forEach(file => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `/download/${file}`;
                    a.textContent = file;
                    li.appendChild(a);
                    fileList.appendChild(li);
                });
            } catch (error) {
                console.error('Ошибка при получении списка файлов:', error);
            }
        }
    
        // Инициализация списка файлов при загрузке страницы
        fetchFiles();
    });
});