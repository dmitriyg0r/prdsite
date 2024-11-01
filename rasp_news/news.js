document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('postModal');
    const addPostBtn = document.querySelector('.add-post-btn');
    const closeBtn = document.querySelector('.close');
    const postForm = document.getElementById('postForm');
    const newsContainer = document.querySelector('.news');

    // Assuming you have a checkbox for toggling the theme
    const themeToggle = document.getElementById('theme-toggle');

    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-theme', themeToggle.checked);
    });

    // Открытие модального окна
    addPostBtn.addEventListener('click', openModal);

    // Закрытие модального окна
    closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Обработка отправки формы
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        const postData = {
            type: document.getElementById('postType').value,
            text: document.getElementById('postText').value,
            password: document.getElementById('postPassword').value
        };

        formData.append('postData', JSON.stringify(postData));
        formData.append('image', document.getElementById('imageInput').files[0]);

        try {
            const response = await fetch('../rasp_news/newsupload.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                loadPosts(); // Перезагружаем посты
                modal.style.display = 'none';
                postForm.reset();
            } else {
                alert('Ошибка при публикации поста: ' + result.error);
            }
        } catch (error) {
            alert('Ошибка при отправке данных: ' + error);
        }
    });

    // Загрузка постов
    async function loadPosts() {
        try {
            const response = await fetch('../rasp_news/get_posts.php');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const posts = await response.json();
            
            if (!Array.isArray(posts)) {
                throw new Error('Invalid data format');
            }

            const newsContent = document.createElement('div');
            newsContent.className = 'news-content';
            
            const sortedPosts = posts.sort((a, b) => b.timestamp - a.timestamp);
            
            newsContent.innerHTML = sortedPosts.map(post => `
                <div class="post ${post.type.toLowerCase()}" data-id="${post.id}">
                    <img src="../rasp_news/news/${post.image}" alt="Post image" loading="lazy">
                    <div class="post-info">
                        <p>${escapeHtml(post.text)}</p>
                        <span class="timestamp">${formatDate(post.timestamp)}</span>
                    </div>
                </div>
            `).join('');

            const existingContent = newsContainer.querySelector('.news-content');
            if (existingContent) {
                existingContent.replaceWith(newsContent);
            } else {
                newsContainer.appendChild(newsContent);
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            showError('Не удалось загрузить посты');
        }
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        newsContainer.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    // Загружаем посты при загрузке страницы
    loadPosts();

    // Добавляем обработчик для удаления постов
    newsContainer.addEventListener('contextmenu', async function(e) {
        e.preventDefault();
        const post = e.target.closest('.post');
        if (!post) return;

        const password = prompt('Введите пароль для удаления:');
        if (!password) return;

        try {
            const response = await fetch('../rasp_news/delete_post.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: post.querySelector('img').src.split('/').pop(),
                    password: password
                })
            });

            const result = await response.json();
            if (result.success) {
                post.remove();
            } else {
                alert('Ошибка при удалении поста: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            alert('Ошибка при удалении поста');
        }
    });

    // Отображение имени выбранного файла
    document.getElementById('imageInput').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name;
        const label = document.querySelector('.file-input-label');
        if (fileName) {
            label.innerHTML = `<i class="fas fa-image"></i> ${fileName}`;
        } else {
            label.innerHTML = `<i class="fas fa-image"></i> Выберите изображение`;
        }
    });

    // Анимация открытия/закрытия модального окна
    function openModal() {
        modal.style.display = 'block';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }

    function closeModal() {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            postForm.reset();
            document.querySelector('.file-input-label').innerHTML = 
                `<i class="fas fa-image"></i> Выберите изображение`;
        }, 300);
    }
});
