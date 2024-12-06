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

    // Открытие модального окна при клике на количество друзей
    friendsCount.addEventListener('click', (e) => {
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
}); 