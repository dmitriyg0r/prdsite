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
                    // Очищаем форму
                    uploadForm.reset();
                } else {
                    console.error('Ошибка загрузки:', data.message);
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
            });
        });
    }
});

function createMemeItem(imageUrl) {
    const memeItem = document.createElement('div');
    memeItem.className = 'meme-item';
    
    const img = document.createElement('img');
    img.alt = 'Мем';
    
    img.onload = function() {
        requestAnimationFrame(() => {
            memeItem.style.opacity = '1';
        });
    };
    
    img.onerror = function() {
        console.error('Ошибка загрузки изображения:', imageUrl);
        memeItem.classList.add('error');
    };
    
    img.src = imageUrl;
    memeItem.appendChild(img);
    return memeItem;
}