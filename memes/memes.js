document.addEventListener('DOMContentLoaded', function() {
    const showUploadFormButton = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const uploadForm = document.getElementById('upload-form');
    const memesGrid = document.querySelector('.memes-grid');

    // Показываем/скрываем форму загрузки
    if (showUploadFormButton && uploadFormContainer) {
        showUploadFormButton.addEventListener('click', function() {
            uploadFormContainer.classList.toggle('show');
        });

        document.addEventListener('click', function(event) {
            if (!uploadFormContainer.contains(event.target) && 
                event.target !== showUploadFormButton) {
                uploadFormContainer.classList.remove('show');
            }
        });
    }

    // Обработка загрузки файла
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);

            fetch('memes.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Создаем новый элемент мема
                    const newMemeItem = createMemeItem(data.filePath);
                    // Добавляем его в начало сетки
                    memesGrid.insertBefore(newMemeItem, memesGrid.firstChild);
                    // Закрываем форму загрузки
                    uploadFormContainer.classList.remove('show');
                }
            });
        });
    }
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
    
    // Обновляем путь к изображению
    const imagePath = '../memesy/талисман.png';
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