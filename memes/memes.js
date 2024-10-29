document.addEventListener('DOMContentLoaded', function() {
    const showUploadFormButton = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const uploadForm = document.getElementById('upload-form');

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

    // Обработка выбора файла
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.querySelector('.file-input-label');
    const fileName = document.getElementById('file-name');

    if (fileInput && fileLabel && fileName) {
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                fileName.textContent = `Выбран файл: ${this.files[0].name}`;
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
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInput.files = e.dataTransfer.files;
                fileName.textContent = `Выбран файл: ${e.dataTransfer.files[0].name}`;
                fileLabel.style.borderColor = 'var(--button-hover)';
            }
        });
    }

    // Добавляем загрузку мемов
    loadMemes();

    // Добавляем обновление сетки после загрузки нового мема
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // ... существующий код загрузки ...
        
        // После успешной загрузки:
        const memesGrid = document.querySelector('.memes-grid');
        const newMemeItem = createMemeItem(/* URL нового мема */);
        memesGrid.insertBefore(newMemeItem, memesGrid.firstChild);
    });
});

function createMemeItem(imageUrl) {
    const memeItem = document.createElement('div');
    memeItem.className = 'meme-item';
    
    const img = document.createElement('img');
    img.alt = 'Мем';
    
    // Добавляем обработку загрузки и ошибок
    img.onload = function() {
        console.log('Изображение загружено:', imageUrl);
        requestAnimationFrame(() => {
            memeItem.style.opacity = '1';
        });
    };
    
    img.onerror = function() {
        console.error('Ошибка загрузки изображения:', imageUrl);
        memeItem.classList.add('error');
    };
    
    // Устанавливаем src после добавления обработчиков
    img.src = imageUrl;
    
    memeItem.appendChild(img);
    return memeItem;
}

function loadMemes() {
    const memesGrid = document.querySelector('.memes-grid');
    
    // Проверяем путь к изображению
    const imagePath = '../memes/memesy/талисман.png';
    console.log('Загрузка изображения:', imagePath);
    
    // Создаем тестовый массив
    const mockMemes = Array(12).fill(imagePath);
    
    mockMemes.forEach((memeUrl, index) => {
        setTimeout(() => {
            const memeItem = createMemeItem(memeUrl);
            memesGrid.appendChild(memeItem);
        }, index * 100);
    });
}

// Добавляем вывод в консоль при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, начинаем загрузку мемов');
    loadMemes();
}); 