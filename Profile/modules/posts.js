import { API_BASE_URL, showError, showSuccess, apiRequest } from './utils.js';

// Функция создания нового поста
async function createPost() {
    const content = document.getElementById('post-content').value;
    const imageInput = document.getElementById('post-image');
    const file = imageInput.files[0];

    if (!content && !file) {
        showError('Добавьте текст или изображение для публикации');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('content', content);
        if (file) {
            formData.append('image', file);
        }

        const response = await apiRequest('/posts/create', {
            method: 'POST',
            body: formData
        });

        if (response.success) {
            document.getElementById('post-content').value = '';
            imageInput.value = '';
            await loadPosts();
            showSuccess('Пост опубликован');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showError(error.message || 'Ошибка при создании поста');
    }
}

// Функция загрузки постов
async function loadPosts() {
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const response = await apiRequest(`/posts/user/${userData.data.username}`);

        if (response.success) {
            const postsContainer = document.getElementById('posts-container');
            postsContainer.innerHTML = response.data.map(post => `
                <div class="post">
                    <div class="post-header">
                        <img src="${post.authorAvatar ? `${API_BASE_URL}${post.authorAvatar}` : `${API_BASE_URL}/uploads/avatars/default-avatar.png`}" 
                             alt="Avatar" class="post-avatar">
                        <div class="post-info">
                            <div class="post-author">${post.author}</div>
                            <div class="post-date">${new Date(post.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${post.image ? `<img src="${API_BASE_URL}${post.image}" alt="Post image" class="post-image">` : ''}
                    <div class="post-actions">
                        <div class="post-action" onclick="likePost('${post.id}')">
                            <i class="fas fa-heart ${post.likedBy.includes(userData.data.username) ? 'liked' : ''}"></i>
                            <span>${post.likes || 0}</span>
                        </div>
                        ${post.author === userData.data.username ? `
                            <div class="post-action" onclick="deletePost('${post.id}')">
                                <i class="fas fa-trash"></i>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        showError('Ошибка при загрузке постов');
    }
}

// Функция для лайка поста
async function likePost(postId) {
    try {
        const response = await apiRequest(`/posts/${postId}/like`, {
            method: 'POST'
        });

        if (response.success) {
            await loadPosts();
        }
    } catch (error) {
        console.error('Error liking post:', error);
        showError('Ошибка при попытке поставить лайк');
    }
}

// Функция удаления поста
async function deletePost(postId) {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) {
        return;
    }

    try {
        const response = await apiRequest(`/posts/${postId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            await loadPosts();
            showSuccess('Пост удален');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        showError('Ошибка при удалении поста');
    }
}

// Функция для предпросмотра изображения
function previewPostImage(input) {
    const preview = document.getElementById('post-image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = '';
        previewContainer.style.display = 'none';
    }
}

// Функция для удаления предпросмотра изображения
function removeImagePreview() {
    const input = document.getElementById('post-image');
    const preview = document.getElementById('post-image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    
    input.value = '';
    preview.src = '';
    previewContainer.style.display = 'none';
}

// Инициализация обработчиков событий для постов
function initializePostHandlers() {
    const imageInput = document.getElementById('post-image');
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            previewPostImage(this);
        });
    }

    const removePreviewButton = document.getElementById('remove-preview');
    if (removePreviewButton) {
        removePreviewButton.addEventListener('click', removeImagePreview);
    }

    // Обработчик формы создания поста
    const postForm = document.getElementById('post-form');
    if (postForm) {
        postForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createPost();
        });
    }
}

// Единственный экспорт всех функций в конце файла
export {
    createPost,
    loadPosts,
    likePost,
    deletePost,
    previewPostImage,
    removeImagePreview,
    initializePostHandlers
};