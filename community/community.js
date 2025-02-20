document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const urlParams = new URLSearchParams(window.location.search);
    const communityId = urlParams.get('id');

    if (!currentUser) {
        window.location.href = '/authreg/authreg.html';
        return;
    }

    // Загрузка данных сообщества
    async function loadCommunityData() {
        try {
            const response = await fetch(`https://space-point.ru/api/communities/${communityId}`);
            if (!response.ok) throw new Error('Ошибка загрузки данных сообщества');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            updateCommunityUI(data.community);
            checkMembershipStatus(data.community);
            loadCommunityPosts();
            loadCommunityMembers();
        } catch (err) {
            console.error('Error:', err);
            alert('Ошибка при загрузке сообщества');
        }
    }

    // Обновление UI сообщества
    function updateCommunityUI(community) {
        document.getElementById('community-name').textContent = community.name;
        document.getElementById('community-type').textContent = 
            community.type === 'public' ? 'Публичное сообщество' : 'Закрытое сообщество';
        document.getElementById('community-avatar').src = 
            community.avatar_url || '/uploads/avatars/default-community.png';
        document.getElementById('community-description').textContent = 
            community.description || 'Описание отсутствует';
        document.getElementById('created-at').textContent = 
            new Date(community.created_at).toLocaleDateString();
        document.getElementById('members-count').textContent = 
            community.members_count || 0;
        document.getElementById('posts-count').textContent = 
            community.posts_count || 0;

        // Настройка ссылки на профиль создателя
        const creatorLink = document.getElementById('creator-link');
        creatorLink.href = `/profile/profile.html?id=${community.creator_id}`;
        creatorLink.textContent = community.creator_name;

        // Показываем кнопку редактирования только создателю
        if (currentUser.id === community.creator_id) {
            document.getElementById('edit-community-btn').style.display = 'block';
            document.querySelector('.avatar-overlay').style.display = 'flex';
        }
    }

    // Проверка статуса участия
    async function checkMembershipStatus(community) {
        const joinLeaveBtn = document.getElementById('join-leave-btn');
        const isMember = community.members?.includes(currentUser.id);
        
        joinLeaveBtn.innerHTML = isMember 
            ? '<i class="fas fa-sign-out-alt"></i><span>Покинуть</span>'
            : '<i class="fas fa-user-plus"></i><span>Вступить</span>';
        
        joinLeaveBtn.onclick = () => isMember ? leaveCommunity() : joinCommunity();
    }

    // Функции для работы с сообществом
    async function joinCommunity() {
        try {
            const response = await fetch('https://space-point.ru/api/communities/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: currentUser.id,
                    communityId: communityId
                })
            });

            if (!response.ok) throw new Error('Ошибка при вступлении в сообщество');
            
            loadCommunityData(); // Перезагружаем данные
        } catch (err) {
            console.error('Error:', err);
            alert('Ошибка при вступлении в сообщество');
        }
    }

    async function leaveCommunity() {
        if (!confirm('Вы уверены, что хотите покинуть сообщество?')) return;

        try {
            const response = await fetch('https://space-point.ru/api/communities/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: currentUser.id,
                    communityId: communityId
                })
            });

            if (!response.ok) throw new Error('Ошибка при выходе из сообщества');
            
            loadCommunityData(); // Перезагружаем данные
        } catch (err) {
            console.error('Error:', err);
            alert('Ошибка при выходе из сообщества');
        }
    }

    // Обновляем функцию загрузки постов сообщества
    async function loadCommunityPosts() {
        try {
            const response = await fetch(`/api/communities/${communityId}/posts`);
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            const postsContainer = document.getElementById('posts-container');
            if (data.posts.length === 0) {
                postsContainer.innerHTML = '<p class="no-posts">В этом сообществе пока нет постов</p>';
                return;
            }

            postsContainer.innerHTML = data.posts.map(post => `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${post.author_avatar || '/uploads/avatars/default.png'}" 
                             alt="${post.author_name}" 
                             class="post-author-avatar">
                        <div class="post-meta">
                            <div class="post-author">${post.author_name}</div>
                            <div class="post-date">${new Date(post.created_at).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    <div class="post-actions">
                        <button class="action-btn like-btn" data-post-id="${post.id}">
                            <i class="far fa-heart"></i>
                            <span>${post.likes_count || 0}</span>
                        </button>
                        <button class="action-btn comment-btn" data-post-id="${post.id}">
                            <i class="far fa-comment"></i>
                            <span>${post.comments_count || 0}</span>
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error loading posts:', err);
            document.getElementById('posts-container').innerHTML = 
                '<p class="error">Ошибка при загрузке постов</p>';
        }
    }

    // Добавляем обработчик для создания постов
    document.getElementById('publish-post-btn')?.addEventListener('click', async () => {
        const content = document.getElementById('post-content').value.trim();
        if (!content) {
            alert('Введите текст поста');
            return;
        }

        try {
            const response = await fetch(`/api/communities/${communityId}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    content,
                    title: 'Post' // если требуется заголовок
                })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            document.getElementById('post-content').value = '';
            loadCommunityPosts(); // Перезагружаем посты
        } catch (err) {
            console.error('Error creating post:', err);
            alert('Ошибка при создании поста');
        }
    });

    // Инициализация
    loadCommunityData();
}); 