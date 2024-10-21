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
                listItem.textContent = folder;

                const filesList = document.createElement('ul');
                files.forEach(file => {
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
            }
            categoryDiv.appendChild(folderList);
            categoriesContainer.appendChild(categoryDiv);
        }
    }

    function loadExistingFiles() {
        fetch('get_files.php')
            .then(response => response.json())
            .then(data => {
                fileStorage = data;
                displayFiles();
            })
            .catch(error => {
                console.error('Error loading existing files:', error);
            });
    }

    loadExistingFiles();

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
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                uploadMessage.textContent = data.message;
                
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
        })
        .catch(error => {
            console.error('Error:', error);
            uploadMessage.textContent = `File upload failed: ${error.message}`;
        })
        .finally(() => {
            // Clear the file input after upload attempt
            fileInput.value = '';
        });
    });

    displayFiles();
});