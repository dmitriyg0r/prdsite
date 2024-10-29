document.addEventListener('DOMContentLoaded', function() {
    const showUploadFormButton = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const uploadForm = document.getElementById('upload-form');
    const memesGrid = document.querySelector('.memes-grid');

    // Загружаем существующие мемы
    loadExistingMemes();

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
            
            // Добавляем пароль администратора
            formData.append('admin_password', 'Gg3985502');

            fetch('memes.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Добавляем новые мемы в начало сетки
                    data.filePaths.forEach(filePath => {
                        const newMemeItem = createMemeItem(filePath);
                        memesGrid.insertBefore(newMemeItem, memesGrid.firstChild);
                    });
                    
                    uploadFormContainer.classList.remove('show');
                    uploadForm.reset();
                } else {
                    console.error('Ошибка загрузки:', data.message);
                    if (data.errors) {
                        console.error('Детали ошибок:', data.errors);
                    }
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
            });
        });
    }
});

function loadExistingMemes() {
    fetch('get_memes.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const memesGrid = document.querySelector('.memes-grid');
                memesGrid.innerHTML = ''; // Очищаем сетку
                
                data.memes.forEach(memePath => {
                    const memeItem = createMemeItem(memePath);
                    memesGrid.appendChild(memeItem);
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки мемов:', error);
        });
}

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