let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        window.location.href = '/authreg/authreg.html';
        return;
    }
    
    // Загрузка постов
    await loadFeedPosts();
});

async function loadFeedPosts() {
    try {
        const response = await fetch(`https://adminflow.ru/api/feed?userId=${currentUser.id}`);
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
            <div class="post-image-container">
                <img src="${post.image_url}" 
                     alt="Post image" 
                     class="post-image" 
                     onclick="openImageInFullscreen('${post.image_url}', ${JSON.stringify(post).replace(/"/g, '&quot;')})">
            </div>
        ` : '';

        // Добавляем кнопку удаления для админов
        const deleteButton = currentUser.role === 'admin' ? `
            <button class="post-action delete-action" onclick="deletePost(${post.id})">
                <i class="fas fa-trash"></i>
            </button>
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
                    ${deleteButton}
                </div>
                <div class="post-content">${post.content}</div>
                ${mediaContent}
                <div class="post-actions">
                    <button class="post-action like-action ${post.is_liked ? 'liked' : ''}" 
                            data-post-id="${post.id}">
                        <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i>
                        <span class="likes-count">${post.likes_count || 0}</span>
                    </button>
                    <button class="post-action comment-action" onclick="toggleComments(${post.id})">
                        <i class="far fa-comment"></i>
                        <span class="comments-count">${post.comments_count || 0}</span>
                    </button>
                </div>
                <div class="comments-section" id="comments-${post.id}" style="display: none;">
                    <div class="comments-container" id="comments-container-${post.id}"></div>
                    <div class="comment-form">
                        <textarea class="comment-input" placeholder="Написать комментарий..." rows="1"></textarea>
                        <button class="comment-submit" onclick="submitComment(${post.id}, this)">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<div class="no-posts">Нет публикаций от ваших друзей</div>';

    // Добавляем обработчики
    document.querySelectorAll('.like-action').forEach(btn => {
        btn.addEventListener('click', () => toggleLike(btn.dataset.postId));
    });
}

async function toggleLike(postId) {
    try {
        const response = await fetch('https://adminflow.ru/api/posts/like', {
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

async function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    const isHidden = commentsSection.style.display === 'none';
    
    if (isHidden) {
        commentsSection.style.display = 'block';
        await loadComments(postId);
    } else {
        commentsSection.style.display = 'none';
    }
}

async function loadComments(postId) {
    try {
        const response = await fetch(`https://adminflow.ru/api/posts/${postId}/comments`);
        if (!response.ok) throw new Error('Ошибка при загрузке комментариев');
        
        const data = await response.json();
        displayComments(postId, data.comments);
    } catch (err) {
        console.error('Error loading comments:', err);
        alert('Ошибка при загрузке комментариев');
    }
}

function displayComments(postId, comments) {
    const container = document.getElementById(`comments-container-${postId}`);
    
    container.innerHTML = comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <img src="${comment.author_avatar || '/uploads/avatars/default.png'}" 
                     alt="${comment.author_name}" 
                     class="comment-avatar">
                <div class="comment-info">
                    <span class="comment-author">${comment.author_name}</span>
                    <span class="comment-date">${new Date(comment.created_at).toLocaleString()}</span>
                </div>
            </div>
            <div class="comment-content">${comment.content}</div>
        </div>
    `).join('');
}

async function submitComment(postId, button) {
    const form = button.closest('.comment-form');
    const input = form.querySelector('.comment-input');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch('https://adminflow.ru/api/posts/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                postId: postId,
                content: content
            })
        });

        if (!response.ok) throw new Error('Ошибка при создании комментария');
        
        const data = await response.json();
        
        // Обновляем счетчик комментариев
        const countElement = document.querySelector(`.post[data-post-id="${postId}"] .comments-count`);
        countElement.textContent = parseInt(countElement.textContent) + 1;
        
        // Добавляем новый комментарий в начало списка
        const container = document.getElementById(`comments-container-${postId}`);
        const commentHtml = `
            <div class="comment">
                <div class="comment-header">
                    <img src="${data.comment.author_avatar || '/uploads/avatars/default.png'}" 
                         alt="${data.comment.author_name}" 
                         class="comment-avatar">
                    <div class="comment-info">
                        <span class="comment-author">${data.comment.author_name}</span>
                        <span class="comment-date">${new Date(data.comment.created_at).toLocaleString()}</span>
                    </div>
                </div>
                <div class="comment-content">${data.comment.content}</div>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', commentHtml);
        
        // Очищаем поле ввода
        input.value = '';
    } catch (err) {
        console.error('Error submitting comment:', err);
        alert('Ошибка при отправке комментария');
    }
}

// Функция для открытия изображения в полноэкранном режиме
function openImageInFullscreen(imageSrc, postData) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    
    const postDate = new Date(postData.created_at).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    modal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-flex-container">
                <div class="modal-image-side">
                    <img src="${imageSrc}" alt="Full size image">
                </div>
                <div class="modal-info-side">
                    <div class="modal-author-info">
                        <img src="${postData.author_avatar || '/uploads/avatars/default.png'}" 
                             alt="${postData.author_name}" 
                             class="modal-author-avatar">
                        <div class="modal-author-details">
                            <span class="modal-author-name">${postData.author_name}</span>
                            <span class="modal-post-date">${postDate}</span>
                        </div>
                    </div>
                    ${postData.content ? `
                        <div class="modal-post-content">
                            ${postData.content}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
    document.body.style.overflow = 'hidden';
    
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('.close-modal').onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// Добавляем функцию удаления поста
async function deletePost(postId) {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) {
        return;
    }

    try {
        const response = await fetch(`https://adminflow.ru/api/posts/delete/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при удалении поста');
        }

        // Удаляем пост из DOM
        const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.remove();
        }
    } catch (err) {
        console.error('Error deleting post:', err);
        alert(err.message || 'Ошибка при удалении поста');
    }
}

// Загрузка рекомендованных пользователей
async function loadRecommendedUsers() {
    try {
        const response = await fetch(`https://adminflow.ru/api/users/recommended?userId=${currentUser.id}`);
        if (!response.ok) throw new Error('Ошибка при загрузке рекомендаций');
        
        const data = await response.json();
        displayRecommendedUsers(data.users);
    } catch (err) {
        console.error('Error loading recommended users:', err);
    }
}

// Фильтрация постов
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        loadFeedPosts(btn.dataset.filter);
    });
});

// Сортировка постов
document.getElementById('sort-posts').addEventListener('change', (e) => {
    loadFeedPosts(undefined, e.target.value);
});
