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

    // Добавляем проверку формы
    if (!form) {
        console.error('Форма с id "homework-form" не найдена');
        return;
    }

    // Получаем textarea один раз и используем его везде
    const taskTextarea = document.getElementById('task');
    if (!taskTextarea) {
        console.error('Textarea с id "task" не найден');
        return;
    }

    // Автоматическое изменение размера текстового поля
    taskTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    // Добавляем функцию удаления задания
    function addDeleteButton(row) {
        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '✖';
        deleteButton.className = 'delete-button';
        deleteButton.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите удалить это задание?')) {
                row.remove();
            }
        });
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);
    }

    // Модифицируем обработчик отправки формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const subject = document.getElementById('subject').value.trim();
        const task = taskTextarea.value.trim();

        // Валидация полей
        if (!subject || !task) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

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
                <input type="file" class="file-input" style="display:none;" accept=".pdf,.doc,.docx,.txt">
                <button class="file-button">Добавить файл</button>
                <span class="file-name"></span>
                <div class="upload-progress" style="display:none;"></div>
            </td>
        `;

        // Добавляем кнопку удаления
        addDeleteButton(newRow);
        
        // Добавляем обработчики событий для новой строки
        addRowEventListeners(newRow);

        // Сохраняем в localStorage
        saveToLocalStorage();

        // Очистка формы после добавления
        form.reset();
        taskTextarea.style.height = 'auto';
    });

    // Добавляем индикатор загрузки
    function createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'upload-progress';
        progressBar.style.width = '0%';
        return progressBar;
    }

    // Модифицируем функцию обработки файлов
    function addRowEventListeners(row) {
        const fileInput = row.querySelector('.file-input');
        const fileButton = row.querySelector('.file-button');
        const fileName = row.querySelector('.file-name');
        const statusSelect = row.querySelector('.status-select');

        fileButton.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', async function() {
            if (this.files.length > 0) {
                for (const file of this.files) {
                    // Проверка типа файла
                    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
                    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                    if (!allowedTypes.includes(fileExtension)) {
                        alert('Неподдерживаемый тип файла. Разрешены только: ' + allowedTypes.join(', '));
                        return;
                    }
                    
                    // Проверка размера файла (максимум 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Файл слишком большой. Максимальный размер 5MB');
                        return;
                    }

                    const fileContainer = document.createElement('div');
                    fileContainer.className = 'file-container';
                    
                    const progressBar = createProgressBar();
                    fileContainer.appendChild(progressBar);
                    
                    fileName.appendChild(fileContainer);

                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/upload', true);
                        
                        // Добавляем отслеживание прогресса загрузки
                        xhr.upload.onprogress = function(e) {
                            if (e.lengthComputable) {
                                const percentComplete = (e.loaded / e.total) * 100;
                                progressBar.style.width = percentComplete + '%';
                            }
                        };

                        xhr.onload = function() {
                            if (xhr.status === 200) {
                                const response = JSON.parse(xhr.responseText);
                                const fileLink = document.createElement('a');
                                fileLink.href = response.fileUrl;
                                fileLink.textContent = file.name;
                                fileLink.target = '_blank';
                                fileContainer.appendChild(fileLink);
                            } else {
                                throw new Error('Ошибка загрузки файла');
                            }
                        };

                        xhr.onerror = function() {
                            throw new Error('Ошибка сети');
                        };

                        xhr.send(formData);
                        
                    } catch (error) {
                        console.error('Ошибка:', error);
                        fileContainer.innerHTML = `<span class="error">Ошибка загрузки файла: ${error.message}</span>`;
                    }
                }
            }
        });

        // Добавляем обработчик для сохранения при изменении статуса
        statusSelect.addEventListener('change', function() {
            updateRowColor(row, this.value);
            saveToLocalStorage();
        });
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

    // Функция сохранения в localStorage
    function saveToLocalStorage() {
        const homework = [];
        const rows = tbody.getElementsByTagName('tr');
        
        for (let row of rows) {
            homework.push({
                subject: row.cells[0].textContent,
                task: row.cells[1].innerHTML,
                status: row.querySelector('.status-select').value
            });
        }

        localStorage.setItem('homework', JSON.stringify(homework));
    }

    // Загрузка данных из localStorage при старте
    function loadFromLocalStorage() {
        const homework = JSON.parse(localStorage.getItem('homework') || '[]');
        
        homework.forEach(item => {
            const newRow = tbody.insertRow();
            newRow.innerHTML = `
                <td>${item.subject}</td>
                <td>${item.task}</td>
                <td>
                    <select class="status-select">
                        <option value="В процессе" ${item.status === 'В процессе' ? 'selected' : ''}>В процессе</option>
                        <option value="Выполнено" ${item.status === 'Выполнено' ? 'selected' : ''}>Выполнено</option>
                        <option value="Не начато" ${item.status === 'Не начато' ? 'selected' : ''}>Не начато</option>
                    </select>
                </td>
                <td>
                    <input type="file" class="file-input" style="display:none;" accept=".pdf,.doc,.docx,.txt">
                    <button class="file-button">Добавить файл</button>
                    <span class="file-name"></span>
                    <div class="upload-progress" style="display:none;"></div>
                </td>
            `;
            
            addDeleteButton(newRow);
            addRowEventListeners(newRow);
        });
    }

    // Загружаем сохраненные данные при запуске
    loadFromLocalStorage();

    // Добавляем функцию для очистки всех заданий
    function addClearAllButton() {
        const clearAllButton = document.createElement('button');
        clearAllButton.textContent = 'Очистить все';
        clearAllButton.className = 'clear-all-button';
        clearAllButton.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите удалить все задания?')) {
                tbody.innerHTML = '';
                localStorage.removeItem('homework');
            }
        });
        
        const container = document.querySelector('.container');
        container.insertBefore(clearAllButton, table);
    }

    // Добавляем функцию для экспорта данных
    function addExportButton() {
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Экспортировать';
        exportButton.className = 'export-button';
        exportButton.addEventListener('click', function() {
            const homework = JSON.parse(localStorage.getItem('homework') || '[]');
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(homework));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "homework_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
        
        const container = document.querySelector('.container');
        container.insertBefore(exportButton, table);
    }

    // Инициализация дополнительных функций
    addClearAllButton();
    addExportButton();

    // Добавляем обработчик для автосохранения при изменениях
    const observer = new MutationObserver(function(mutations) {
        saveToLocalStorage();
    });

    observer.observe(tbody, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
    });
});