document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('homework-form');
    const table = document.getElementById('homework-table');

    // Проверка существования таблицы
    if (!table) {
        console.error('Таблица с id "homework-table" не найдена');
        return;
    }

    const tbody = table.getElementsByTagName('tbody')[0];

    // Проверка существования tbody
    if (!tbody) {
        console.error('Элемент tbody в таблице не найден');
        return;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const subject = document.getElementById('subject').value;
        const task = document.getElementById('task').value;

        const newRow = tbody.insertRow();
        newRow.innerHTML = `
            <td>${subject}</td>
            <td>${task.replace(/\n/g, '<br>')}</td>
            <td>
                <select class="status-select">
                    <option value="В процессе">В процессе</option>
                    <option value="Выполнено">Выполнено</option>
                    <option value="Не начато">Не начато</option>
                </select>
            </td>
            <td>
                <input type="file" class="file-input" style="display:none;">
                <button class="file-button">Добавить файл</button>
                <span class="file-name"></span>
            </td>
        `;

        // Добавляем обработчики событий для новой строки
        addRowEventListeners(newRow);

        // Очистка формы после добавления
        form.reset();
    });

    function addRowEventListeners(row) {
        const fileInput = row.querySelector('.file-input');
        const fileButton = row.querySelector('.file-button');
        const fileName = row.querySelector('.file-name');
        const statusSelect = row.querySelector('.status-select');

        fileButton.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', async function() {
            if (this.files[0]) {
                const file = this.files[0];
                fileName.textContent = file.name;
                
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const response = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error('Ошибка загрузки файла');
                    }

                    const result = await response.json();
                    
                    // Создаем ссылку на загруженный файл
                    const fileLink = document.createElement('a');
                    fileLink.href = result.fileUrl;
                    fileLink.textContent = file.name;
                    fileLink.target = '_blank';
                    
                    // Заменяем текст имени файла на ссылку
                    fileName.textContent = '';
                    fileName.appendChild(fileLink);
                    
                    // Скрываем кнопку после успешной загрузки
                    fileButton.style.display = 'none';
                    
                } catch (error) {
                    console.error('Ошибка:', error);
                    fileName.textContent = 'Ошибка загрузки файла';
                    fileName.style.color = 'red';
                }
            }
        });

        statusSelect.addEventListener('change', function() {
            updateRowColor(row, this.value);
        });

        // Устанавливаем начальный цвет
        updateRowColor(row, statusSelect.value);
    }

    function updateRowColor(row, status) {
        row.classList.remove('status-in-progress', 'status-completed', 'status-not-started');
        switch(status) {
            case 'В процессе':
                row.classList.add('status-in-progress');
                break;
            case 'Выполнено':
                row.classList.add('status-completed');
                break;
            case 'Не начато':
                row.classList.add('status-not-started');
                break;
        }
    }

    // Автоматическое изменение размера текстового поля
    const taskTextarea = document.getElementById('task');

    taskTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
});