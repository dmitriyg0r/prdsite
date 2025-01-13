document.addEventListener('DOMContentLoaded', () => {
    const friendsModal = document.getElementById('friends-modal');
    const friendsCount = document.querySelector('.friends-count');
    const modalClose = document.querySelector('.modal-close');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const friendsHeaderBtn = document.querySelector('.friends-header-btn');

    // Открытие модального окна при клике на заголовок "Друзья"
    friendsHeaderBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        friendsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Закрытие модального окна
    modalClose?.addEventListener('click', () => {
        friendsModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Закрытие по клику вне модального окна
    friendsModal?.addEventListener('click', (e) => {
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

    // Функции для работы с друзьями
    async function loadFriends(userId) {
        if (!userId) {
            console.warn('loadFriends: userId is undefined, using currentUser.id');
            userId = currentUser?.id;
            if (!userId) {
                console.error('loadFriends: Unable to determine user ID');
                return;
            }
        }

        try {
            const response = await fetch(`https://space-point.ru/api/friends?userId=${userId}`);
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
            const response = await fetch(`https://space-point.ru/api/friend-requests?userId=${currentUser.id}`);
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

        // Обновляем счетчик в окне друзей
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
    }

    function displayFriendRequests(requests) {
        const requestsList = document.querySelector('.requests-list');
        
        if (!requestsList) return;

        if (!requests.length) {
            requestsList.innerHTML = `
                <div class="empty-requests">
                    <i class="fas fa-user-friends"></i>
                    <p>У вас нет новых заявок в друзья</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = requests.map((request, index) => `
            <div class="friend-request-card" style="animation-delay: ${index * 0.1}s">
                <img src="${request.avatar_url || '/uploads/avatars/default.png'}" 
                     alt="${request.username}" 
                     class="request-avatar">
                <div class="request-info">
                    <div class="request-name">${request.username}</div>
                    <div class="request-meta">Хочет добавить вас в друзья</div>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" data-user-id="${request.id}">
                        <i class="fas fa-check"></i>
                        Принять
                    </button>
                    <button class="reject-btn" data-user-id="${request.id}">
                        <i class="fas fa-times"></i>
                        Отклонить
                    </button>
                </div>
            </div>
        `).join('');

        // Обновляем обработчики событий
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                respondToFriendRequest(btn.dataset.userId, 'accepted');
                btn.closest('.friend-request-card').style.opacity = '0.5';
                btn.disabled = true;
                btn.nextElementSibling.disabled = true;
            });
        });

        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                respondToFriendRequest(btn.dataset.userId, 'rejected');
                btn.closest('.friend-request-card').style.opacity = '0.5';
                btn.disabled = true;
                btn.previousElementSibling.disabled = true;
            });
        });
    }

    async function respondToFriendRequest(friendId, status) {
        try {
            const response = await fetch('https://space-point.ru/api/friend-request/respond', {
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

    async function removeFriend(friendId) {
        if (!confirm('Вы уверены, что хотите удалить пользователя из друзей?')) {
            return;
        }

        try {
            const response = await fetch('https://space-point.ru/api/friend/remove', {
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

    function updateRequestsCount(count) {
        const requestCount = document.querySelector('.request-count');
        if (requestCount) {
            requestCount.textContent = count;
        }
    }

    function updateFriendsCount(count) {
        const friendsCount = document.querySelector('.friends-count');
        if (friendsCount) {
            friendsCount.textContent = count;
        }
    }

    // Экспортируем функции в глобальную область видимости
    window.loadFriends = loadFriends;
    window.loadFriendRequests = loadFriendRequests;
});

// Глобальная функция для открытия модального окна друзей
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