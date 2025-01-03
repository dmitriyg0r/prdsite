// Добавляем обработчик для публикации поста
document.getElementById('publish-post-btn').addEventListener('click', async () => {
    const content = document.getElementById('post-content').value.trim();
    if (!content) {
        alert('Пожалуйста, введите текст поста');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('userId', currentUser.id);
        formData.append('content', content);

        // Если есть изображение, добавляем его в FormData
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview.style.display !== 'none') {
            const imageFile = imagePreview.dataset.file;
            if (imageFile) {
                formData.append('image', imageFile);
            }
        }

        const response = await fetch('https://adminflow.ru/api/posts/create', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка при создании поста');
        }

        // Очищаем форму
        document.getElementById('post-content').value = '';
        if (imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.dataset.file = null;
        }

        // Перезагружаем ленту
        await loadFeedPosts();

    } catch (err) {
        console.error('Error publishing post:', err);
        alert('Ошибка при публикации поста');
    }
});

// Добавляем функцию для загрузки изображения
function triggerImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const preview = document.getElementById('image-preview');
            const previewImg = preview.querySelector('img');
            
            // Сохраняем файл для последующей отправки
            preview.dataset.file = file;
            
            // Показываем превью
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// Добавляем функцию для удаления изображения
function removeImage() {
    const preview = document.getElementById('image-preview');
    preview.style.display = 'none';
    preview.dataset.file = null;
    preview.querySelector('img').src = '';
}
