document.addEventListener('DOMContentLoaded', function() {
    const showUploadFormBtn = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const uploadForm = document.getElementById('upload-form');
    const homeworkFeed = document.querySelector('.homework-feed');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');

    fileInput.addEventListener('change', function() {
        const fileNames = Array.from(this.files).map(file => file.name);
        fileNameDisplay.textContent = fileNames.join(', ');
    });

    // Показать/скрыть форму загрузки
    showUploadFormBtn.addEventListener('click', () => {
        const password = prompt('Введите пароль для добавления задания:');
        if (password === 'Gg3985502') {
            uploadFormContainer.classList.toggle('active');
        } else {
            showNotification('Неверный пароль', 'error');
        }
    });

    // Обработка отправки формы
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(uploadForm);
        
        // Проверяем заполнение обязательных полей
        const title = formData.get('title');
        const subject = formData.get('subject');
        const deadline = formData.get('deadline');
        
        if (!title || !subject || !deadline) {
            showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }
        
        // Добавляем индикатор загрузки
        const submitButton = uploadForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Загрузка...';
        
        try {
            const response = await fetch('homework.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                addHomeworkToFeed(result.data);
                uploadForm.reset();
                fileNameDisplay.textContent = '';
                uploadFormContainer.classList.remove('active');
                showNotification('Задание успешно добавлено!', 'success');
            } else {
                throw new Error(result.message || 'Ошибка при добавлении задания');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message || 'Произошла ошибка при добавлении задания', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });

    // Функция для добавления задания в ленту
    function addHomeworkToFeed(homework) {
        const card = document.createElement('div');
        card.className = 'homework-card';
        
        // Форматируем дату
        const deadline = new Date(homework.deadline).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        card.innerHTML = `
            <div class="homework-header">
                <h3>${homework.title}</h3>
                <button class="delete-btn" data-id="${homework.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="homework-info">
                <span><i class="fas fa-book"></i> ${homework.subject}</span>
                <span><i class="fas fa-calendar"></i> Срок сдачи: ${deadline}</span>
            </div>
            <div class="homework-description">
                ${homework.description}
            </div>
            ${homework.files ? `
                <div class="homework-files">
                    ${homework.files.map(file => `
                        <a href="${file.url}" class="file-attachment" download>
                            <i class="fas fa-file"></i>
                            ${file.name}
                        </a>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        // Добавляем обработчик для кнопки удаления
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async () => {
            const password = prompt('Введите пароль для удаления задания:');
            if (password !== 'Gg3985502') {
                showNotification('Неверный пароль', 'error');
                return;
            }

            if (confirm('Вы уверены, что хотите удалить это задание?')) {
                try {
                    const formData = new FormData();
                    formData.append('id', homework.id);
                    formData.append('password', password);
                    
                    const response = await fetch('delete_homework.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        card.remove();
                        showNotification('Задание успешно удалено', 'success');
                    } else {
                        throw new Error(result.message || 'Ошибка при удалении задания');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showNotification(error.message, 'error');
                }
            }
        });
        
        homeworkFeed.insertBefore(card, homeworkFeed.firstChild);
    }

    // Улучшенная функция показа уведомлений
    function showNotification(message, type = 'success') {
        // Удаляем предыдущие уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Добавляем иконку в зависимости от типа уведомления
        const icon = type === 'success' ? '✓' : '⚠';
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Добавляем класс для анимации появления
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Загрузка существующих заданий при загрузке страницы
    async function loadHomework() {
        try {
            const response = await fetch('get_homework.php');
            if (!response.ok) {
                throw new Error('Ошибка при загрузке заданий');
            }
            
            const homework = await response.json();
            
            if (homework.length === 0) {
                homeworkFeed.innerHTML = '<div class="no-homework">Нет доступных заданий</div>';
                return;
            }
            
            homework.forEach(item => {
                addHomeworkToFeed(item);
            });
        } catch (error) {
            console.error('Error loading homework:', error);
            showNotification('Ошибка при загрузке заданий', 'error');
        }
    }

    loadHomework();
});
