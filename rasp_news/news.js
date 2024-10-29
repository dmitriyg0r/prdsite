document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('postModal');
    const addPostBtn = document.querySelector('.add-post-btn');
    const closeBtn = document.querySelector('.close');
    const postForm = document.getElementById('postForm');
    const newsContainer = document.querySelector('.news');

    // Открытие модального окна
    addPostBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // Закрытие модального окна
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
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
            const posts = await response.json();
            
            const postsHTML = posts.map(post => `
                <div class="post ${post.type.toLowerCase()}">
                    <img src="../rasp_news/news/${post.image}" alt="Post image">
                    <p>${post.text}</p>
                    <span class="timestamp">${new Date(post.timestamp * 1000).toLocaleString()}</span>
                </div>
            `).join('');

            const newsContent = document.createElement('div');
            newsContent.className = 'news-content';
            newsContent.innerHTML = postsHTML;

            // Очищаем предыдущие посты и добавляем новые
            const existingContent = newsContainer.querySelector('.news-content');
            if (existingContent) {
                existingContent.remove();
            }
            newsContainer.appendChild(newsContent);
        } catch (error) {
            console.error('Ошибка при загрузке постов:', error);
        }
    }

    // Загружаем посты при загрузке страницы
    loadPosts();
});
