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
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Функция для добавления задания в ленту
    function addHomeworkToFeed(homework) {
        const card = document.createElement('div');
        card.className = 'homework-card';
        
        card.innerHTML = `
            <h3>${homework.title}</h3>
            <div class="homework-info">
                <span>${homework.subject}</span>
                <span>Срок сдачи: ${homework.deadline}</span>
            </div>
            <div class="homework-description">
                ${homework.description}
            </div>
            ${homework.files ? `
                <div class="homework-files">
                    ${homework.files.map(file => `
                        <a href="${file.url}" class="file-attachment" download>
                            ${file.name}
                        </a>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        homeworkFeed.insertBefore(card, homeworkFeed.firstChild);
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
