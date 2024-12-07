document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '/authreg/authreg.html';
        return;
    }

    // Заполняем информацию профиля
    document.getElementById('username').textContent = user.username;
    document.getElementById('role').textContent = user.role;
    document.getElementById('created_at').textContent = new Date(user.created_at).toLocaleString();
    document.getElementById('last_login').textContent = user.last_login ? 
        new Date(user.last_login).toLocaleString() : 'Нет данных';

    // Устанавливаем аватар пользователя
    document.getElementById('profile-avatar').src = user.avatar_url || '/uploads/avatars/default.png';

    // Загружаем список друзей сразу при загрузке страницы
    loadFriends();
    loadFriendRequests();

    // Загрузка аватара
    const avatarUpload = document.getElementById('avatar-upload');
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('userId', user.id);

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
                user.avatar_url = data.avatarUrl;
                localStorage.setItem('user', JSON.stringify(user));
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

    // Функции для работы с друзьями
    async function loadFriends() {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/friends?userId=${user.id}`);
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
            const response = await fetch(`https://adminflow.ru:5003/api/friend-requests?userId=${user.id}`);
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

        // Добавляем обработчики для аватарок в списке друзей
        document.querySelectorAll('.friend-avatar-link').forEach(avatar => {
            avatar.addEventListener('click', () => {
                openFriendProfile(avatar.dataset.userId);
            });
        });

        // Обновляем мини-список друзей
        const friendsGrid = document.querySelector('.friends-grid');
        friendsGrid.innerHTML = friends.slice(0, 3).map(friend => `
            <div class="friend-placeholder">
                <div class="friend-avatar">
                    <img src="${friend.avatar_url || '/uploads/avatars/default.png'}" 
                         alt="${friend.username}"
                         class="friend-avatar-link"
                         data-user-id="${friend.id}">
                </div>
                <span class="friend-name">${friend.username}</span>
            </div>
        `).join('');

        // Добавляем обработчики для аватарок в мини-списке
        document.querySelectorAll('.friend-avatar img').forEach(avatar => {
            avatar.addEventListener('click', () => {
                openFriendProfile(avatar.dataset.userId);
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
                    userId: user.id,
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

    // Об��овляем функцию поиска
    async function searchUsers(query) {
        try {
            const response = await fetch(`https://adminflow.ru:5003/api/search-users?q=${query}&userId=${user.id}`);
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
                    userId: user.id,
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

    // Добавляем функцию удаления из ��рузей
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
                    userId: user.id,
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
}); 