document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const showUploadFormButton = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const memesGrid = document.querySelector('.memes-grid');

    // Добавляем HTML для индикатора загрузки
    const uploadProgress = document.createElement('div');
    uploadProgress.className = 'upload-progress';
    uploadProgress.innerHTML = `
        <div class="upload-spinner"></div>
        <div class="upload-progress-text">Загрузка файла...</div>
        <div class="progress-bar">
            <div class="progress-bar-fill"></div>
        </div>
    `;
    document.body.appendChild(uploadProgress);

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
            
            // Показываем индикатор загрузки
            uploadProgress.classList.add('show');
            const progressText = uploadProgress.querySelector('.upload-progress-text');
            const progressBarFill = uploadProgress.querySelector('.progress-bar-fill');
            
            fetch('memes.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    // Обновляем текст
                    progressText.textContent = 'Файл успешно загружен!';
                    progressBarFill.style.width = '100%';
                    
                    // Добавляем новые мемы в сетку
                    data.files.forEach(fileInfo => {
                        const memeItem = createMemeItem(fileInfo);
                        const memesGrid = document.querySelector('.memes-grid');
                        memesGrid.insertBefore(memeItem, memesGrid.firstChild);
                    });
                    
                    // Скрываем индикатор загрузки через 1 секунду
                    setTimeout(() => {
                        uploadProgress.classList.remove('show');
                        document.getElementById('upload-form-container').classList.remove('show');
                        uploadForm.reset();
                        progressBarFill.style.width = '0%';
                    }, 1000);
                } else {
                    throw new Error(data.message || 'Ошибка загрузки');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                progressText.textContent = 'Ошибка загрузки: ' + error.message;
                progressText.style.color = '#ff4444';
                
                // Скрываем индикатор загрузки через 3 секунды
                setTimeout(() => {
                    uploadProgress.classList.remove('show');
                    progressBarFill.style.width = '0%';
                    progressText.style.color = 'white';
                    progressText.textContent = 'Загрузка файла...';
                }, 3000);
            });

            // Имитация прогресса загрузки
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress > 90) {
                    clearInterval(interval);
                    return;
                }
                progressBarFill.style.width = Math.min(progress, 90) + '%';
            }, 500);
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
    
    // Добавляем кнопку удаления
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '×';
    deleteButton.onclick = (e) => {
        e.stopPropagation(); // Предотвращаем открытие модального окна
        showDeleteConfirmation(memeInfo.id, memeItem);
    };
    
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
    imageContainer.appendChild(deleteButton); // Добавляем кнопку удаления
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

function showDeleteConfirmation(memeId, memeElement) {
    const modal = document.createElement('div');
    modal.className = 'modal delete-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'delete-modal-content';
    
    modalContent.innerHTML = `
        <h3>Подтверждение удаления</h3>
        <input type="password" id="delete-password" placeholder="Введите пароль" class="delete-password-input">
        <div class="delete-modal-buttons">
            <button class="cancel-button">Отмена</button>
            <button class="confirm-button">
                <span class="button-text">Удалить</span>
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    setTimeout(() => modal.classList.add('show'), 10);
    
    const cancelButton = modalContent.querySelector('.cancel-button');
    const confirmButton = modalContent.querySelector('.confirm-button');
    const buttonText = confirmButton.querySelector('.button-text');
    const passwordInput = modalContent.querySelector('#delete-password');
    
    const setLoading = (loading) => {
        confirmButton.disabled = loading;
        confirmButton.classList.toggle('loading', loading);
        if (loading) {
            buttonText.innerHTML = `
                <span class="loading-spinner"></span>
                Удаление...
            `;
        } else {
            buttonText.textContent = 'Удалить';
        }
    };
    
    cancelButton.onclick = () => modal.remove();
    
    confirmButton.onclick = () => {
        const password = passwordInput.value;
        
        if (!password) {
            alert('Пожалуйста, введите пароль');
            return;
        }
        
        setLoading(true);
        
        fetch('delete_meme.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                meme_id: memeId,
                password: password
            })
        })
        .then(async response => {
            const text = await response.text();
            try {
                const data = JSON.parse(text);
                if (!response.ok) {
                    throw new Error(data.message || 'Ошибка сервера');
                }
                return data;
            } catch (e) {
                console.error('Server response:', text);
                throw new Error('Некорректный ответ сервера');
            }
        })
        .then(data => {
            if (data.status === 'success') {
                // Анимация удаления
                memeElement.style.opacity = '0';
                memeElement.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    memeElement.remove();
                    modal.remove();
                }, 300);
            } else {
                throw new Error(data.message || 'Неизвестная ошибка');
            }
        })
        .catch(error => {
            console.error('Error details:', error);
            alert(error.message || 'Произошла ошибка при удалении');
            setLoading(false);
        })
        .finally(() => {
            // Сбрасываем состояние загрузки только если произошла ошибка
            // В случае успеха модальное окно будет уже удалено
            if (modal.parentElement) {
                setLoading(false);
            }
        });
    };
    
    // Закрытие по клику вне модального окна
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    // Обработка клавиши Enter
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !confirmButton.disabled) {
            confirmButton.click();
        }
    });
    
    // Фокус на поле ввода
    passwordInput.focus();
}