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

    let fileStorage = {};

    const categoriesContainer = document.getElementById('file-categories');
    const categorySelect = document.getElementById('category-select');
    const folderSelect = document.getElementById('folder-select');
    const uploadForm = document.getElementById('upload-form');
    const uploadMessage = document.getElementById('upload-message');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.querySelector('.file-input-label');
    const fileName = document.getElementById('file-name');

    for (const category in fileCategories) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${categoryIcons[category]} ${category}`;
        categorySelect.appendChild(option);
    }

    categorySelect.addEventListener('change', function() {
        const selectedCategory = categorySelect.value;
        folderSelect.innerHTML = '<option value="">Выберите папку</option>';
        fileCategories[selectedCategory].forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            folderSelect.appendChild(option);
        });
    });

    function displayFiles() {
        categoriesContainer.innerHTML = '';
        for (const [category, folders] of Object.entries(fileStorage)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'file-category';
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = `${categoryIcons[category] || ''} ${category}`;
            categoryDiv.appendChild(categoryTitle);
            const folderList = document.createElement('ul');
            
            for (const [folder, files] of Object.entries(folders)) {
                const listItem = document.createElement('li');
                const folderHeader = document.createElement('div');
                folderHeader.className = 'folder-header';
                
                // Добавляем стрелку и название папки
                const arrow = document.createElement('span');
                arrow.className = 'folder-arrow';
                arrow.textContent = '▶';
                
                const folderName = document.createElement('span');
                folderName.className = 'folder-name';
                folderName.textContent = folder;
                
                folderHeader.appendChild(arrow);
                folderHeader.appendChild(folderName);
                listItem.appendChild(folderHeader);

                // Создаем контейнер для файлов
                const filesList = document.createElement('ul');
                filesList.className = 'files-list collapsed';

                Object.values(files).forEach(file => {
                    const fileItem = document.createElement('li');
                    const fileItemContent = document.createElement('div');
                    fileItemContent.className = 'file-item';

                    const fileName = document.createElement('span');
                    fileName.textContent = file;
                    fileItemContent.appendChild(fileName);

                    const downloadButton = document.createElement('a');
                    downloadButton.href = `uploads/${encodeURIComponent(category)}/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
                    downloadButton.textContent = 'Скачать';
                    downloadButton.className = 'download-button';
                    fileItemContent.appendChild(downloadButton);

                    fileItem.appendChild(fileItemContent);
                    filesList.appendChild(fileItem);
                });

                listItem.appendChild(filesList);
                folderList.appendChild(listItem);

                // Добавляем обработчик клика для разворачивания/сворачивания
                folderHeader.addEventListener('click', function() {
                    filesList.classList.toggle('collapsed');
                    arrow.classList.toggle('rotated');
                });
            }
            
            categoryDiv.appendChild(folderList);
            categoriesContainer.appendChild(categoryDiv);
        }
    }
    
    
    

    function loadExistingFiles() {
        fetch('get_files.php')
            .then(response => response.text()) // Измените здесь на text()
            .then(text => {
                console.log('Raw response text:', text); // Выведите сырой ответ
                try {
                    const data = JSON.parse(text);
                    fileStorage = data;
                    displayFiles();
                } catch (error) {
                    console.error('JSON parse error:', error);
                    console.log('Raw response text:', text); // Выведите сырой ответ
                }
            })
            .catch(error => {
                console.error('Error loading existing files:', error);
            });
    }
    
    
    

    loadExistingFiles();

    const showUploadFormButton = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');

    if (showUploadFormButton && uploadFormContainer) {
        showUploadFormButton.addEventListener('click', function() {
            uploadFormContainer.classList.toggle('show');
        });

        // Закрыть форму при клике вне её
        document.addEventListener('click', function(event) {
            if (!uploadFormContainer.contains(event.target) && event.target !== showUploadFormButton) {
                uploadFormContainer.classList.remove('show');
            }
        });
    }

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const adminPassword = prompt("Please enter the admin password:");
    
        if (adminPassword !== "Gg3985502") {
            uploadMessage.textContent = "Invalid admin password. Access denied.";
            return;
        }
    
        uploadMessage.textContent = "Uploading files...";
        const formData = new FormData(uploadForm);
        formData.append('admin_password', adminPassword);
    
        fetch('downloads.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(text => {
            console.log('Raw response text:', text); // Вывод сырых данных для отладки
            try {
                const data = JSON.parse(text);
                if (data.status === 'success') {
                    uploadMessage.textContent = data.message;
                    // обновление структуры файлов
                    if (!fileStorage[data.category]) {
                        fileStorage[data.category] = {};
                    }
                    if (!fileStorage[data.category][data.folder]) {
                        fileStorage[data.category][data.folder] = [];
                    }
                    data.files.forEach(file => {
                        fileStorage[data.category][data.folder].push(file);
                    });
    
                    uploadForm.reset();
                    displayFiles();
                } else {
                    uploadMessage.textContent = data.message || 'An unknown error occurred';
                    if (data.debug_output) {
                        console.error('Debug output:', data.debug_output);
                    }
                }
            } catch (error) {
                console.error('JSON parse error:', error);
                console.log('Raw response text:', text); // Вывод сырых данных
                uploadMessage.textContent = `File upload failed: ${error.message}`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            uploadMessage.textContent = `File upload failed: ${error.message}`;
        })
        .finally(() => {
            // Очистка поля ввода файлов после попытки загрузки
            fileInput.value = '';
        });
    });    

    const themeToggle = document.getElementById('theme-toggle');
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    const body = document.body;

    // Theme toggle
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-theme');
        localStorage.setItem('theme', body.classList.contains('dark-theme') ? 'dark' : 'light');
    });

    // Set initial theme
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
    }

    // Menu toggle
    menuToggle.addEventListener('click', function(event) {
        menu.classList.toggle('show');
        event.stopPropagation(); // Предотвращаем закрытие меню сразу после открытия
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!menu.contains(event.target) && !menuToggle.contains(event.target)) {
            menu.classList.remove('show');
        }
    });

    if (fileInput && fileLabel && fileName) {
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files.length > 0) {
                if (this.files.length === 1) {
                    fileName.textContent = `Выбран файл: ${this.files[0].name}`;
                } else {
                    fileName.textContent = `Выбрано файлов: ${this.files.length}`;
                }
                fileLabel.style.borderColor = 'var(--button-hover)';
            } else {
                fileName.textContent = '';
                fileLabel.style.borderColor = 'var(--button-background)';
            }
        });

        // Drag & Drop функционал
        fileLabel.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        fileLabel.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        fileLabel.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                if (e.dataTransfer.files.length === 1) {
                    fileName.textContent = `Выбран файл: ${e.dataTransfer.files[0].name}`;
                } else {
                    fileName.textContent = `Выбрано файлов: ${e.dataTransfer.files.length}`;
                }
                fileLabel.style.borderColor = 'var(--button-hover)';
            }
        });
    }

    document.querySelector('.mobile-menu-toggle').addEventListener('click', function() {
        this.classList.toggle('active');
        document.querySelector('.mobile-menu').classList.toggle('active');
    });
});
