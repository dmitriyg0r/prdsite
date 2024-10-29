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
                    data.files.forEach(fileInfo => {
                        const memeItem = createMemeItem(fileInfo);
                        const memesGrid = document.querySelector('.memes-grid');
                        memesGrid.insertBefore(memeItem, memesGrid.firstChild);
                    });
                    
                    document.getElementById('upload-form-container').classList.remove('show');
                    this.reset();
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

function createMemeItem(memeInfo) {
    const memeItem = document.createElement('div');
    memeItem.className = 'meme-item';
    
    // Контейнер для изображения
    const imageContainer = document.createElement('div');
    imageContainer.className = 'meme-image-container';
    
    const img = document.createElement('img');
    img.src = memeInfo.path;
    img.alt = 'Мем';
    
    // Информация о меме
    const memeInfoDiv = document.createElement('div');
    memeInfoDiv.className = 'meme-info';
    
    const authorInfo = document.createElement('div');
    authorInfo.className = 'meme-author';
    authorInfo.textContent = memeInfo.author;
    
    const description = document.createElement('div');
    description.className = 'meme-description';
    description.textContent = memeInfo.description || '';
    
    const date = document.createElement('div');
    date.className = 'meme-date';
    date.textContent = new Date(memeInfo.timestamp * 1000).toLocaleDateString();
    
    // Собираем структуру
    memeInfoDiv.appendChild(authorInfo);
    if (memeInfo.description) {
        memeInfoDiv.appendChild(description);
    }
    memeInfoDiv.appendChild(date);
    
    imageContainer.appendChild(img);
    memeItem.appendChild(imageContainer);
    memeItem.appendChild(memeInfoDiv);
    
    // Открытие модального окна при клике
    imageContainer.addEventListener('click', () => {
        openModal(memeInfo.path);
    });
    
    return memeItem;
}

function openModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const closeButton = document.createElement('span');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    
    const modalImg = document.createElement('img');
    modalImg.src = imageUrl;
    
    modal.appendChild(closeButton);
    modal.appendChild(modalImg);
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    closeButton.onclick = () => modal.remove();
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

// Загрузка существующих мемов
function loadExistingMemes() {
    fetch('get_memes.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success' && data.memes.length > 0) {
                const memesGrid = document.querySelector('.memes-grid');
                memesGrid.innerHTML = '';
                
                data.memes.forEach(memeInfo => {
                    const memeItem = createMemeItem(memeInfo);
                    memesGrid.appendChild(memeItem);
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки мемов:', error);
        });
}