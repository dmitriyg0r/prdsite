let selectedPostImage = null;
let currentUser = null;
let editProfileBtn = null;

// Сначала определяем вспомогательные функции
const formatAvatarUrl = (url) => {
    if (!url) return '/uploads/avatars/default.png';
    if (url.startsWith('http')) return url;
    const baseUrl = 'https://space-point.ru';
    const timestamp = new Date().getTime();
    // Убираем существующий timestamp из URL, если он есть
    const cleanUrl = url.split('?')[0];
    return `${baseUrl}${cleanUrl}?t=${timestamp}`;
};

// Добавим функцию для проверки доступности аватара
const checkAvatarAvailability = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
};

// Обновим функцию updateProfileData
const updateProfileData = async (userData) => {
    document.getElementById('username').textContent = userData.username;
    document.getElementById('role').textContent = userData.role;
    document.getElementById('created_at').textContent = new Date(userData.created_at).toLocaleString();
    document.getElementById('last_login').textContent = userData.last_login ? 
        new Date(userData.last_login).toLocaleString() : 'Нет данных';

    // Проверяем доступность аватара
    const avatarUrl = formatAvatarUrl(userData.avatar_url);
    const avatarElement = document.getElementById('profile-avatar');
    
    const isAvatarAvailable = await checkAvatarAvailability(avatarUrl);
    if (!isAvatarAvailable) {
        // Если аватар недоступен, обновляем URL в базе данных
        try {
            const response = await fetch('https://space-point.ru/api/users/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userData.id,
                    avatar_url: '/uploads/avatars/default.png',
                    username: userData.username,
                    email: userData.email
                })
            });

            if (response.ok) {
                // Обновляем локальные данные
                userData.avatar_url = '/uploads/avatars/default.png';
                if (currentUser && currentUser.id === userData.id) {
                    currentUser.avatar_url = '/uploads/avatars/default.png';
                    localStorage.setItem('user', JSON.stringify(currentUser));
                }
            }
        } catch (err) {
            console.error('Error updating avatar URL:', err);
        }
        
        avatarElement.src = '/uploads/avatars/default.png';
    } else {
        avatarElement.src = avatarUrl;
    }
    
    if (userData.email) {
        const emailElement = document.getElementById('email');
        if (emailElement) {
            emailElement.textContent = userData.email;
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');
    currentUser = JSON.parse(localStorage.getItem('user'));

    if (!currentUser) {
        window.location.href = '/authreg/authreg.html';
        return;
    }

    // Функция для обновления данных профиля
    const updateProfileData = (userData) => {
        document.getElementById('username').textContent = userData.username;
        document.getElementById('role').textContent = userData.role;
        document.getElementById('created_at').textContent = new Date(userData.created_at).toLocaleString();
        document.getElementById('last_login').textContent = userData.last_login ? 
            new Date(userData.last_login).toLocaleString() : 'Нет данных';
        document.getElementById('profile-avatar').src = formatAvatarUrl(userData.avatar_url);
        
        if (userData.email) {
            const emailElement = document.getElementById('email');
            if (emailElement) {
                emailElement.textContent = userData.email;
            }
        }
    };

    try {
        // Загружаем актуальные данные пользователя
        const userId = profileId || currentUser.id;
        const response = await fetch(`https://space-point.ru/api/users/${userId}`);
        
        if (!response.ok) {
            throw new Error('Ошибка получения данных пользователя');
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (!profileId) {
                // Обновляем данные текущего пользователя в localStorage
                currentUser = {
                    ...currentUser,
                    ...data.user
                };
                localStorage.setItem('user', JSON.stringify(currentUser));
            }
            
            // Обн��вляем данные на странице
            updateProfileData(data.user);
        } else {
            throw new Error(data.error || 'Ошибка получения данных');
        }
    } catch (err) {
        console.error('Error loading profile:', err);
        // В случае ошибки используем данные из localStorage
        updateProfileData(currentUser);
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
            const response = await fetch(`https://space-point.ru/api/users/${profileId}`);
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

            // Скрываем элементы управл������ния профилем
            document.getElementById('edit-profile-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'none';
            document.querySelector('.avatar-overlay').style.display = 'none';
            
            // Скрываем вкладку запросов в модальном окне
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

        // Загружаем список своих друзей с явным указанием currentUser.id
        await loadFriends(currentUser.id);
        
        // Запускаем обновление своего статуса
        startStatusUpdates();
        
        // Загружаем посты
        await loadPosts();
    }

    // Обновляем отображение email в профиле
    if (!profileId) { // Только для своего профиля
        const emailElement = document.getElementById('email');
        if (emailElement) {
            emailElement.textContent = currentUser.email || 'Не указан';
        }
    }

    // Обработчик формы редактирования профиля
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('edit-username').value.trim();
            const email = document.getElementById('edit-email').value.trim();

            try {
                const response = await fetch('https://space-point.ru/api/users/update-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        username,
                        email
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Обновляем данные пользователя в localStorage
                    currentUser = {
                        ...currentUser,
                        username: data.user.username,
                        email: data.user.email
                    };
                    localStorage.setItem('user', JSON.stringify(currentUser));

                    // Обновляем отображение на странице
                    document.getElementById('username').textContent = currentUser.username;
                    const emailElement = document.getElementById('email');
                    if (emailElement) {
                        emailElement.textContent = currentUser.email || 'Не указан';
                    }

                    // Закрываем модальное окно
                    const editProfileModal = document.getElementById('edit-profile-modal');
                    editProfileModal.classList.remove('active');
                    document.body.style.overflow = '';

                    alert('Профиль успешно обновлен');
                } else {
                    throw new Error(data.error || 'Ошибка при обновлении профиля');
                }
            } catch (err) {
                console.error('Update profile error:', err);
                alert(err.message);
            }
        });
    }

    // Функция валидации email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Обработчик для проверки доступности email при вводе
    let emailCheckTimeout;
    const editEmailInput = document.getElementById('edit-email');
    editEmailInput.addEventListener('input', () => {
        clearTimeout(emailCheckTimeout);
        const email = editEmailInput.value.trim();
        
        if (email && isValidEmail(email)) {
            emailCheckTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`https://space-point.ru/api/users/check-email?email=${encodeURIComponent(email)}&userId=${currentUser.id}`);
                    const data = await response.json();

                    if (response.ok) {
                        if (!data.available) {
                            editEmailInput.setCustomValidity('Этот email уже используется');
                            editEmailInput.reportValidity();
                        } else {
                            editEmailInput.setCustomValidity('');
                        }
                    }
                } catch (err) {
                    console.error('Check email error:', err);
                }
            }, 500);
        }
    });

    // При открытии модального окна редактирования заполняем поля текущими данными
    editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileModal = document.getElementById('edit-profile-modal');
    
    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener('click', () => {
            // Заполняем поля текущими данными
            document.getElementById('edit-username').value = currentUser.username;
            document.getElementById('edit-email').value = currentUser.email || '';
            
            // Показываем модальное окно
            editProfileModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        // Обработчик для закрытия модального окна
        editProfileModal.querySelector('.modal-close')?.addEventListener('click', () => {
            editProfileModal.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Закрытие по клику вне модального окна
        editProfileModal.addEventListener('click', (e) => {
            if (e.target === editProfileModal) {
                editProfileModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Обработчик для кнопки отмены
        editProfileModal.querySelector('.cancel-btn')?.addEventListener('click', () => {
            editProfileModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Загружаем список друзей
    loadFriendRequests();

    // Обновляем обработчик загрузки аватара
    const avatarUpload = document.getElementById('avatar-upload');
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log('1. Выбран файл для загрузки:', file.name);

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('userId', currentUser.id);

        try {
            // Загружаем файл аватара
            console.log('2. Отправка запроса на загрузку файла');
            const uploadResponse = await fetch('https://space-point.ru/api/upload-avatar', {
                method: 'POST',
                body: formData
            });

            const uploadData = await uploadResponse.json();
            console.log('3. Ответ от сервера загрузки:', uploadData);
            
            if (!uploadResponse.ok || !uploadData.success || !uploadData.avatarUrl) {
                throw new Error(uploadData.error || 'Ошибка при загрузке аватара');
            }

            // Важно! Убедимся, что отправляем корректный URL аватара
            const newAvatarUrl = uploadData.avatarUrl;
            console.log('4. Новый URL аватара для обновления в БД:', newAvatarUrl);

            // Обновляем профиль пользователя с новым аватаром
            const updateProfileData = {
                userId: currentUser.id,
                avatar_url: newAvatarUrl,
                username: currentUser.username,
                email: currentUser.email
            };
            
            console.log('5. Отправляемые данные для обновления профиля:', updateProfileData);

            const updateResponse = await fetch('https://space-point.ru/api/users/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateProfileData)
            });

            const updateData = await updateResponse.json();
            console.log('6. Ответ от сервера обновления профиля:', updateData);

            // Проверяем успешность обновления
            if (!updateResponse.ok) {
                console.error('Ошибка HTTP при обновлении профиля:', updateResponse.status);
                throw new Error('Ошибка при обновлении профиля');
            }

            if (!updateData.success) {
                console.error('Ошибка обновления профиля:', updateData.error);
                throw new Error(updateData.error || 'Ошибка при обновлении профиля');
            }

            // Если всё успешно, обновляем локальные данные
            currentUser = {
                ...currentUser,
                avatar_url: newAvatarUrl
            };
            
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Обновляем аватар на странице
            const avatarElement = document.getElementById('profile-avatar');
            if (avatarElement) {
                avatarElement.src = formatAvatarUrl(newAvatarUrl);
            }

            console.log('7. Обновление завершено успешно');
            alert('Аватар успешно обновлен');

        } catch (err) {
            console.error('Ошибка обновления аватара:', err);
            alert(err.message || 'Ошибка при обновлении аватара');
        }
        
        e.target.value = '';
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
    const searchInput = document.querySelector('#friend-search-input'); // Обновляем селектор
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }

    // Создаем контейнер для результатов, если его нет
    let searchResults = document.querySelector('.search-results');
    if (!searchResults) {
        searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        searchInput.parentElement.after(searchResults);
    }

    // Добавляем индикатор загрузки
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'search-loading-indicator';
    loadingIndicator.innerHTML = '<i class="fas fa-spinner"></i>';
    searchInput.parentNode.appendChild(loadingIndicator);

    const debouncedSearch = debounce(async (query) => {
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }

        loadingIndicator.classList.add('active');
        
        try {
            const response = await fetch(`https://space-point.ru/api/search-users?q=${encodeURIComponent(query)}&userId=${currentUser.id}`);
            const data = await response.json();
            
            if (response.ok) {
                displaySearchResults(data.users);
            }
        } catch (err) {
            console.error('Search error:', err);
            searchResults.innerHTML = '<div class="search-error">Произошла ошибка при поиске</div>';
        } finally {
            loadingIndicator.classList.remove('active');
        }
    }, 300);

    searchInput.addEventListener('input', (e) => {
        console.log('Search input:', e.target.value); // Добавляем для отладки
        debouncedSearch(e.target.value);
    });

    function displaySearchResults(users) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) {
            console.error('Search results container not found');
            return;
        }
        
        if (!users || users.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-search"></i>
                    <p>Пользователи не найдены</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = users.map(user => `
            <div class="search-result-item" data-user-id="${user.id}">
                <img src="${user.avatar_url || '/uploads/avatars/default.png'}" alt="${user.username}" class="search-result-avatar">
                <div class="search-result-info">
                    <span class="search-result-name">${user.username}</span>
                    ${getFriendshipButton(user.friendship_status, user.id)}
                </div>
            </div>
        `).join('');

        // Добавляем обработчики для кнопок
        searchResults.querySelectorAll('.friend-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.search-result-item').dataset.userId;
                handleFriendAction(btn.dataset.action, userId);
            });
        });
    }

    function getFriendshipButton(status, userId) {
        switch (status) {
            case 'none':
                return `<button class="friend-action-btn add-friend" data-action="add" data-user-id="${userId}">
                            <i class="fas fa-user-plus"></i> Добавить в друзья
                        </button>`;
            case 'pending':
                return `<button class="friend-action-btn pending" disabled>
                            <i class="fas fa-clock"></i> Заявка отправлена
                        </button>`;
            case 'accepted':
                return `<button class="friend-action-btn friends" disabled>
                            <i class="fas fa-user-check"></i> В друзьях
                        </button>`;
            default:
                return '';
        }
    }

    async function handleFriendAction(action, userId) {
        try {
            if (action === 'add') {
                const response = await fetch('https://space-point.ru/api/friend-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        friendId: userId
                    })
                });

                if (response.ok) {
                    // Обновляем отображение кнопки
                    const button = document.querySelector(`.friend-action-btn[data-user-id="${userId}"]`);
                    if (button) {
                        button.outerHTML = getFriendshipButton('pending', userId);
                    }
                }
            }
        } catch (err) {
            console.error('Friend action error:', err);
            alert('Произошла ошибка при выполнении действия');
        }
    }

    // Добавляем вызов initializeSearch при загрузке страницы
    document.addEventListener('DOMContentLoaded', () => {
        if (currentUser) {
            initializeSearch();
        }
    });

    // Обновляем функцию поиска
    async function searchUsers(query) {
        try {
            const response = await fetch(`https://space-point.ru/api/search-users?q=${query}&userId=${currentUser.id}`);
            const data = await response.json();
            
            if (response.ok) {
                displaySearchResults(data.users);
            }
        } catch (err) {
            console.error('Search error:', err);
            alert('Ошибка при поиске пользователей');
        }
    }

    // Добавляем функцию getFriendStatus
    function getFriendStatus(userId) {
        // Получаем статус из атрибута data-friendship-status
        const userCard = document.querySelector(`.user-card[data-user-id="${userId}"]`);
        if (userCard) {
            return userCard.dataset.friendshipStatus;
        }
        return 'none';
    }

    // Обновляем функцию displaySearchResults
    function displaySearchResults(users) {
        const searchResults = document.querySelector('.search-results');
        
        if (!searchResults) return;

        if (!users.length) {
            searchResults.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-search"></i>
                    <p>Пользователи не найдены</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = users.map(user => {
            const isOnline = user.last_activity && 
                (new Date() - new Date(user.last_activity)) < 5 * 60 * 1000;

            // Используем статус дружбы из ответа сервера
            const friendStatus = user.friendship_status || 'none';
            
            let buttonClass = '';
            let buttonText = '';
            let buttonIcon = '';
            
            switch (friendStatus) {
                case 'accepted':
                    buttonClass = 'friends';
                    buttonText = 'В друзьях';
                    buttonIcon = 'fas fa-check';
                    break;
                case 'pending':
                    buttonClass = 'pending';
                    buttonText = 'Заявка отправлена';
                    buttonIcon = 'fas fa-clock';
                    break;
                default:
                    buttonClass = '';
                    buttonText = 'Добавить в друзья';
                    buttonIcon = 'fas fa-user-plus';
            }

            return `
                <div class="user-card" data-user-id="${user.id}" data-friendship-status="${friendStatus}">
                    <img src="${user.avatar_url || '/uploads/avatars/default.png'}" 
                         alt="${user.username}" 
                         class="user-avatar">
                    <div class="user-info">
                        <div class="user-name">${user.username}</div>
                        <div class="user-meta">
                            <div class="user-status">
                                <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
                                ${isOnline ? 'В сети' : 'Не в сети'}
                            </div>
                            ${user.mutual_friends ? `
                                <span class="mutual-friends">
                                    <i class="fas fa-user-friends"></i>
                                    ${user.mutual_friends} общих друзей
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <button class="add-friend-btn ${buttonClass}" 
                            ${friendStatus === 'pending' || friendStatus === 'accepted' ? 'disabled' : ''}
                            data-user-id="${user.id}">
                        <i class="${buttonIcon}"></i>
                        ${buttonText}
                    </button>
                </div>
            `;
        }).join('');

        // Добавляем обработчики для кнопок
        document.querySelectorAll('.add-friend-btn:not(.pending):not(.friends)').forEach(btn => {
            btn.addEventListener('click', () => {
                sendFriendRequest(btn.dataset.userId);
                btn.classList.add('pending');
                btn.innerHTML = '<i class="fas fa-clock"></i> Заявка отправлена';
                btn.disabled = true;
            });
        });
    }

    // Функция для отображения состояния загрузки
    function showSearchLoading() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="search-loading">
                    <i class="fas fa-circle-notch"></i>
                    <p>Поиск пользователей...</p>
                </div>
            `;
        }
    }

    // Функции для работы с друзьями
    async function loadFriends(userId) {
        // Добавляем проверку на userId в начале функции
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

        // Обновлям счетчик в окне друзей
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
                                    <i class="fas fa-user-minus"></i> Удалт из друзей
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

        // Добавляем отадочную информацию
        console.log('Displaying friends:', {
            total: friends.length,
            displayed: Math.min(friends.length, maxFriendsInGrid),
            isCurrentUser
        });
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

    // Обновляем функцию поиска
    async function searchUsers(query) {
        try {
            const response = await fetch(`https://space-point.ru/api/search-users?q=${query}&userId=${currentUser.id}`);
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
        
        if (!searchResults) return;

        if (!users.length) {
            searchResults.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-search"></i>
                    <p>Пользователи не найдены</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = users.map(user => {
            const isOnline = user.last_activity && 
                (new Date() - new Date(user.last_activity)) < 5 * 60 * 1000;

            // Используем статус дружбы из ответа сервера
            const friendStatus = user.friendship_status || 'none';
            
            let buttonClass = '';
            let buttonText = '';
            let buttonIcon = '';
            
            switch (friendStatus) {
                case 'accepted':
                    buttonClass = 'friends';
                    buttonText = 'В друзьях';
                    buttonIcon = 'fas fa-check';
                    break;
                case 'pending':
                    buttonClass = 'pending';
                    buttonText = 'Заявка отправлена';
                    buttonIcon = 'fas fa-clock';
                    break;
                default:
                    buttonClass = '';
                    buttonText = 'Добавить в друзья';
                    buttonIcon = 'fas fa-user-plus';
            }

            return `
                <div class="user-card" data-user-id="${user.id}" data-friendship-status="${friendStatus}">
                    <img src="${user.avatar_url || '/uploads/avatars/default.png'}" 
                         alt="${user.username}" 
                         class="user-avatar">
                    <div class="user-info">
                        <div class="user-name">${user.username}</div>
                        <div class="user-meta">
                            <div class="user-status">
                                <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
                                ${isOnline ? 'В сети' : 'Не в сети'}
                            </div>
                            ${user.mutual_friends ? `
                                <span class="mutual-friends">
                                    <i class="fas fa-user-friends"></i>
                                    ${user.mutual_friends} общих друзей
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <button class="add-friend-btn ${buttonClass}" 
                            ${friendStatus === 'pending' || friendStatus === 'accepted' ? 'disabled' : ''}
                            data-user-id="${user.id}">
                        <i class="${buttonIcon}"></i>
                        ${buttonText}
                    </button>
                </div>
            `;
        }).join('');

        // Добавляем обработчики для кнопок
        document.querySelectorAll('.add-friend-btn:not(.pending):not(.friends)').forEach(btn => {
            btn.addEventListener('click', () => {
                sendFriendRequest(btn.dataset.userId);
                btn.classList.add('pending');
                btn.innerHTML = '<i class="fas fa-clock"></i> Заявка отправлена';
                btn.disabled = true;
            });
        });
    }

    async function sendFriendRequest(friendId) {
        try {
            const response = await fetch('https://space-point.ru/api/friend-request', {
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
                // Обновляем реултаты поиска
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

    // Обноляем функцию для отображения количества заявок
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

    async function openFriendProfile(userId) {
        try {
            const response = await fetch(`https://space-point.ru/api/users/${userId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при загрузке профиля пользователя');
            }

            const data = await response.json();
            
            if (data.user) {
                // Сохраняем данные профиля друга во временне хранилище
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

    // Оптимизированная функция обновления статуса пользователя
    let statusUpdateTimeout = null;
    let lastStatusUpdate = 0;
    const MIN_UPDATE_INTERVAL = 10000; // Минимальный интервал между обновлениями (10 секунд)

    async function updateUserStatus(force = false) {
        if (!currentUser) return;

        const now = Date.now();
        
        // Пропускаем обновление, если прошло слишком мало времени с последнего обновления
        if (!force && now - lastStatusUpdate < MIN_UPDATE_INTERVAL) {
            return;
        }

        // Отменяем предыдущий отложенный запрос
        if (statusUpdateTimeout) {
            clearTimeout(statusUpdateTimeout);
        }

        // Откладываем выполнение запроса
        statusUpdateTimeout = setTimeout(async () => {
            try {
                const response = await fetch('https://space-point.ru/api/users/update-status', {
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

                lastStatusUpdate = now;
            } catch (err) {
                console.error('Error updating user status:', err);
            }
        }, 100); // Небольшая задержка для группировки обновлений
    }

    // Оптимизирванная функция отслеживания активности
    function startStatusUpdates() {
        let lastActivity = new Date();
        let activityTimeout = null;
        
        const updateActivity = () => {
            lastActivity = new Date();
            
            // Используем debouncing для обновления статуса
            if (activityTimeout) {
                clearTimeout(activityTimeout);
            }
            
            activityTimeout = setTimeout(() => {
                updateUserStatus(true);
            }, 1000); // Задержка в 1 секунду
        };
        
        // Оптимизированное отслеживание событий
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        const throttledUpdateActivity = throttle(updateActivity, 5000); // Ограничиваем частоту вызовов

        events.forEach(eventName => {
            document.addEventListener(eventName, throttledUpdateActivity, { passive: true });
        });
        
        // Проверка активности каждые 5 минут вместо каждой минуты
        setInterval(() => {
            const now = new Date();
            const diffMinutes = Math.floor((now - lastActivity) / (1000 * 60));
            
            if (diffMinutes >= 5) {
                updateUserStatus(true);
            }
        }, 300000); // 5 минут
        
        // Начальное обновление статуса
        updateActivity();
    }

    // Функция для throttling
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // Обновляем обработчик перед ходом со страницы
    window.addEventListener('beforeunload', (event) => {
        if (currentUser && currentUser.id) {
            // Испоьзуем синхронный запрос для гарантированной отправки
            navigator.sendBeacon('https://space-point.ru/api/users/update-status', JSON.stringify({
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
            const response = await fetch(`https://space-point.ru/api/users/status/${userId}`);
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

    // Обаботчики для мены пароля
    const requestPasswordChangeBtn = document.getElementById('request-password-change');
    const passwordChangeModal = document.getElementById('password-change-modal');
    const sendVerificationCodeBtn = document.getElementById('send-verification-code');
    const resendCodeBtn = document.getElementById('resend-code');
    const verificationStep = document.querySelector('.verification-step');
    const codeVerificationStep = document.querySelector('.code-verification-step');
    const passwordChangeForm = document.getElementById('password-change-form');

    // Открытие модального окна смены пароля
    requestPasswordChangeBtn.addEventListener('click', () => {
        passwordChangeModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Закрытие модального окна смены пароля
    passwordChangeModal.querySelector('.modal-close').addEventListener('click', () => {
        passwordChangeModal.classList.remove('active');
        document.body.style.overflow = '';
        resetPasswordChangeForm();
    });

    // Закрытие по клику вне модального окна
    passwordChangeModal.addEventListener('click', (e) => {
        if (e.target === passwordChangeModal) {
            passwordChangeModal.classList.remove('active');
            document.body.style.overflow = '';
            resetPasswordChangeForm();
        }
    });

    // Отправка кода подтверждения
    sendVerificationCodeBtn.addEventListener('click', async () => {
        try {
            sendVerificationCodeBtn.disabled = true;
            sendVerificationCodeBtn.textContent = 'Отправка...';

            const response = await fetch('https://space-point.ru/api/send-verification-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    email: currentUser.email
                })
            });

            const data = await response.json();

            if (response.ok) {
                verificationStep.style.display = 'none';
                codeVerificationStep.style.display = 'block';
                startResendTimer();
            } else {
                throw new Error(data.error || 'Ошибка при отправке код');
            }
        } catch (err) {
            alert(err.message);
        } finally {
            sendVerificationCodeBtn.disabled = false;
            sendVerificationCodeBtn.textContent = 'Отправить код';
        }
    });

    // Таймер для повторной отправки кода
    function startResendTimer() {
        let timeLeft = 60;
        resendCodeBtn.disabled = true;
        const timerElement = document.getElementById('resend-timer');
        
        const timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = `(${timeLeft}с)`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                timerElement.textContent = '';
                resendCodeBtn.disabled = false;
            }
        }, 1000);
    }

    // Повторная отправка кода
    resendCodeBtn.addEventListener('click', async () => {
        resendCodeBtn.disabled = true;
        await sendVerificationCode();
        startResendTimer();
    });

    // Обработка формы смены пароля
    passwordChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const code = document.getElementById('verification-code').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        try {
            const response = await fetch('https://space-point.ru/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    code,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Пароль успешно изменен');
                passwordChangeModal.classList.remove('active');
                document.body.style.overflow = '';
                resetPasswordChangeForm();
            } else {
                throw new Error(data.error || 'Ошибка при изменении пароля');
            }
        } catch (err) {
            alert(err.message);
        }
    });

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

    // Добавляем debounce функцию
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Обновляем обработчики поиска
    function initializeSearch() {
        const searchInput = document.querySelector('#friend-search-input'); // Обновляем селектор
        if (!searchInput) {
            console.error('Search input not found');
            return;
        }

        // Создаем контейнер для результатов, если его нет
        let searchResults = document.querySelector('.search-results');
        if (!searchResults) {
            searchResults = document.createElement('div');
            searchResults.className = 'search-results';
            searchInput.parentElement.after(searchResults);
        }

        // Добавляем индикатор загрузки
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'search-loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner"></i>';
        searchInput.parentNode.appendChild(loadingIndicator);

        const debouncedSearch = debounce(async (query) => {
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            loadingIndicator.classList.add('active');
            
            try {
                const response = await fetch(`https://space-point.ru/api/search-users?q=${encodeURIComponent(query)}&userId=${currentUser.id}`);
                const data = await response.json();
                
                if (response.ok) {
                    displaySearchResults(data.users);
                }
            } catch (err) {
                console.error('Search error:', err);
                searchResults.innerHTML = '<div class="search-error">Произошла ошибка при поиске</div>';
            } finally {
                loadingIndicator.classList.remove('active');
            }
        }, 300);

        searchInput.addEventListener('input', (e) => {
            console.log('Search input:', e.target.value); // Добавляем для отладки
            debouncedSearch(e.target.value);
        });
    }

    function displaySearchResults(users) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) {
            console.error('Search results container not found');
            return;
        }
        
        if (!users || users.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-search"></i>
                    <p>Пользователи не найдены</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = users.map(user => `
            <div class="search-result-item" data-user-id="${user.id}">
                <img src="${user.avatar_url || '/uploads/avatars/default.png'}" alt="${user.username}" class="search-result-avatar">
                <div class="search-result-info">
                    <span class="search-result-name">${user.username}</span>
                    ${getFriendshipButton(user.friendship_status, user.id)}
                </div>
            </div>
        `).join('');

        // Добавляем обработчики для кнопок
        searchResults.querySelectorAll('.friend-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.search-result-item').dataset.userId;
                handleFriendAction(btn.dataset.action, userId);
            });
        });
    }

    function getFriendshipButton(status, userId) {
        switch (status) {
            case 'none':
                return `<button class="friend-action-btn add-friend" data-action="add" data-user-id="${userId}">
                            <i class="fas fa-user-plus"></i> Добавить в друзья
                        </button>`;
            case 'pending':
                return `<button class="friend-action-btn pending" disabled>
                            <i class="fas fa-clock"></i> Заявка отправлена
                        </button>`;
            case 'accepted':
                return `<button class="friend-action-btn friends" disabled>
                            <i class="fas fa-user-check"></i> В друзьях
                        </button>`;
            default:
                return '';
        }
    }

    async function handleFriendAction(action, userId) {
        try {
            if (action === 'add') {
                const response = await fetch('https://space-point.ru/api/friend-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        friendId: userId
                    })
                });

                if (response.ok) {
                    // Обновляем отображение кнопки
                    const button = document.querySelector(`.friend-action-btn[data-user-id="${userId}"]`);
                    if (button) {
                        button.outerHTML = getFriendshipButton('pending', userId);
                    }
                }
            }
        } catch (err) {
            console.error('Friend action error:', err);
            alert('Произошла ошибка при выполнении действия');
        }
    }

    // Добавляем вызов initializeSearch при загрузке страницы
    document.addEventListener('DOMContentLoaded', () => {
        if (currentUser) {
            initializeSearch();
        }
    });

    // Функция для загрузки данных пользователя
    async function loadUserData() {
        try {
            const userId = currentUser.id;
            console.log('Загрузка данных пользователя:', userId);

            const response = await fetch(`https://space-point.ru/api/users/${userId}`);
            const data = await response.json();
            
            console.log('Получены данные пользователя:', data);

            if (data.success && data.user) {
                // Обновляем данные пользователя в localStorage
                const updatedUser = {
                    ...currentUser,
                    ...data.user
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                currentUser = updatedUser;

                // Обновляем аватар на странице
                const avatarUrl = formatAvatarUrl(data.user.avatar_url);
                document.getElementById('profile-avatar').src = avatarUrl;
                
                console.log('Данные пользователя обновлены:', updatedUser);
            }
        } catch (err) {
            console.error('Ошибка при загрузке данных пользователя:', err);
        }
    }

    // Вызываем функцию при загрузке страницы
    document.addEventListener('DOMContentLoaded', loadUserData);

    // Добавьте эту функцию для обновления счетчика символов
    function updateCharacterCount(textarea) {
        const maxLength = 250;
        const currentLength = textarea.value.length;
        const charCountElement = document.getElementById('char-count');
        
        if (charCountElement) {
            charCountElement.textContent = currentLength;
            
            // Меняем цвет при приближении к лимиту
            if (currentLength >= maxLength * 0.9) {
                charCountElement.style.color = '#ff4444';
            } else {
                charCountElement.style.color = '#666';
            }
        }
    }

    // Найдите функцию createPost и добавьте в неё проверку длины в начало:
    async function createPost() {
        const content = document.getElementById('post-content').value.trim();
        const fileInput = document.getElementById('post-image');
        const file = fileInput.files[0];

        // Добавляем проверку длины контента
        if (content.length > 250) {
            alert('Текст публикации не может превышать 250 символов');
            return;
        }

        if (!content && !file) {
            alert('Добавьте текст или файл');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('userId', currentUser.id);
            formData.append('content', content);
            
            if (file) {
                // Добавляем оригинальное имя файла в отдельное поле
                formData.append('originalFileName', file.name);
                formData.append('image', file);
            }

            const response = await fetch('https://space-point.ru/api/posts/create', {
                method: 'POST',
                body: formData
            });

            // Проверяем тип контента ответа
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const textResponse = await response.text();
                throw new Error(textResponse);
            }

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при создании публикации');
            }
            
            if (data.success) {
                // Очищаем фрму
                document.getElementById('post-content').value = '';
                document.getElementById('image-preview').innerHTML = '';
                document.getElementById('post-form').style.display = 'none';
                fileInput.value = '';
                selectedPostImage = null;

                // Перезагружаем посты
                loadPosts();
            } else {
                throw new Error(data.error || 'Ошибка при создании публикации');
            }
        } catch (err) {
            console.error('Error creating post:', err);
            alert('Ошибка при создании публикации: ' + (err.message || 'Неизвестная ошибка'));
        }
    }

    // Добавьте этот обработчик в существующий DOMContentLoaded или в конец файла
    document.addEventListener('DOMContentLoaded', function() {
        const textarea = document.getElementById('post-content');
        if (textarea) {
            textarea.addEventListener('input', function() {
                updateCharacterCount(this);
            });
        }
    });

    // Инициализация поиска сообществ
    function initializeCommunitySearch() {
        const searchInput = document.querySelector('#community-search-input');
        if (!searchInput) return;

        let searchResults = document.querySelector('.community-search-results');
        if (!searchResults) {
            searchResults = document.createElement('div');
            searchResults.className = 'community-search-results';
            searchInput.parentElement.after(searchResults);
        }

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'search-loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        searchInput.parentNode.appendChild(loadingIndicator);

        const debouncedSearch = debounce(async (query) => {
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            loadingIndicator.classList.add('active');
            
            try {
                const response = await fetch(`/api/communities/search?q=${encodeURIComponent(query)}&userId=${currentUser.id}`);
                const data = await response.json();
                
                if (data.success) {
                    displayCommunitySearchResults(data.communities);
                }
            } catch (err) {
                console.error('Ошибка поиска:', err);
                searchResults.innerHTML = '<div class="search-error">Произошла ошибка при поиске</div>';
            } finally {
                loadingIndicator.classList.remove('active');
            }
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    function displayCommunitySearchResults(communities) {
        const searchResults = document.querySelector('.community-search-results');
        if (!searchResults) return;

        if (!communities.length) {
            searchResults.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-users-slash"></i>
                    <p>Сообщества не найдены</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = communities.map(community => `
            <div class="community-search-item">
                <img src="${community.avatar_url || '/uploads/avatars/default-community.png'}" 
                     alt="${community.name}" 
                     class="community-avatar">
                <div class="community-info">
                    <h3>${community.name}</h3>
                    <p>${community.description || 'Нет описания'}</p>
                    <div class="community-stats">
                        <span><i class="fas fa-users"></i> ${community.members_count || 0} участников</span>
                    </div>
                </div>
                <button class="join-community-btn ${community.is_member ? 'joined' : ''}"
                        data-community-id="${community.id}"
                        ${community.is_member ? 'disabled' : ''}>
                    <i class="fas ${community.is_member ? 'fa-check' : 'fa-user-plus'}"></i>
                    ${community.is_member ? 'Вы участник' : 'Присоединиться'}
                </button>
            </div>
        `).join('');

        // Добавляем обработчики для кнопок
        document.querySelectorAll('.join-community-btn:not(.joined)').forEach(btn => {
            btn.addEventListener('click', async () => {
                const communityId = btn.dataset.communityId;
                try {
                    const response = await fetch('/api/communities/join', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: currentUser.id,
                            communityId
                        })
                    });

                    if (response.ok) {
                        btn.classList.add('joined');
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fas fa-check"></i> Вы участник';
                    }
                } catch (err) {
                    console.error('Ошибка при вступлении в сообщество:', err);
                    alert('Ошибка при вступлении в сообщество');
                }
            });
        });
    }

    // Добавляем инициализацию поиска сообществ при загрузке страницы
    document.addEventListener('DOMContentLoaded', () => {
        // ... existing code ...
        initializeCommunitySearch();
    });
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

    // Обработ загрузки изображения
    postImage?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Проверяем размер файла
        if (file.size > 10 * 1024 * 1024) { // 10MB
            alert('Файл слишком большой. Максимальный размер: 10MB');
            e.target.value = '';
            return;
        }

        // Проверяем, является ли файл изображением
        if (file.type.startsWith('image/')) {
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
        } else {
            // Для не-изображений показываем иконку файла
            const preview = document.getElementById('image-preview');
            const fileIcon = getFileIcon(file.name.split('.').pop().toLowerCase());
            preview.innerHTML = `
                <div class="file-preview">
                    <i class="${fileIcon}"></i>
                    <span>${file.name}</span>
                    <button class="remove-image" onclick="removePostImage()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
        selectedPostImage = file;
    });

    // Публикация поста
    publishPostBtn?.addEventListener('click', createPost);
}

async function createPost() {
    const content = document.getElementById('post-content').value.trim();
    const fileInput = document.getElementById('post-image');
    const file = fileInput.files[0];

    // Проверка длины контента
    if (content.length > 250) {
        alert('Текст публикации не может превышать 250 символов');
        return;
    }

    if (!content && !file) {
        alert('Добавьте текст или файл');
        return;
    }

    // Проверка типа файла
    if (file) {
        // Получаем расширение файла
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = [
            // Изображения
            'jpg', 'jpeg', 'png', 'gif',
            // Документы
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            // Архивы
            'zip', 'rar'
        ];

        if (!allowedExtensions.includes(fileExtension)) {
            alert('Неподдерживаемый тип файла. Разрешены: изображения, PDF, документы Word/Excel/PowerPoint, архивы ZIP/RAR');
            return;
        }

        // Проверка размера файла (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Файл слишком большой. Максимальный размер: 10MB');
            return;
        }
    }

    try {
        const formData = new FormData();
        formData.append('userId', currentUser.id);
        formData.append('content', content);
        
        if (file) {
            // Добавляем оригинальное имя файла и сам файл
            formData.append('originalFileName', file.name);
            formData.append('file', file); // Изменено с 'image' на 'file'
        }

        const response = await fetch('https://space-point.ru/api/posts/create', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка при создании публикации');
        }

        const data = await response.json();

        if (data.success) {
            // Очищаем форму
            document.getElementById('post-content').value = '';
            document.getElementById('post-image').value = '';
            document.getElementById('image-preview').innerHTML = '';
            document.getElementById('post-form').style.display = 'none';
            
            // Обновляем счетчик символов
            const charCountElement = document.getElementById('char-count');
            if (charCountElement) {
                charCountElement.textContent = '0';
            }

            // Обновляем список постов
            await loadPosts();
        } else {
            throw new Error(data.error || 'Ошибка при создании публикации');
        }
    } catch (err) {
        console.error('Error creating post:', err);
        alert(err.message);
    }
}

async function loadPosts() {
    try {
        const userId = new URLSearchParams(window.location.search).get('id') || currentUser.id;
        console.log('Loading posts for userId:', userId); // Отладочная информация
        
        const response = await fetch(`https://space-point.ru/api/posts/${userId}?currentUserId=${currentUser.id}`);
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
        const response = await fetch('https://space-point.ru/api/posts/like', {
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
        const response = await fetch(`https://space-point.ru/api/posts/delete/${postId}`, {
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
    
    // Дбавляем модальное окно в DOM
    document.body.appendChild(modal);
    
    // Доавляем класс active после небольшой задержки для анимации
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
        const response = await fetch(`https://space-point.ru/api/posts/${postId}/comments`);
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
        const response = await fetch('https://space-point.ru/api/posts/comment', {
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