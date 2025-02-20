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
            const response = await fetch(`/api/communities/${communityId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка загрузки данных сообщества');
            }
            
            updateCommunityUI(data);
            checkMembershipStatus(data.community);
            loadCommunityPosts();
            loadCommunityMembers();
        } catch (error) {
            console.error('Ошибка:', error);
            // Показать сообщение об ошибке пользователю
        }
    }

    // Обновление UI сообщества
    function updateCommunityUI(data) {
        // Проверяем, что data.community существует
        const community = data.community || data;

        const nameElement = document.querySelector('.community-name');
        const descriptionElement = document.querySelector('.community-description');
        const avatarElement = document.querySelector('.community-avatar');
        const followersCountElement = document.querySelector('.info-value[data-type="followers"]');
        const postsCountElement = document.querySelector('.info-value[data-type="posts"]');

        if (nameElement) nameElement.textContent = community.name;
        if (descriptionElement) descriptionElement.textContent = community.description;
        if (avatarElement) avatarElement.src = community.avatar_url || '/default-community-avatar.png';
        if (followersCountElement) followersCountElement.textContent = community.members_count || 0;
        if (postsCountElement) postsCountElement.textContent = community.posts_count || 0;

        // Проверяем существование элементов перед обновлением
        const creatorLink = document.getElementById('creator-link');
        const editButton = document.getElementById('edit-community-btn');
        const avatarOverlay = document.querySelector('.avatar-overlay');

        if (creatorLink) {
            creatorLink.href = `/profile/profile.html?id=${community.created_by}`;
            creatorLink.textContent = community.creator_name;
        }

        // Проверяем права на редактирование
        if (editButton && currentUser.id === community.created_by) {
            editButton.style.display = 'block';
        }

        if (avatarOverlay && currentUser.id === community.created_by) {
            avatarOverlay.style.display = 'flex';
        }
    }

    // Обновляем функцию проверки членства
    function checkMembershipStatus(community) {
        const joinLeaveBtn = document.getElementById('join-leave-btn');
        if (!joinLeaveBtn) return;

        const isMember = community.is_member;
        
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
                        <img src="${post.author_avatar || '/uploads/communities/default.png'}" 
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

    // Добавим функцию для отображения ошибок
    function showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            alert(message);
        }
    }

    async function loadCommunityMembers() {
        try {
            const response = await fetch(`/api/communities/${communityId}/members`);
            if (!response.ok) {
                throw new Error('Ошибка загрузки участников сообщества');
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Ошибка загрузки участников сообщества');
            }

            updateMembersUI(data.members);
        } catch (err) {
            console.error('Error loading members:', err);
            showError('Ошибка при загрузке участников сообщества');
        }
    }

    function updateMembersUI(members) {
        const membersContainer = document.getElementById('community-members');
        if (!membersContainer) return;

        membersContainer.innerHTML = '';
        
        if (!members.length) {
            membersContainer.innerHTML = '<p>В сообществе пока нет участников</p>';
            return;
        }

        members.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'member-item';
            memberElement.innerHTML = `
                <img src="${member.avatar_url || '/uploads/avatars/default-avatar.png'}" 
                     alt="${member.username}" 
                     class="member-avatar">
                <div class="member-info">
                    <div class="member-name">${member.username}</div>
                    <div class="member-role">${member.role}</div>
                </div>
            `;
            membersContainer.appendChild(memberElement);
        });
    }

    // Инициализация
    loadCommunityData();
}); 