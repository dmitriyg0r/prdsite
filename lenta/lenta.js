let currentUser = null; // Объявляем глобально

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        window.location.href = '/authreg/authreg.html';
        return;
    }

    // Инициализация обработчиков формы создания поста
    initializePostForm();
    
    // Загрузка постов
    await loadFeedPosts();
});

async function loadFeedPosts() {
    try {
        const response = await fetch(`https://adminflow.ru:5003/api/feed?userId=${currentUser.id}`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке ленты');
        }
        
        const data = await response.json();
        displayPosts(data.posts);
    } catch (err) {
        console.error('Error loading feed:', err);
        alert('Ошибка при загрузке ленты');
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    
    container.innerHTML = posts.length ? posts.map(post => {
        const mediaContent = post.image_url ? `
            <img src="${post.image_url}" alt="Post image" class="post-image">
        ` : '';

        return `
            <div class="post" data-post-id="${post.id}">
                <div class="post-header">
                    <a href="/profile/profile.html?id=${post.user_id}">
                        <img src="${post.author_avatar || '/uploads/avatars/default.png'}" 
                             alt="${post.author_name}" 
                             class="post-avatar">
                    </a>
                    <div class="post-info">
                        <a href="/profile/profile.html?id=${post.user_id}" class="post-author">
                            ${post.author_name}
                        </a>
                        <div class="post-date">${new Date(post.created_at).toLocaleString()}</div>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${mediaContent}
                <div class="post-actions">
                    <button class="post-action like-action ${post.is_liked ? 'liked' : ''}" 
                            data-post-id="${post.id}">
                        <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i>
                        <span class="likes-count">${post.likes_count || 0}</span>
                    </button>
                    <div class="post-action">
                        <i class="far fa-comment"></i>
                        <span>${post.comments_count || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<div class="no-posts">Нет публикаций</div>';

    // Добавляем обработчики для лайков
    document.querySelectorAll('.like-action').forEach(btn => {
        btn.addEventListener('click', () => toggleLike(btn.dataset.postId));
    });
}

function initializePostForm() {
    const postForm = document.querySelector('.post-form');
    const imageInput = document.getElementById('post-image');
    const imagePreview = document.getElementById('image-preview');
    const publishBtn = document.getElementById('publish-post-btn');

    imageInput.addEventListener('change', handleImageSelect);
    publishBtn.addEventListener('click', handlePostSubmit);
}

async function handlePostSubmit() {
    const content = document.getElementById('post-content').value;
    const imageInput = document.getElementById('post-image');
    
    if (!content.trim() && !imageInput.files[0]) {
        alert('Добавьте текст или изображение');
        return;
    }

    const formData = new FormData();
    formData.append('content', content);
    formData.append('userId', currentUser.id);
    
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const response = await fetch('https://adminflow.ru:5003/api/posts', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка при создании поста');
        }

        // Очищаем форму
        document.getElementById('post-content').value = '';
        imageInput.value = '';
        document.getElementById('image-preview').innerHTML = '';

        // Перезагружаем ленту
        await loadFeedPosts();
    } catch (err) {
        console.error('Error creating post:', err);
        alert('Ошибка при создании поста');
    }
}

async function toggleLike(postId) {
    try {
        const response = await fetch('https://adminflow.ru:5003/api/posts/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                postId: postId
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка при обработке лайка');
        }

        const data = await response.json();
        
        // Обновляем UI
        const likeBtn = document.querySelector(`.like-action[data-post-id="${postId}"]`);
        const likesCount = likeBtn.querySelector('.likes-count');
        const likeIcon = likeBtn.querySelector('i');

        likesCount.textContent = data.likes_count;
        likeBtn.classList.toggle('liked');
        likeIcon.className = data.liked ? 'fas fa-heart' : 'far fa-heart';
    } catch (err) {
        console.error('Error toggling like:', err);
        alert('Ошибка при обработке лайка');
    }
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('image-preview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <div class="image-preview-container">
                    <img src="${e.target.result}" alt="Preview">
                    <button class="remove-image-btn" onclick="removeImage()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    document.getElementById('post-image').value = '';
    document.getElementById('image-preview').innerHTML = '';
}
