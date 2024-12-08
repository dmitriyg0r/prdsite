let selectedPostImage = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');
    currentUser = JSON.parse(localStorage.getItem('user'));

    if (!currentUser) {
        window.location.href = '/authreg/authreg.html';
        return;
    }

    // Если есть id в URL, загружаем профиль друга
    if (profileId) {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/users/${profileId}`);
            if (!response.ok) {
                throw new Error('Пользователь не найден');
            }
            const data = await response.json();
            
            // Заполняем информацию профиля друга
            document.getElementById('username').textContent = data.user.username;
            document.getElementById('role').textContent = data.user.role;
            document.getElementById('created_at').textContent = new Date(data.user.created_at).toLocaleString();
            document.getElementById('last_login').textContent = data.user.last_login ? 
                new Date(data.user.last_login).toLocaleString() : 'Нет данных';
            document.getElementById('profile-avatar').src = data.user.avatar_url || '/uploads/avatars/default.png';

            // Скрываем кнопки редактирования и выхода
            document.getElementById('edit-profile-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'none';
            document.querySelector('.avatar-overlay').style.display = 'none';

            // Добавляем кнопку "Написать сообщение" под аватаркой
            const avatarBlock = document.querySelector('.profile-avatar-block');
            const messageButton = document.createElement('button');
            messageButton.className = 'action-btn message-btn full-width';
            messageButton.innerHTML = '<i class="fas fa-envelope"></i> Написать сообщение';
            messageButton.addEventListener('click', () => {
                sessionStorage.setItem('selectedChatUser', JSON.stringify({
                    id: data.user.id,
                    username: data.user.username,
                    avatar_url: data.user.avatar_url
                }));
                window.location.href = '/chat/chat.html';
            });
            avatarBlock.appendChild(messageButton);
        } catch (err) {
            console.error('Error loading user profile:', err);
            alert('Ошибка при загрузке профиля пользователя');
            window.location.href = '/profile/profile.html';
        }
    } else {
        // Загружаем профиль текущего пользователя
        document.getElementById('username').textContent = currentUser.username;
        document.getElementById('role').textContent = currentUser.role;
        document.getElementById('created_at').textContent = new Date(currentUser.created_at).toLocaleString();
        document.getElementById('last_login').textContent = currentUser.last_login ? 
            new Date(currentUser.last_login).toLocaleString() : 'Нет данных';
        document.getElementById('profile-avatar').src = currentUser.avatar_url || '/uploads/avatars/default.png';
    }

    // Загружаем список друзей
    loadFriends();
    loadFriendRequests();

    // Загрузка аватара
    const avatarUpload = document.getElementById('avatar-upload');
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('userId', currentUser.id);

        try {
            const response = await fetch('https://adminflow.ru:5003/api/upload-avatar', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();
            
            if (response.ok) {
                const newAvatarUrl = data.avatarUrl + '?t=' + new Date().getTime();
                document.getElementById('profile-avatar').src = newAvatarUrl;
                
                // Обновляем URL аватарки в localStorage
                currentUser.avatar_url = data.avatarUrl;
                localStorage.setItem('user', JSON.stringify(currentUser));
            } else {
                alert(data.error || 'Ошибка при загрузке аватара');
            }
        } catch (err) {
            console.error('Error uploading avatar:', err);
            alert('Ошибка при загрузке аватара');
        }
    });

    // Обработчик выхода
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '/authreg/authreg.html';
    });

    // Обработчики для модального окна друзей
    const friendsModal = document.getElementById('friends-modal');
    const friendsCount = document.querySelector('.friends-count');
    const modalClose = document.querySelector('.modal-close');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Обновляем селектор для кнопки открытия модального окна
    const friendsHeaderBtn = document.querySelector('.friends-header-btn');
    
    // Открытие модального окна при клике на заголовок "Друзья"
    friendsHeaderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        friendsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Закрытие модального окна
    modalClose.addEventListener('click', () => {
        friendsModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Закрытие по клику вне модального окна
    friendsModal.addEventListener('click', (e) => {
        if (e.target === friendsModal) {
            friendsModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Переключение вкладок
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // Активация кнопки
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Активация содержимого вкладки
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabName) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Поиск друзей
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    const searchResults = document.querySelector('.search-results');

    searchBtn.addEventListener('click', () => {
        const searchQuery = searchInput.value.trim();
        if (searchQuery) {
            // Здесь будет логика поиска пользователей
            searchUsers(searchQuery);
        }
    });

    // Функция поиска пользователей (заглушка)
    async function searchUsers(query) {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/search-users?q=${query}`);
            const data = await response.json();
            
            if (response.ok) {
                displaySearchResults(data.users);
            } else {
                alert(data.error || 'Ошибка при поиске пользователей');
            }
        } catch (err) {
            console.error('Search error:', err);
            alert('Ошибка при поиске пользователей');
        }
    }

    // Отображение результатов поиска
    function displaySearchResults(users) {
        searchResults.innerHTML = users.map(user => `
            <div class="friend-card">
                <img src="${user.avatar_url || '/uploads/avatars/default.png'}" alt="${user.username}">
                <div class="friend-info">
                    <div class="friend-name">${user.username}</div>
                    <button class="add-friend-btn" data-user-id="${user.id}">
                        <i class="fas fa-user-plus"></i> Добавить в друзья
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Функции для работы �� друзьями
    async function loadFriends() {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/friends?userId=${currentUser.id}`);
            const data = await response.json();
            
            if (response.ok) {
                displayFriends(data.friends);
                updateFriendsCount(data.friends.length);
            }
        } catch (err) {
            console.error('Error loading friends:', err);
        }
    }

    async function loadFriendRequests() {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/friend-requests?userId=${currentUser.id}`);
            const data = await response.json();
            
            if (response.ok) {
                displayFriendRequests(data.requests);
                updateRequestsCount(data.requests.length);
            }
        } catch (err) {
            console.error('Error loading friend requests:', err);
        }
    }

    function displayFriends(friends) {
        const friendsList = document.querySelector('.friends-list');
        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-card">
                <img src="${friend.avatar_url || '/uploads/avatars/default.png'}" 
                     alt="${friend.username}" 
                     class="friend-avatar-link"
                     data-user-id="${friend.id}">
                <div class="friend-info">
                    <div class="friend-name">${friend.username}</div>
                    <div class="friend-status">В сети</div>
                    <div class="friend-actions">
                        <button class="remove-friend-btn" data-user-id="${friend.id}">
                            <i class="fas fa-user-minus"></i> Удалить из друзей
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Обновляем мини-список друзей
        const friendsGrid = document.querySelector('.friends-grid');
        friendsGrid.innerHTML = friends.length > 0 ? friends.slice(0, 3).map(friend => `
            <div class="friend-placeholder">
                <div class="friend-avatar">
                    <img src="${friend.avatar_url || '/uploads/avatars/default.png'}" 
                         alt="${friend.username}"
                         class="friend-avatar-link"
                         data-user-id="${friend.id}">
                </div>
                <span class="friend-name">${friend.username}</span>
            </div>
        `).join('') : `
            <div class="friend-placeholder">
                <div class="friend-avatar">
                    <img src="/uploads/avatars/default.png" alt="Friend">
                </div>
                <span class="friend-name">Пока нет друзей</span>
            </div>
        `;

        // Добавляем обработчики для всех аватарок
        document.querySelectorAll('.friend-avatar-link').forEach(avatar => {
            avatar.addEventListener('click', () => {
                const userId = avatar.dataset.userId;
                if (userId) {
                    window.location.href = `/profile/profile.html?id=${userId}`;
                }
            });
        });
    }

    function displayFriendRequests(requests) {
        const requestsList = document.querySelector('.requests-list');
        requestsList.innerHTML = requests.map(request => `
            <div class="friend-card">
                <img src="${request.avatar_url || '/uploads/avatars/default.png'}" alt="${request.username}">
                <div class="friend-info">
                    <div class="friend-name">${request.username}</div>
                    <div class="friend-actions">
                        <button class="accept-friend-btn" data-user-id="${request.id}">
                            <i class="fas fa-check"></i> Принять
                        </button>
                        <button class="reject-friend-btn" data-user-id="${request.id}">
                            <i class="fas fa-times"></i> Отклонить
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Добавляем обработчики для кнопок
        document.querySelectorAll('.accept-friend-btn').forEach(btn => {
            btn.addEventListener('click', () => respondToFriendRequest(btn.dataset.userId, 'accepted'));
        });

        document.querySelectorAll('.reject-friend-btn').forEach(btn => {
            btn.addEventListener('click', () => respondToFriendRequest(btn.dataset.userId, 'rejected'));
        });
    }

    async function respondToFriendRequest(friendId, status) {
        try {
            const response = await fetch('https://adminflow.ru:5003/api/friend-request/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    friendId,
                    status
                })
            });

            if (response.ok) {
                // Перезагружаем списки друзей и заявок
                loadFriendRequests();
                loadFriends();
            }
        } catch (err) {
            console.error('Error responding to friend request:', err);
            alert('Ошибка при обработке заявки');
        }
    }

    // Обновляем функцию поиска
    async function searchUsers(query) {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/search-users?q=${query}&userId=${currentUser.id}`);
            const data = await response.json();
            
            if (response.ok) {
                displaySearchResults(data.users);
            }
        } catch (err) {
            console.error('Search error:', err);
            alert('Ошибка при поиске пользователей');
        }
    }

    // Обновляем отображение результатов поиска
    function displaySearchResults(users) {
        const searchResults = document.querySelector('.search-results');
        searchResults.innerHTML = users.map(user => {
            let actionButton = '';
            switch(user.friendship_status) {
                case 'none':
                    actionButton = `<button class="add-friend-btn" data-user-id="${user.id}">
                        <i class="fas fa-user-plus"></i> Добавить в друзья
                    </button>`;
                    break;
                case 'pending':
                    actionButton = '<span class="pending-request">Заявка отправлена</span>';
                    break;
                case 'accepted':
                    actionButton = '<span class="friend-status">В друзьях</span>';
                    break;
            }

            return `
                <div class="friend-card">
                    <img src="${user.avatar_url || '/uploads/avatars/default.png'}" alt="${user.username}">
                    <div class="friend-info">
                        <div class="friend-name">${user.username}</div>
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');

        // Добавляем обработчики для кнопок добавления в друзья
        document.querySelectorAll('.add-friend-btn').forEach(btn => {
            btn.addEventListener('click', () => sendFriendRequest(btn.dataset.userId));
        });
    }

    async function sendFriendRequest(friendId) {
        try {
            const response = await fetch('https://adminflow.ru:5003/api/friend-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    friendId
                })
            });

            if (response.ok) {
                // Обновляем реультаты поиска
                searchUsers(document.querySelector('.search-input').value.trim());
            }
        } catch (err) {
            console.error('Error sending friend request:', err);
            alert('Ошибка при отправке заявки');
        }
    }

    // Обновляем обработчик открытия модального окна
    document.querySelector('.friends-header-btn').addEventListener('click', () => {
        // Обновляем списки при открытии модального окна
        loadFriends();
        loadFriendRequests();
    });

    // Обновляем функцию для отображения количества заявок
    function updateRequestsCount(count) {
        const requestCount = document.querySelector('.request-count');
        if (requestCount) {
            requestCount.textContent = count;
        }
    }

    // Обновляем функцию для отображения количества друзей
    function updateFriendsCount(count) {
        const friendsCount = document.querySelector('.friends-count');
        if (friendsCount) {
            friendsCount.textContent = count;
        }
    }

    // Добавляем функцию удаления из друзей
    async function removeFriend(friendId) {
        if (!confirm('Вы уверены, что хотите удалить пользователя из друзей?')) {
            return;
        }

        try {
            const response = await fetch('https://adminflow.ru:5003/api/friend/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    friendId
                })
            });

            if (response.ok) {
                // Перезагружаем список друзей
                loadFriends();
            } else {
                const data = await response.json();
                alert(data.error || 'Ошибка при удалении из друзей');
            }
        } catch (err) {
            console.error('Error removing friend:', err);
            alert('Ошибка при удалении из друзей');
        }
    }

    async function openFriendProfile(userId) {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/users/${userId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при загрузке профиля пользователя');
            }

            const data = await response.json();
            
            if (data.user) {
                // Сохраняем данные профиля друга во временное хранилище
                sessionStorage.setItem('viewing_profile', JSON.stringify(data.user));
                // Перенаправляем на страницу профиля с параметром
                window.location.href = `/profile/profile.html?id=${userId}`;
            } else {
                alert('Пользователь не найден');
            }
        } catch (err) {
            console.error('Error loading user profile:', err);
            alert('Ошибка при загрузке профиля пользователя');
        }
    }

    // Инициализация обработчиков для постов
    initializePostHandlers();
    
    // Загружаем посты
    loadPosts();
});

