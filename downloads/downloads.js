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
        if (!fileStorage || Object.keys(fileStorage).length === 0) {
            console.log('No files to display');
            categoriesContainer.innerHTML = '<p>Нет доступных файлов</p>';
            return;
        }

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
                    fileName.onclick = () => {
                        const filePath = encodeURI(`../downloads/uploads/${category}/${folder}/${file}`);
                        previewFile(filePath);
                    };
                    fileItemContent.appendChild(fileName);

                    const downloadButton = document.createElement('a');
                    downloadButton.href = encodeURI(`../downloads/uploads/${category}/${folder}/${file}`);
                    downloadButton.textContent = 'Скачать';
                    downloadButton.className = 'download-button';
                    downloadButton.download = file;
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
            .then(response => response.json())
            .then(data => {
                console.log('Loaded files:', data);
                fileStorage = data;
                displayFiles();
            })
            .catch(error => {
                console.error('Error loading files:', error);
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
            if (!adminPassword) {
                uploadMessage.textContent = "Загрузка отменена";
                return;
            }

            if (adminPassword !== "Gg3985502") {
                uploadMessage.textContent = "Неверный пароль администратора.";
                return;
            }

            const formData = new FormData(uploadForm);
            formData.append('admin_password', adminPassword);

            uploadMessage.textContent = "Загрузка файлов...";
            
            const response = await fetch('downloads.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Upload response:', data);
            
            if (data.status === 'success') {
                uploadMessage.textContent = data.message;
                await loadExistingFiles();
                uploadForm.reset();
                fileName.textContent = '';
                fileLabel.style.borderColor = 'var(--button-background)';
                uploadFormContainer.classList.remove('show');
            } else {
                uploadMessage.textContent = data.message || 'Произошла ошибка при загрузке';
            }
        } catch (error) {
            console.error('Upload error:', error);
            uploadMessage.textContent = `Ошибка загрузки: ${error.message || 'Неизвестная ошибка'}`;
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

    function createPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-content">
                <span class="preview-close">&times;</span>
                <iframe class="preview-iframe"></iframe>
            </div>
        `;
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.preview-close');
        closeBtn.onclick = () => modal.style.display = 'none';
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
        
        return modal;
    }

    function previewFile(filePath) {
        const modal = document.querySelector('.preview-modal') || createPreviewModal();
        const iframe = modal.querySelector('.preview-iframe');
        
        // Получаем расширение файла
        const extension = filePath.split('.').pop().toLowerCase();
        
        // Список поддерживаемых форматов для предпросмотра
        const previewableExtensions = ['pdf', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
        
        if (previewableExtensions.includes(extension)) {
            iframe.src = filePath;
            modal.style.display = 'flex';
        } else {
            alert('Предпросмотр для данного типа файла не поддерживается');
        }
    }

    function displayFiles() {
        if (!fileStorage || Object.keys(fileStorage).length === 0) {
            console.log('No files to display');
            categoriesContainer.innerHTML = '<p>Нет доступных файлов</p>';
            return;
        }

        categoriesContainer.innerHTML = '';
        const sortedCategories = Object.entries(fileStorage).sort((a, b) => a[0].localeCompare(b[0]));
        
        for (const [category, folders] of sortedCategories) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'file-category';
            
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = `${categoryIcons[category] || '📁'} ${category}`;
            categoryDiv.appendChild(categoryTitle);
            
            const folderList = document.createElement('ul');
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

                // Добавляем обработчик клика на заголовок папки
                folderHeader.addEventListener('click', () => {
                    arrow.classList.toggle('rotated');
                    filesList.classList.toggle('collapsed');
                });

                const sortedFiles = [...files].sort((a, b) => a.localeCompare(b));

                sortedFiles.forEach(file => {
                    const fileItem = document.createElement('li');
                    const fileItemContent = document.createElement('div');
                    fileItemContent.className = 'file-item';

                    const fileName = document.createElement('span');
                    fileName.textContent = file;
                    fileName.onclick = () => {
                        const filePath = encodeURI(`../downloads/uploads/${category}/${folder}/${file}`);
                        previewFile(filePath);
                    };
                    fileItemContent.appendChild(fileName);

                    const downloadButton = document.createElement('a');
                    downloadButton.href = encodeURI(`../downloads/uploads/${category}/${folder}/${file}`);
                    downloadButton.textContent = 'Скачать';
                    downloadButton.className = 'download-button';
                    downloadButton.download = file;
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
});
