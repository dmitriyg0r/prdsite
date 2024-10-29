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
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const files = this.querySelector('input[type="file"]').files;
            const maxSize = 3 * 1024 * 1024; // 3 МБ в байтах
            let hasLargeFiles = false;

            // Проверяем размер каждого файла
            for (let file of files) {
                if (file.size > maxSize) {
                    hasLargeFiles = true;
                    console.error(`Файл ${file.name} превышает максимальный размер (3 МБ)`);
                }
            }

            if (hasLargeFiles) {
                alert('Один или несколько файлов превышают максимальный размер (3 МБ)');
                return;
            }

            const formData = new FormData(this);

            try {
                const response = await fetch('memes.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.status === 'success') {
                    data.filePaths.forEach(path => {
                        const memeItem = createMemeItem(path);
                        memesGrid.insertBefore(memeItem, memesGrid.firstChild);
                    });
                    
                    uploadFormContainer.classList.remove('show');
                    uploadForm.reset();

                    // Показываем ошибки, если они есть
                    if (data.errors && data.errors.length > 0) {
                        alert('Некоторые файлы не были загружены:\n' + data.errors.join('\n'));
                    }
                } else {
                    console.error('Ошибка:', data.message);
                }
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
        });
    }
});

async function loadExistingMemes() {
    try {
        const response = await fetch('get_memes.php');
        const data = await response.json();
        
        if (data.status === 'success' && data.memes.length > 0) {
            const memesGrid = document.querySelector('.memes-grid');
            memesGrid.innerHTML = '';
            
            // Загружаем все мемы асинхронно
            const memePromises = data.memes.map(path => createMemeItem(path));
            const memeElements = await Promise.all(memePromises);
            
            // Добавляем элементы в сетку
            memeElements.forEach(memeItem => {
                memesGrid.appendChild(memeItem);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки мемов:', error);
    }
}

function createMemeItem(imageUrl) {
    return new Promise((resolve) => {
        const memeItem = document.createElement('div');
        memeItem.className = 'meme-item';
        
        const img = document.createElement('img');
        
        img.onload = function() {
            // Получаем реальные размеры изображения
            const width = this.naturalWidth;
            const height = this.naturalHeight;
            
            // Устанавливаем максимальную ширину для контейнера
            const maxWidth = 800; // Максимальная ширина
            const maxHeight = 600; // Максимальная высота
            
            // Вычисляем новые размеры с сохранением пропорций
            let newWidth = width;
            let newHeight = height;
            
            // Если изображение больше максимальных размеров, уменьшаем его
            if (width > maxWidth) {
                newWidth = maxWidth;
                newHeight = (height * maxWidth) / width;
            }
            
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = (width * maxHeight) / height;
            }
            
            // Устанавливаем размеры контейнера
            memeItem.style.width = `${newWidth}px`;
            
            resolve(memeItem);
        };
        
        img.src = imageUrl;
        img.alt = 'Мем';
        
        // Добавляем обработчик клика для открытия модального окна
        memeItem.addEventListener('click', () => {
            openModal(imageUrl);
        });
        
        memeItem.appendChild(img);
    });
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
    
    // Показываем модальное окно
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Обработчики закрытия
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