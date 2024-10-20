document.addEventListener('DOMContentLoaded', function() {
    const fileCategories = {
        'Вычислительные системы': ['Материалы', 'Лекции'],
        'Мат. анализ': ['Материалы', 'Лекции'],
        'Физ. дисциплина': ['Материалы', 'Лекции'],
        'Основы науч. исслед.': ['Материалы', 'Лекции'],
        'Иност. язык': ['Материалы', 'Лекции'],
        'ПОЗИ': ['Материалы', 'Лекции'],
        'Дискрет. мат.': ['Материалы', 'Лекции'],
        'Экономика': ['Материалы', 'Лекции'],
        'База данных': ['Материалы', 'Лекции'],
        'Алгоритмизация и программ': ['Материалы', 'Лекции']
    };

    const categoryIcons = {
        'Вычислительные системы': '💻',
        'Мат. анализ': '📊',
        'Физ. дисциплина': '🏋️',
        'Основы науч. исслед.': '🔍',
        'Иност. язык': '🌍',
        'ПОЗИ': '🔐',
        'Дискрет. мат.': '🧮',
        'Экономика': '💰',
        'База данных': '🗄️',
        'Алгоритмизация и программ': '🖥️'
    };

    // Создаем хранилище для файлов
    let fileStorage = {};

    // Инициализируем хранилище для каждой категории и папки
    for (const category in fileCategories) {
        fileStorage[category] = {};
        for (const folder of fileCategories[category]) {
            fileStorage[category][folder] = [];
        }
    }

    const categoriesContainer = document.getElementById('file-categories');
    const categorySelect = document.getElementById('category-select');
    const folderSelect = document.getElementById('folder-select');
    const uploadForm = document.getElementById('upload-form');
    const uploadMessage = document.getElementById('upload-message');

    // Заполняем выпадающий список категорий
    for (const category in fileCategories) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${categoryIcons[category]} ${category}`;
        categorySelect.appendChild(option);
    }

    // Заполнем выпадающий список папок
    categorySelect.addEventListener('change', function() {
        const selectedCategory = categorySelect.value;
        folderSelect.innerHTML = '';
        fileCategories[selectedCategory].forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            folderSelect.appendChild(option);
        });
    });

    // Функция для отображения файлов
    function displayFiles() {
        categoriesContainer.innerHTML = '';
        for (const [category, folders] of Object.entries(fileCategories)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'file-category';
            
            const categoryTitle = document.createElement('h3');
            categoryTitle.innerHTML = `${categoryIcons[category]} ${category}`;
            categoryDiv.appendChild(categoryTitle);

            const folderList = document.createElement('ul');
            folders.forEach(folder => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = '#';
                link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-folder" viewBox="0 0 16 16">
                    <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707z"/>
                </svg> ${folder}`;
                listItem.appendChild(link);

                // Отображаем файлы в папке
                const filesList = document.createElement('ul');
                filesList.style.display = 'none'; // Скрываем список файлов по умолчанию
                fileStorage[category][folder].forEach(file => {
                    const fileItem = document.createElement('li');
                    fileItem.textContent = file;
                    filesList.appendChild(fileItem);
                });
                listItem.appendChild(filesList);

                // Добавляем обработчик события для открытия/закрытия папки
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    filesList.style.display = filesList.style.display === 'none' ? 'block' : 'none';
                });

                folderList.appendChild(listItem);
            });

            categoryDiv.appendChild(folderList);
            categoriesContainer.appendChild(categoryDiv);
        }
    }

    // Обработка отправки формы
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(uploadForm);

        fetch('/var/www/downloads.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                uploadMessage.textContent = data.message;
                
                // Добавляем файл в fileStorage
                const category = formData.get('category');
                const folder = formData.get('folder');
                const fileName = formData.get('file').name;
                if (!fileStorage[category]) {
                    fileStorage[category] = {};
                }
                if (!fileStorage[category][folder]) {
                    fileStorage[category][folder] = [];
                }
                fileStorage[category][folder].push(fileName);
                
                uploadForm.reset();
                // Обновляем отображение файлов
                displayFiles();
            } else {
                uploadMessage.textContent = data.message;
            }
        })
        .catch(error => {
            uploadMessage.textContent = 'Ошибка при загрузке файла.';
        });
    });

    // Инициальное отображение файлов
    displayFiles();
});
