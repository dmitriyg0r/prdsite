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
            <div class="post-image-container">
                <img src="${post.image_url}" 
                     alt="Post image" 
                     class="post-image" 
                     onclick="openImageInFullscreen('${post.image_url}', ${JSON.stringify(post).replace(/"/g, '&quot;')})">
            </div>
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
    }).join('') : '<div class="no-posts">Нет публикаций от ваших друзей</div>';

    // Добавляем обработчики для лайков
    document.querySelectorAll('.like-action').forEach(btn => {
        btn.addEventListener('click', () => toggleLike(btn.dataset.postId));
    });
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
