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

    // Если пользователь пытается открыть свой профиль через параметр id, 
    // перенаправляем его на основную страницу профиля
    if (profileId === currentUser.id.toString()) {
        window.location.href = '/profile/profile.html';
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

            // Загружаем список друзей профиля друга
            await loadFriends(profileId);
            
            // Проверяем онлайн-статус друга
            checkOnlineStatus(profileId);
            setInterval(() => checkOnlineStatus(profileId), 60000);

            // Скрываем элементы управления профилем
            document.getElementById('edit-profile-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'none';
            document.querySelector('.avatar-overlay').style.display = 'none';
            
            // Скрываем вкладку запросов в друзья в модальном окне
            const requestsTab = document.querySelector('[data-tab="requests-tab"]');
            if (requestsTab) {
                requestsTab.style.display = 'none';
            }

            // Добавляем кнопку "Написать сообщение" под информацией профиля
            const profileActions = document.querySelector('.profile-actions');
            if (profileActions) {
                const messageButton = document.createElement('button');
                messageButton.className = 'action-btn message-btn';
                messageButton.innerHTML = '<i class="fas fa-envelope"></i>';
                messageButton.title = 'Написать сообщение';
                messageButton.addEventListener('click', () => {
                    sessionStorage.setItem('selectedChatUser', JSON.stringify({
                        id: data.user.id,
                        username: data.user.username,
                        avatar_url: data.user.avatar_url
                    }));
                    window.location.href = '/chat/chat.html';
                });
                profileActions.appendChild(messageButton);
            }

            // Загружаем посты друга
            await loadPosts();

        } catch (err) {
            console.error('Error loading user profile:', err);
            alert('Ошибка при загрузке профиля пользователя');
            window.location.href = '/profile/profile.html';
        }
    } else {
        // Загружаем свой профиль
        document.getElementById('username').textContent = currentUser.username;
        document.getElementById('role').textContent = currentUser.role;
        document.getElementById('created_at').textContent = new Date(currentUser.created_at).toLocaleString();
        document.getElementById('last_login').textContent = currentUser.last_login ? 
            new Date(currentUser.last_login).toLocaleString() : 'Нет данных';
        document.getElementById('profile-avatar').src = currentUser.avatar_url || '/uploads/avatars/default.png';

        // Добавляем отображение своего статуса
        const statusElement = document.querySelector('.online-status');
        if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> В сети';
            statusElement.className = 'online-status online';
        }

        // Загружаем список своих друзей
        await loadFriends(currentUser.id);
        
        // Запускаем обновление своего статуса
        startStatusUpdates();
        
        // Загружаем посты
        await loadPosts();
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
    
    // Открытие модального окна при клике на заголовок "Д��узья"
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

    // Функции для работы с друзьями
    async function loadFriends(userId) {
        if (!userId) {
            console.warn('loadFriends: userId is undefined');
            return;
        }

        try {
            const response = await fetch(`https://adminflow.ru:5003/api/friends?userId=${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to load friends: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                displayFriends(data.friends, userId === currentUser?.id);
                updateFriendsCount(data.friends.length);
            } else {
                throw new Error('Failed to load friends: server returned false success');
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

    function displayFriends(friends, isCurrentUser) {
        if (!Array.isArray(friends)) {
            console.error('displayFriends: friends is not an array', friends);
            return;
        }

        // Обновляем счетчик друзей в заголовке секции
        const friendsHeaderCount = document.querySelector('.friends-section .friends-count');
        if (friendsHeaderCount) {
            friendsHeaderCount.textContent = friends.length;
        }

        // Обновляем счетчик в модальном окне
        const modalFriendCount = document.querySelector('.modal-tabs .friend-count');
        if (modalFriendCount) {
            modalFriendCount.textContent = friends.length;
        }

        // Обновляем мини-список друзей в профиле
        const friendsGrid = document.querySelector('.friends-grid');
        const maxFriendsInGrid = 4;
        
        if (friendsGrid) {
            friendsGrid.innerHTML = friends.length > 0 
                ? friends.slice(0, maxFriendsInGrid).map(friend => `
                    <a href="/profile/profile.html?id=${friend.id}" class="friend-item">
                        <img src="${friend.avatar_url || '/uploads/avatars/default.png'}" 
                             alt="${friend.username}"
                             class="friend-avatar">
                        <span class="friend-name">${friend.username}</span>
                    </a>
                `).join('') + (friends.length > maxFriendsInGrid 
                    ? `<button class="friend-item more-friends" onclick="openFriendsModal()">
                         <span>+${friends.length - maxFriendsInGrid}</span>
                       </button>`
                    : '')
                : `<div class="friend-placeholder">
                     <img src="/uploads/avatars/default.png" alt="No friends" class="friend-avatar">
                     <span class="friend-name">Пока нет друзей</span>
                   </div>`;
        }

        // Обновляем полный список друзей в модальном окне
        const friendsList = document.querySelector('.friends-list');
        if (friendsList) {
            friendsList.innerHTML = friends.map(friend => `
                <div class="friend-card">
                    <img src="${friend.avatar_url || '/uploads/avatars/default.png'}" 
                         alt="${friend.username}" 
                         class="friend-avatar">
                    <div class="friend-info">
                        <div class="friend-name">${friend.username}</div>
                        ${isCurrentUser ? `
                            <div class="friend-actions">
                                <button class="remove-friend-btn" data-user-id="${friend.id}">
                                    <i class="fas fa-user-minus"></i> Удалить из друзей
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        // Добавляем обработчики для кнопок удаления
        if (isCurrentUser) {
            document.querySelectorAll('.remove-friend-btn').forEach(btn => {
                btn.addEventListener('click', () => removeFriend(btn.dataset.userId));
            });
        }

        // Добавляем отладочную информацию
        console.log('Displaying friends:', {
            total: friends.length,
            displayed: Math.min(friends.length, maxFriendsInGrid),
            isCurrentUser
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
            alert('Ошибка при поиске пользоват��лей');
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
                // Перенаправляем на страницу профиля с ��араметром
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

    // Обновляем интервал обновления статуса для текущего пользователя
    function startStatusUpdates() {
        let lastActivity = new Date();
        
        // Функция обновления активности
        const updateActivity = () => {
            lastActivity = new Date();
            updateUserStatus(true);
        };
        
        // Отслеживаем действия пользователя
        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(eventName => {
            document.addEventListener(eventName, updateActivity);
        });
        
        // Проверяем активность каждую минуту
        setInterval(() => {
            const now = new Date();
            const diffMinutes = Math.floor((now - lastActivity) / (1000 * 60));
            
            if (diffMinutes >= 5) {
                // Если нет активности 5+ минут, обновляем статус
                updateUserStatus(true); // Всё ещё онлайн, но не активен
            }
        }, 60000);
        
        // Начальное обновление статуса
        updateActivity();
    }

    // Функция обновления статуса пользователя
    async function updateUserStatus(force = false) {
        if (!currentUser) return;

        try {
            const response = await fetch('https://adminflow.ru:5003/api/users/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    is_online: true,
                    last_activity: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }
        } catch (err) {
            console.error('Error updating user status:', err);
        }
    }

    // Обновляем обработчик перед уходом со страницы
    window.addEventListener('beforeunload', (event) => {
        if (currentUser && currentUser.id) {
            // Используем синхронный запрос для гарантированной отправки
            navigator.sendBeacon('https://adminflow.ru:5003/api/users/update-status', JSON.stringify({
                userId: currentUser.id,
                is_online: false
            }));
        }
    });

    // Обновляем функцию проверки статуса
    async function checkOnlineStatus(userId) {
        if (!userId) {
            console.warn('checkOnlineStatus: userId is undefined');
            return;
        }

        try {
            const response = await fetch(`https://adminflow.ru:5003/api/users/status/${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch status');
            }
            
            const data = await response.json();
            const statusElement = document.querySelector('.online-status');
            
            if (statusElement) {
                const lastActiveTime = new Date(data.last_activity);
                const now = new Date();
                const diffMinutes = Math.floor((now - lastActiveTime) / (1000 * 60));
                
                let statusText, statusClass;
                
                if (data.is_online) {
                    if (diffMinutes < 5) {
                        statusText = '<i class="fas fa-circle"></i> В сети';
                        statusClass = 'online';
                    } else {
                        statusText = '<i class="fas fa-moon"></i> Нет на месте';
                        statusClass = 'away';
                    }
                } else {
                    statusText = `<i class="far fa-circle"></i> ${formatLastSeen(data.last_activity)}`;
                    statusClass = 'offline';
                }
                
                statusElement.innerHTML = statusText;
                statusElement.className = `online-status ${statusClass}`;
            }
        } catch (err) {
            console.error('Error checking online status:', err);
        }
    }

    // Функция форматирования времени последней активности
    function formatLastSeen(lastActivity) {
        if (!lastActivity) return 'Не в сети';
        
        const lastActiveTime = new Date(lastActivity);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastActiveTime) / (1000 * 60));
        
        if (diffMinutes < 1) return 'Только что';
        if (diffMinutes < 5) return 'Активен';
        if (diffMinutes < 60) return `Был ${diffMinutes} мин. назад`;
        
        const hours = Math.floor(diffMinutes / 60);
        if (hours < 24) return `Был ${hours} ч. назад`;
        
        return `Был ${lastActiveTime.toLocaleDateString()}`;
    }

    // Добавляем стили для нового статуса
    const style = document.createElement('style');
    style.textContent = `
        .online-status.away {
            color: #FFA500;
        }
        .online-status.away i {
            color: #FFA500;
        }
    `;
    document.head.appendChild(style);
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

    // Обработк загрузки изображения
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
        console.log('Loading posts for userId:', userId); // Отладочная информация
        
        const response = await fetch(`https://adminflow.ru:5003/api/posts/${userId}?currentUserId=${currentUser.id}`);
        const data = await response.json();
        
        console.log('Posts response:', data); // Отладочная информация

        if (data.success) {
            displayPosts(data.posts);
        }
    } catch (err) {
        console.error('Error loading posts:', err);
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.length ? posts.map(post => {
        let mediaContent = '';
        if (post.image_url) {
            const fileExtension = post.image_url.split('.').pop().toLowerCase();
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            
            if (imageExtensions.includes(fileExtension)) {
                // Для изображений (убрана иконка расширения)
                mediaContent = `
                    <div class="post-media">
                        <div class="post-image-container" onclick='openImageInFullscreen("${post.image_url}", ${JSON.stringify({
                            author_name: post.author_name,
                            author_avatar: post.author_avatar,
                            created_at: post.created_at,
                            content: post.content
                        }).replace(/'/g, "&apos;")})'>
                            <img src="${post.image_url}" alt="Post image" class="post-image">
                        </div>
                    </div>
                `;
            } else {
                // Для документов
                const fileName = post.image_url.split('/').pop();
                const fileIcon = getFileIcon(fileExtension);
                mediaContent = `
                    <div class="post-file">
                        <i class="${fileIcon} post-file-icon"></i>
                        <div class="post-file-info">
                            <div class="post-file-name">${fileName}</div>
                            <div class="post-file-size">Документ</div>
                        </div>
                        <a href="${post.image_url}" target="_blank" class="post-file-download">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                `;
            }
        }

        return `
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
                ${mediaContent}
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
        `;
    }).join('') : '<div class="no-posts">Не найдено публикаций</div>';

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
            throw new Error(data.error || 'Ошибка при обрботке лайка');
        }
    } catch (err) {
        console.error('Error toggling like:', err);
        alert('Оши��ка при обработке лайка');
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
    // Создаем модальное окно
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
    
    // Добавляем модальное окно в DOM
    document.body.appendChild(modal);
    
    // Добавляем класс active после небольшой задержки для анимации
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    // Блокируем прокрутку body
    document.body.style.overflow = 'hidden';
    
    // Обработчики закрытия
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    // Закрытие по клику на кнопку
    modal.querySelector('.close-modal').onclick = closeModal;
    
    // Закрытие по клику вне изображения
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Закрытие по Escape
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
};

window.closeImageModal = function(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        modal.remove();
    }, 300);
};

// Добавляем функцию в глобальную область видимости
window.openFriendsModal = function() {
    const friendsModal = document.getElementById('friends-modal');
    const friendsTab = document.querySelector('[data-tab="friends-tab"]');
    
    // Открываем модальное окно
    friendsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Активируем вкладку с друзьями
    if (friendsTab) {
        friendsTab.click();
    }
};

// Функция для определения иконки файла
function getFileIcon(extension) {
    const iconMap = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'txt': 'fas fa-file-alt',
        // Добавьте другие типы файлов по необходимости
    };
    
    return iconMap[extension] || 'fas fa-file';
}