function initializePostHandlers() {
    const createPostBtn = document.getElementById('create-post-btn');
    const postForm = document.getElementById('post-form');
    const publishPostBtn = document.getElementById('publish-post-btn');
    const postImage = document.getElementById('post-image');

    // Обновляем обработчик показа/скрытия формы
    createPostBtn?.addEventListener('click', () => {
        if (postForm.style.display === 'none' || !postForm.style.display) {
            postForm.style.display = 'block';
            // Добавляем класс active после небольшой задержки для анимации
            setTimeout(() => {
                postForm.classList.add('active');
            }, 10);
        } else {
            postForm.classList.remove('active');
            // Скрываем форму после завершения анимации
            setTimeout(() => {
                postForm.style.display = 'none';
            }, 300);
        }
    });

    // Обработка загрузки изображения
    postImage?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB
                alert('Файл слишком большой. Максимальный размер: 5MB');
                postImage.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('image-preview');
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button class="remove-image" onclick="removePostImage()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            };
            reader.readAsDataURL(file);
            selectedPostImage = file;
        }
    });

    // Публикация поста
    publishPostBtn?.addEventListener('click', createPost);
}

async function createPost() {
    const content = document.getElementById('post-content').value.trim();
    if (!content && !selectedPostImage) {
        alert('Добавьте текст или изображение');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('userId', currentUser.id);
        formData.append('content', content);
        if (selectedPostImage) {
            formData.append('image', selectedPostImage);
        }

        const response = await fetch('https://adminflow.ru:5003/api/posts/create', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            // Очищаем форму
            document.getElementById('post-content').value = '';
            document.getElementById('image-preview').innerHTML = '';
            document.getElementById('post-form').style.display = 'none';
            selectedPostImage = null;

            // Перезагружаем посты
            loadPosts();
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        console.error('Error creating post:', err);
        alert('Ошибка при создании публикации');
    }
}

async function loadPosts() {
    try {
        const userId = new URLSearchParams(window.location.search).get('id') || currentUser.id;
        const response = await fetch(`https://adminflow.ru:5003/api/posts/${userId}?currentUserId=${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            displayPosts(data.posts);
        }
    } catch (err) {
        console.error('Error loading posts:', err);
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.length ? posts.map(post => `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${post.author_avatar || '/uploads/avatars/default.png'}" 
                     alt="${post.author_name}" 
                     class="post-avatar">
                <div class="post-info">
                    <div class="post-author">${post.author_name}</div>
                    <div class="post-date">${new Date(post.created_at).toLocaleString()}</div>
                </div>
                ${post.user_id === currentUser.id ? `
                    <button class="delete-post-btn" data-post-id="${post.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
            <div class="post-content">${post.content}</div>
            ${post.image_url ? `
                <div class="post-media">
                    <div class="post-image-container" onclick='openImageInFullscreen("${post.image_url}", ${JSON.stringify({
                        author_name: post.author_name,
                        author_avatar: post.author_avatar,
                        created_at: post.created_at,
                        content: post.content
                    }).replace(/'/g, "&apos;")})'>
                        <img src="${post.image_url}" 
                             alt="Post image" 
                             class="post-image">
                        <div class="image-overlay">
                            <i class="fas fa-expand"></i>
                        </div>
                    </div>
                </div>
            ` : ''}
            <div class="post-actions">
                <button class="post-action like-action ${post.is_liked ? 'liked' : ''}" data-post-id="${post.id}">
                    <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i>
                    <span class="likes-count">${post.likes_count || 0}</span>
                </button>
                <div class="post-action">
                    <i class="far fa-comment"></i>
                    <span>${post.comments_count || 0}</span>
                </div>
            </div>
        </div>
    `).join('') : '<div class="no-posts">Не найдено публикаций</div>';

    // Добавляем обработчики
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', () => deletePost(btn.dataset.postId));
    });

    document.querySelectorAll('.like-action').forEach(btn => {
        btn.addEventListener('click', () => toggleLike(btn.dataset.postId));
    });
}

