import { apiRequest, showError, showSuccess } from './utils.js';

export const createPost = async () => {
    const content = document.getElementById('post-content').value;
    if (!content.trim()) {
        showError('Пост не может быть пустым');
        return;
    }

    try {
        const response = await apiRequest('/posts', {
            method: 'POST',
            body: JSON.stringify({ content })
        });

        if (response.success) {
            showSuccess('Пост создан');
            loadPosts();
        }
    } catch (error) {
        showError('Ошибка при создании поста');
    }
};

export const loadPosts = async () => {
    try {
        const response = await apiRequest('/posts');
        if (response.success) {
            const postsContainer = document.getElementById('posts-container');
            postsContainer.innerHTML = '';
            response.data.forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${post.authorAvatar || '/default-avatar.png'}" alt="Аватар" class="post-avatar">
                        <div class="post-info">
                            <span class="post-author">${post.author}</span>
                            <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    <div class="post-actions">
                        <span class="post-action" onclick="likePost('${post.id}')">
                            <i class="fas fa-heart ${post.likedBy.includes(localStorage.getItem('user')) ? 'liked' : ''}"></i> ${post.likes}
                        </span>
                        <span class="post-action" onclick="deletePost('${post.id}')">
                            <i class="fas fa-trash"></i> Удалить
                        </span>
                    </div>
                `;
                postsContainer.appendChild(postElement);
            });
        }
    } catch (error) {
        showError('Ошибка при загрузке постов');
    }
};

export const likePost = async (postId) => {
    try {
        const response = await apiRequest(`/posts/${postId}/like`, {
            method: 'POST'
        });
        if (response.success) {
            loadPosts();
        }
    } catch (error) {
        showError('Ошибка при лайке поста');
    }
};

export const deletePost = async (postId) => {
    try {
        const response = await apiRequest(`/posts/${postId}`, {
            method: 'DELETE'
        });
        if (response.success) {
            showSuccess('Пост удалён');
            loadPosts();
        }
    } catch (error) {
        showError('Ошибка при удалении поста');
    }
};

export const initializePostHandlers = () => {
    const postForm = document.querySelector('.post-form');
    if (postForm) {
        postForm.addEventListener('submit', (event) => {
            event.preventDefault();
            createPost();
        });
    }
};