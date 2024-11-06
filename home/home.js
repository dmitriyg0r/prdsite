document.addEventListener('DOMContentLoaded', function() {
    const showUploadFormBtn = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const uploadForm = document.getElementById('upload-form');
    const homeworkFeed = document.querySelector('.homework-feed');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');

    let currentPassword = '';

    fileInput.addEventListener('change', function() {
        const fileNames = Array.from(this.files).map(file => file.name);
        fileNameDisplay.textContent = fileNames.join(', ');
    });

    // Показать/скрыть форму загрузки
    showUploadFormBtn.addEventListener('click', () => {
        const password = prompt('Введите пароль для добавления задания:');
        if (password === 'Gg3985502') {
            currentPassword = password;
            uploadFormContainer.classList.toggle('active');
        } else {
            showNotification('Неверный пароль', 'error');
        }
    });

    function validateForm(formData) {
        const errors = {};
        
        // Title validation
        const title = formData.get('title').trim();
        if (!title) {
            errors.title = 'Название задания обязательно';
        } else if (title.length < 3) {
            errors.title = 'Название должно содержать минимум 3 символа';
        }
        
        // Subject validation
        if (!formData.get('subject')) {
            errors.subject = 'Выберите предмет';
        }
        
        // Deadline validation
        const deadline = new Date(formData.get('deadline'));
        const today = new Date();
        if (!formData.get('deadline')) {
            errors.deadline = 'Укажите срок сдачи';
        } else if (deadline < today) {
            errors.deadline = 'Срок сдачи не может быть в прошлом';
        }
        
        return errors;
    }

    // Обработка отправки формы
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(uploadForm);
        formData.append('password', currentPassword);
        
        const errors = validateForm(formData);
        
        if (Object.keys(errors).length > 0) {
            Object.entries(errors).forEach(([field, message]) => {
                showFieldError(field, message);
            });
            return;
        }
        
        const submitButton = uploadForm.querySelector('button[type="submit"]');
        setLoadingState(submitButton, true);
        
        try {
            const response = await fetch('homework.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                addHomeworkToFeed(result.data);
                resetForm();
                showNotification('Задание успешно добавлено!', 'success');
                uploadFormContainer.classList.remove('active');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setLoadingState(submitButton, false);
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

            if (confirm('Вы уверены, что хотите удть это задание?')) {
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
                homeworkFeed.innerHTML = `
                    <div class="no-homework">
                        <i class="fas fa-tasks"></i>
                        <p>Нет активных заданий</p>
                    </div>
                `;
                return;
            }
            
            homework.forEach(item => addHomeworkToFeed(item));
        } catch (error) {
            console.error('Error:', error);
            showNotification(error.message, 'error');
        }
    }

    loadHomework();

    function initializeFilters() {
        const filterForm = document.createElement('form');
        filterForm.className = 'homework-filters';
        filterForm.innerHTML = `
            <select name="subject" id="filter-subject">
                <option value="">Все предметы</option>
                <!-- Add subject options -->
            </select>
            <select name="sort" id="filter-sort">
                <option value="deadline">По сроку сдачи</option>
                <option value="created">По дате создания</option>
            </select>
        `;
        
        homeworkFeed.insertAdjacentElement('beforebegin', filterForm);
        
        filterForm.addEventListener('change', () => {
            refreshHomeworkFeed();
        });
    }

    function setLoadingState(button, isLoading) {
        if (isLoading) {
            // Сохраняем оригинальный текст кнопки и отключаем её
            button.disabled = true;
            const originalText = button.textContent;
            button.setAttribute('data-original-text', originalText);
            // Показываем спиннер загрузки
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        } else {
            // Возвращаем кнопку в исходное состояние
            button.disabled = false;
            const originalText = button.getAttribute('data-original-text');
            button.textContent = originalText;
            button.removeAttribute('data-original-text');
        }
    }
});
