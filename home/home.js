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
        uploadFormContainer.classList.toggle('active');
    });

    // Обработка отправки формы
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(uploadForm);
        
        try {
            const response = await fetch('homework.php', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                addHomeworkToFeed(result);
                uploadForm.reset();
                uploadFormContainer.classList.remove('active');
                showNotification('Задание успешно добавлено!');
            } else {
                throw new Error('Ошибка при добавлении задания');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Произошла ошибка при добавлении задания', 'error');
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
        
        // Добавляем иконки и улучшаем разметку
        card.innerHTML = `
            <h3>${homework.title}</h3>
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
        
        homeworkFeed.insertBefore(card, homeworkFeed.firstChild);
    }

    // Добавляем функцию уведомлений
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Загрузка существующих заданий при загрузке страницы
    async function loadHomework() {
        try {
            const response = await fetch('get_homework.php');
            const homework = await response.json();
            
            homework.forEach(item => {
                addHomeworkToFeed(item);
            });
        } catch (error) {
            console.error('Error loading homework:', error);
        }
    }

    loadHomework();
});
