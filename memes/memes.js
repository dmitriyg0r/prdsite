document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const showUploadFormButton = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const memesGrid = document.querySelector('.memes-grid');

    // Загружаем существующие мемы при загрузке страницы
    loadExistingMemes();

    // Показать/скрыть форму
    if (showUploadFormButton && uploadFormContainer) {
        showUploadFormButton.addEventListener('click', () => {
            uploadFormContainer.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!uploadFormContainer.contains(e.target) && 
                e.target !== showUploadFormButton) {
                uploadFormContainer.classList.remove('show');
            }
        });
    }

    // Загрузка файла
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
                if (data.status === 'success') {
                    data.filePaths.forEach(path => {
                        const memeItem = createMemeItem(path);
                        memesGrid.insertBefore(memeItem, memesGrid.firstChild);
                    });
                    
                    uploadFormContainer.classList.remove('show');
                    uploadForm.reset();
                } else {
                    console.error('Ошибка:', data.message);
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки:', error);
            });
        });
    }
});

function loadExistingMemes() {
    fetch('get_memes.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.memes.length > 0) {
                const memesGrid = document.querySelector('.memes-grid');
                memesGrid.innerHTML = ''; // Очищаем сетку
                
                data.memes.forEach(path => {
                    const memeItem = createMemeItem(path);
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
    img.src = imageUrl;
    img.alt = 'Мем';
    
    memeItem.appendChild(img);
    return memeItem;
}