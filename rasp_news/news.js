document.addEventListener("DOMContentLoaded", () => {
    const addPostBtn = document.querySelector('.add-post-btn');
    const modal = document.getElementById('postModal');
    const closeBtn = document.querySelector('.close');
    const postForm = document.getElementById('postForm');

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

    // Обрабатываем отправку формы
    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const postType = document.getElementById('postType').value;
        const imageFile = document.getElementById('imageInput').files[0];
        const postText = document.getElementById('postText').value;

        // Add validation
        if (!imageFile) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        try {
            // Создаем новую карточку
            const cardGrid = document.querySelector('.card-grid');
            const newCard = document.createElement('div');
            newCard.className = 'card';
            
            // Создаем превью изображения
            const imageUrl = URL.createObjectURL(imageFile);
            
            newCard.innerHTML = `
                <img src="${imageUrl}" alt="Post Image">
                <div class="card-info">
                    <p class="message">[${postType}] ${postText}</p>
                </div>
            `;

            cardGrid.prepend(newCard);
            
            // Clean up the object URL to prevent memory leaks
            URL.revokeObjectURL(imageUrl);
            
            // Очищаем форму и закрываем модальное окно
            postForm.reset();
            modal.style.display = "none";
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Произошла ошибка при создании поста');
        }
    });
});
