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
                    const memesGrid = document.querySelector('.memes-grid');
                    data.filePaths.forEach(path => {
                        const memeItem = createMemeItem(path);
                        memesGrid.insertBefore(memeItem, memesGrid.firstChild);
                    });
                    
                    document.getElementById('upload-form-container').classList.remove('show');
                    this.reset();
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки:', error);
            });
        });
    }
});

function createMemeItem(imageUrl, authorName = 'Аноним') {
    const memeItem = document.createElement('div');
    memeItem.className = 'meme-item';
    
    // Контейнер для изображения
    const imageContainer = document.createElement('div');
    imageContainer.className = 'meme-image-container';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Мем';
    
    // Информация о меме
    const memeInfo = document.createElement('div');
    memeInfo.className = 'meme-info';
    
    const authorInfo = document.createElement('div');
    authorInfo.className = 'meme-author';
    
    // Аватар автора (можно заменить на реальный аватар)
    const authorAvatar = document.createElement('img');
    authorAvatar.className = 'author-avatar';
    authorAvatar.src = '../assets/default-avatar.png'; // Путь к дефолтному аватару
    authorAvatar.alt = authorName;
    
    const authorNameSpan = document.createElement('span');
    authorNameSpan.textContent = authorName;
    
    // Собираем структуру
    authorInfo.appendChild(authorAvatar);
    authorInfo.appendChild(authorNameSpan);
    memeInfo.appendChild(authorInfo);
    
    imageContainer.appendChild(img);
    memeItem.appendChild(imageContainer);
    memeItem.appendChild(memeInfo);
    
    // Открытие модального окна при клике
    imageContainer.addEventListener('click', () => {
        openModal(imageUrl);
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