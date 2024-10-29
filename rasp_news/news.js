document.addEventListener("DOMContentLoaded", () => {
    const addPostBtn = document.querySelector('.add-post-btn');
    const modal = document.getElementById('postModal');
    const closeBtn = document.querySelector('.close');
    const postForm = document.getElementById('postForm');
    const cardGrid = document.querySelector('.card-grid');

    // Загружаем существующие посты при загрузке страницы
    loadPosts();

    async function loadPosts() {
        try {
            const response = await fetch('../rasp_news/get_posts.php');
            const posts = await response.json();
            
            // Очищаем текущие посты
            cardGrid.innerHTML = '';
            
            // Добавляем посты на страницу
            posts.forEach(post => {
                const newCard = createPostCard(post);
                cardGrid.appendChild(newCard);
            });
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }

    function createPostCard(post) {
        const newCard = document.createElement('div');
        newCard.className = 'card';
        
        newCard.innerHTML = `
            <img src="../rasp_news/news/${post.image}" alt="Post Image">
            <div class="card-info">
                <p class="message">[${post.type}] ${post.text}</p>
            </div>
        `;
        
        return newCard;
    }

    // Открываем модальное окно при клике на кнопку
    addPostBtn.addEventListener('click', () => {
        modal.style.display = "block";
    });

    // Закрываем модальное окно при клике на крестик
    closeBtn.addEventListener('click', () => {
        modal.style.display = "none";
    });

    // Закрываем модальное окно при клике вне его области
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Обновляем обработчик отправки формы
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const postType = document.getElementById('postType').value;
        const imageFile = document.getElementById('imageInput').files[0];
        const postText = document.getElementById('postText').value;

        if (!imageFile) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('postData', JSON.stringify({
                type: postType,
                text: postText
            }));

            const response = await fetch('../rasp_news/upload.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                // Перезагружаем посты
                await loadPosts();
                
                // Очищаем форму и закрываем модальное окно
                postForm.reset();
                modal.style.display = "none";
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Произошла ошибка при создании поста');
        }
    });
});
