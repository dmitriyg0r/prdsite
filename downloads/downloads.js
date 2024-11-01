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
        
        // Сортировка категорий по алфавиту
        const sortedCategories = Object.entries(fileStorage).sort((a, b) => a[0].localeCompare(b[0]));
        
        for (const [category, folders] of sortedCategories) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'file-category';
            
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = `${categoryIcons[category] || '📁'} ${category}`;
            categoryDiv.appendChild(categoryTitle);
            
            const folderList = document.createElement('ul');
            
            // Сортировка папок по алфавиту
            const sortedFolders = Object.entries(folders).sort((a, b) => a[0].localeCompare(b[0]));
            
            for (const [folder, files] of sortedFolders) {
                const listItem = document.createElement('li');
                const folderHeader = document.createElement('div');
                folderHeader.className = 'folder-header';
                
                const arrow = document.createElement('span');
                arrow.className = 'folder-arrow';
                arrow.textContent = '▶';
                
                const folderName = document.createElement('span');
                folderName.className = 'folder-name';
                folderName.textContent = `${folder} (${files.length})`;
                
                folderHeader.appendChild(arrow);
                folderHeader.appendChild(folderName);
                listItem.appendChild(folderHeader);

                const filesList = document.createElement('ul');
                filesList.className = 'files-list collapsed';

                // Сортировка файлов по алфавиту
                const sortedFiles = [...files].sort((a, b) => a.localeCompare(b));

                sortedFiles.forEach(file => {
                    const fileItem = document.createElement('li');
                    const fileItemContent = document.createElement('div');
                    fileItemContent.className = 'file-item';

                    const fileName = document.createElement('span');
                    fileName.textContent = file;
                    fileItemContent.appendChild(fileName);

                    const downloadButton = document.createElement('a');
                    downloadButton.href = encodeURI(`uploads/${category}/${folder}/${file}`);
                    downloadButton.textContent = 'Скачать';
                    downloadButton.className = 'download-button';
                    downloadButton.download = file; // Добавляем атрибут download
                    fileItemContent.appendChild(downloadButton);

                    fileItem.appendChild(fileItemContent);
                    filesList.appendChild(fileItem);
                });

                listItem.appendChild(filesList);
                folderList.appendChild(listItem);
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

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const adminPassword = prompt("Введите пароль администратора:");
            if (!adminPassword) return;

            if (adminPassword !== "Gg3985502") {
                uploadMessage.textContent = "Неверный пароль администратора.";
                return;
            }

            uploadMessage.textContent = "Загрузка файлов...";
            const formData = new FormData(uploadForm);
            formData.append('admin_password', adminPassword);

            const response = await fetch('downloads.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                uploadMessage.textContent = data.message;
                
                // Обновление структуры файлов
                const category = formData.get('category');
                const folder = formData.get('folder');
                
                if (!fileStorage[category]) {
                    fileStorage[category] = {};
                }
                if (!fileStorage[category][folder]) {
                    fileStorage[category][folder] = [];
                }
                
                data.files.forEach(file => {
                    if (!fileStorage[category][folder].includes(file)) {
                        fileStorage[category][folder].push(file);
                    }
                });

                uploadForm.reset();
                fileName.textContent = '';
                fileLabel.style.borderColor = 'var(--button-background)';
                displayFiles();
                uploadFormContainer.classList.remove('show');
            } else {
                uploadMessage.textContent = data.message || 'Произошла ошибка при загрузке';
            }
        } catch (error) {
            console.error('Error:', error);
            uploadMessage.textContent = `Ошибка загрузки: ${error.message}`;
        }
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
});