async function toggleLike(postId) {
    try {
        const response = await fetch('https://adminflow.ru:5003/api/posts/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id,
                postId: postId
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Находим элементы конкретного поста
            const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
            const likeButton = postElement.querySelector('.like-action');
            const heartIcon = postElement.querySelector('.like-action i');
            const likesCountElement = postElement.querySelector('.likes-count');
            
            // Обновляем UI на основе ответа сервер
            if (data.liked) {
                heartIcon.classList.replace('far', 'fas');
                likeButton.classList.add('liked');
            } else {
                heartIcon.classList.replace('fas', 'far');
                likeButton.classList.remove('liked');
            }
            
            // Устанавливаем точное количество лайков из ответа сервера
            likesCountElement.textContent = data.likes_count;
        } else {
            throw new Error(data.error || 'Ошибка при обработке лайка');
        }
    } catch (err) {
        console.error('Error toggling like:', err);
        alert('Ошибка при обработке лайка');
    }
}

function removePostImage() {
    selectedPostImage = null;
    document.getElementById('post-image').value = '';
    document.getElementById('image-preview').innerHTML = '';
}

// Добавляем функцию удаления поста
async function deletePost(postId) {
    if (!confirm('Вы уверены, что хотите удалить эту публикацию?')) {
        return;
    }

    try {
        const response = await fetch(`https://adminflow.ru:5003/api/posts/delete/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });

        const data = await response.json();
        
        if (response.ok || data.success) {
            // Перезагружаем посты после удаления
            loadPosts();
        } else {
            alert(data.error || 'Ошибка при удалении публикации');
        }
    } catch (err) {
        console.error('Error deleting post:', err);
        alert('Ошибка при удалении публикации');
    }
}

// Добавляем функции в глобальную область видимости (window)
window.openImageInFullscreen = function(imageSrc, postData) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    
    // Форматируем дату
    const postDate = new Date(postData.created_at).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-image-header">
                <div class="modal-author-info">
                    <img src="${postData.author_avatar || '/uploads/avatars/default.png'}" 
                         alt="${postData.author_name}" 
                         class="modal-author-avatar">
                    <div class="modal-author-details">
                        <span class="modal-author-name">${postData.author_name}</span>
                        <span class="modal-post-date">${postDate}</span>
                    </div>
                </div>
                <button class="close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-image-container">
                <img src="${imageSrc}" alt="Full size image">
            </div>
            ${postData.content ? `
                <div class="modal-post-content">
                    ${postData.content}
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    document.body.style.overflow = 'hidden';
    
    modal.querySelector('.close-modal').onclick = function() {
        closeImageModal(modal);
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeImageModal(modal);
        }
    };
    
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeImageModal(modal);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};

window.closeImageModal = function(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        modal.remove();
    }, 300);
}; 