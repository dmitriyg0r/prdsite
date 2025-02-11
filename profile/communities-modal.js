document.addEventListener('DOMContentLoaded', () => {
    const communitiesModal = document.getElementById('communities-modal');
    const communitiesCount = document.querySelector('.communities-count');
    const modalClose = communitiesModal.querySelector('.modal-close');
    const tabButtons = communitiesModal.querySelectorAll('.tab-btn');
    const tabContents = communitiesModal.querySelectorAll('.tab-content');
    const communitiesHeaderBtn = document.querySelector('.communities-header-btn');

    // Получаем элементы модального окна создания сообщества
    const createModal = document.getElementById('createCommunityModal');
    const createForm = document.getElementById('createCommunityForm');
    const closeCreateModalBtn = createModal?.querySelector('.close');

    // Открытие модального окна при клике на заголовок "Сообщества"
    communitiesHeaderBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        communitiesModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Закрытие модального окна
    modalClose?.addEventListener('click', () => {
        communitiesModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Закрытие по клику вне модального окна
    communitiesModal?.addEventListener('click', (e) => {
        if (e.target === communitiesModal) {
            communitiesModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Функция для переключения вкладок
    function switchTab(tabId) {
        // Убираем активный класс со всех вкладок
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Активируем нужную вкладку
        const selectedTab = document.getElementById(tabId);
        const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
        
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedBtn) selectedBtn.classList.add('active');

        // Если это вкладка поиска, фокусируемся на поле ввода
        if (tabId === 'search-communities') {
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    // Функция для показа уведомлений
    function showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Функция debounce для поиска
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

    // Функция для отображения сообществ
    function displayCommunities(communities) {
        const container = document.querySelector('.communities-container');
        if (!container) return;

        if (!communities || communities.length === 0) {
            container.innerHTML = `
                <div class="no-communities">
                    <div class="no-communities-content">
                        <i class="fas fa-users-slash"></i>
                        <p>У вас пока нет сообществ</p>
                        <button class="create-community-btn">
                            <i class="fas fa-plus"></i>
                            Создать сообщество
                        </button>
                    </div>
                </div>
            `;
            
            const createBtn = container.querySelector('.create-community-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    openCreateCommunityModal();
                });
            }
            return;
        }

        container.innerHTML = communities.map(community => `
            <div class="community-card">
                <img src="${community.avatar_url || '/images/default-community.png'}" 
                     alt="${community.name}" 
                     class="community-avatar">
                <div class="community-info">
                    <h3>${community.name}</h3>
                    <p>${community.description || 'Нет описания'}</p>
                    <div class="community-stats">
                        <span><i class="fas fa-users"></i> ${community.members_count || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Функция для загрузки сообществ
    async function loadCommunities(userId) {
        try {
            console.log('Loading communities for user:', userId);
            const response = await fetch(`/api/communities?userId=${userId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response status:', response.status);
                console.error('Response text:', errorText);
                throw new Error(`Failed to load communities: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load communities');
            }

            displayCommunities(data.communities);
        } catch (err) {
            console.error('Error loading communities:', err);
            showNotification('error', 'Ошибка при загрузке сообществ');
        }
    }

    // Функция для поиска сообществ
    async function searchCommunities(query) {
        try {
            const response = await fetch(`/api/communities/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            const data = await response.json();
            return data.communities;
        } catch (err) {
            console.error('Search error:', err);
            showNotification('error', 'Ошибка при поиске сообществ');
            return [];
        }
    }

    // Функция для открытия модального окна создания сообщества
    function openCreateCommunityModal() {
        if (createModal) {
            createModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // Функция для закрытия модального окна создания сообщества
    function closeCreateCommunityModal() {
        if (createModal) {
            createModal.style.display = 'none';
            document.body.style.overflow = '';
            if (createForm) createForm.reset();
        }
    }

    // Функция валидации формы
    function validateCommunityForm(formData) {
        const errors = [];
        const name = formData.get('name');
        const description = formData.get('description');

        if (!name || name.trim().length === 0) {
            errors.push('Введите название сообщества');
        } else if (name.trim().length < 3) {
            errors.push('Название сообщества должно содержать минимум 3 символа');
        }

        if (description && description.trim().length > 500) {
            errors.push('Описание не должно превышать 500 символов');
        }

        return errors;
    }

    // Обновляем функцию createCommunity
    async function createCommunity(e) {
        e.preventDefault();
        
        try {
            // Получаем текущего пользователя
            const currentUser = JSON.parse(localStorage.getItem('user'));
            if (!currentUser || !currentUser.id) {
                throw new Error('Необходима авторизация');
            }

            const form = e.target;
            const formData = new FormData(form);
            
            // Добавляем ID создателя в FormData
            formData.append('creatorId', currentUser.id);

            // Отладочная информация
            console.log('Отправка данных:', {
                name: formData.get('name'),
                description: formData.get('description'),
                type: formData.get('type'),
                creatorId: formData.get('creatorId'),
                avatar: formData.get('avatar')
            });

            const response = await fetch('/api/communities/create', {
                method: 'POST',
                body: formData // FormData автоматически установит правильный Content-Type
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при создании сообщества');
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Ошибка при создании сообщества');
            }

            // Показываем уведомление об успехе
            showNotification('success', 'Сообщество успешно создано');

            // Очищаем форму
            form.reset();

            // Обновляем список сообществ
            await loadCommunities(currentUser.id);

            // Переключаемся на вкладку "Мои сообщества"
            const allCommunitiesTab = document.querySelector('[data-tab="all-communities"]');
            if (allCommunitiesTab) {
                allCommunitiesTab.click();
            }

        } catch (err) {
            console.error('Error creating community:', err);
            showNotification('error', err.message);
        }
    }

    // Обновляем обработчик для удаления класса ошибки при вводе
    const nameInput = document.getElementById('community-name-input');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            nameInput.classList.remove('error');
        });
    }

    // Добавляем стили для поля с ошибкой
    const errorStyle = document.createElement('style');
    errorStyle.textContent = `
        .form-group input.error,
        .form-group textarea.error {
            border-color: var(--error-color, #ff4444);
            background-color: var(--error-bg, rgba(255, 68, 68, 0.1));
        }
        
        .form-group input.error:focus,
        .form-group textarea.error:focus {
            box-shadow: 0 0 0 2px var(--error-shadow, rgba(255, 68, 68, 0.2));
        }

        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        }

        .notification.error {
            background-color: var(--error-color, #ff4444);
            color: white;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(errorStyle);

    // Обработчики событий формы
    if (createForm) {
        console.log('Adding submit handler to create form');
        createForm.addEventListener('submit', createCommunity);
        
        // Предотвращаем отправку формы при нажатии Enter
        createForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    }

    if (closeCreateModalBtn) {
        closeCreateModalBtn.addEventListener('click', closeCreateCommunityModal);
    }

    // Обработчик клика по кнопке "Создать сообщество"
    const createCommunityBtns = document.querySelectorAll('.create-community-btn');
    createCommunityBtns.forEach(btn => {
        btn.addEventListener('click', openCreateCommunityModal);
    });

    // Закрытие модального окна по клику вне его
    window.addEventListener('click', (e) => {
        if (e.target === createModal) {
            closeCreateCommunityModal();
        }
    });

    // Функция инициализации сообществ
    async function initCommunities() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            if (!currentUser) {
                throw new Error('User not found');
            }

            await loadCommunities(currentUser.id);
            
            const searchInput = document.querySelector('.community-search input');
            if (searchInput) {
                searchInput.addEventListener('input', debounce(async (e) => {
                    const query = e.target.value.trim();
                    if (query) {
                        const communities = await searchCommunities(query);
                        displaySearchResults(communities);
                    } else {
                        const searchResults = document.querySelector('.search-results');
                        if (searchResults) {
                            searchResults.style.display = 'none';
                        }
                    }
                }, 300));
            }

            const form = document.getElementById('create-community-form');
            if (form) {
                form.addEventListener('submit', createCommunity);
            }
        } catch (err) {
            console.error('Error initializing communities:', err);
            showNotification('error', 'Ошибка при инициализации сообществ');
        }
    }

    // Инициализация при загрузке страницы
    initCommunities();

    // Добавляем стили для результатов поиска
    const searchStyle = document.createElement('style');
    searchStyle.textContent = `
        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--surface-color);
            border-radius: var(--radius-md);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 0.5rem;
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        }

        .search-result-item {
            display: flex;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            gap: 1rem;
        }

        .search-result-item:last-child {
            border-bottom: none;
        }

        .search-result-item .community-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
        }

        .search-result-item .community-info {
            flex: 1;
        }

        .search-result-item h4 {
            margin: 0;
            color: var(--text-primary);
        }

        .search-result-item p {
            margin: 0.25rem 0;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .search-result-item .members-count {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }

        .search-result-item .join-btn {
            padding: 0.5rem 1rem;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: background 0.2s;
        }

        .search-result-item .join-btn:hover {
            background: var(--primary-dark);
        }

        .no-results {
            padding: 1rem;
            text-align: center;
            color: var(--text-secondary);
        }
    `;

    document.head.appendChild(searchStyle);

    // Функции для отображения состояния загрузки
    function showSearchLoading() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.innerHTML = '<div class="loading">Поиск...</div>';
        }
    }

    function hideSearchLoading() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            const loading = searchResults.querySelector('.loading');
            if (loading) {
                loading.remove();
            }
        }
    }

    // Функция для отображения результатов поиска
    function displaySearchResults(communities) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;

        if (!communities || communities.length === 0) {
            searchResults.innerHTML = '<div class="no-results">Сообщества не найдены</div>';
            searchResults.style.display = 'block';
            return;
        }

        searchResults.innerHTML = communities.map(community => `
            <div class="community-search-item">
                <img src="${community.avatar_url || '/uploads/communities/default.png'}" 
                     alt="${community.name}" 
                     class="community-avatar">
                <div class="community-info">
                    <h3>${community.name}</h3>
                    <p>${community.description || 'Нет описания'}</p>
                    <div class="community-stats">
                        <span><i class="fas fa-users"></i> ${community.members_count || 0}</span>
                    </div>
                </div>
                <button class="join-community-btn" 
                        data-community-id="${community.id}"
                        ${community.is_member ? 'disabled' : ''}>
                    ${community.is_member ? 'Вы участник' : 'Вступить'}
                </button>
            </div>
        `).join('');
        
        searchResults.style.display = 'block';
    }

    // Обновляем функцию handleSearch
    async function handleSearch(e) {
        const searchInput = e.target;
        const query = searchInput.value.trim();
        const searchResults = document.querySelector('.search-results');
        
        console.log('Search query:', query); // Отладочный вывод
        console.log('Search results element:', searchResults); // Проверка элемента

        if (!searchResults) {
            console.error('Search results container not found!');
            return;
        }

        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        showSearchLoading();
        searchResults.style.display = 'block';

        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const url = `/api/communities/search?q=${encodeURIComponent(query)}&userId=${currentUser.id}`;
            console.log('Making request to:', url); // Отладочный вывод

            const response = await fetch(url);
            console.log('Response status:', response.status); // Проверка статуса ответа
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Search results:', data); // Проверка полученных данных
            
            if (data.success) {
                displaySearchResults(data.communities);
            } else {
                throw new Error(data.error || 'Ошибка при поиске');
            }
        } catch (err) {
            console.error('Search error:', err);
            searchResults.innerHTML = '<div class="search-error">Произошла ошибка при поиске</div>';
        }
    }

    // Добавляем обработчик поиска
    if (document.querySelector('.search-input')) {
        document.querySelector('.search-input').addEventListener('input', debounce(handleSearch, 300));
    }

    // Закрываем результаты поиска при клике вне
    document.addEventListener('click', (event) => {
        const searchResults = document.querySelector('.search-results');
        const searchInput = document.querySelector('.community-search input');
        
        if (searchResults && 
            !searchResults.contains(event.target) && 
            !searchInput.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Обработчики для кнопок вступления/выхода из сообщества
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.join-community-btn')) {
            const btn = e.target.closest('.join-community-btn');
            const communityId = btn.dataset.communityId;
            await joinCommunity(communityId);
        } else if (e.target.closest('.leave-community-btn')) {
            const btn = e.target.closest('.leave-community-btn');
            const communityId = btn.dataset.communityId;
            await leaveCommunity(communityId);
        }
    });

    // Функции для обновления счетчиков
    function updateCommunitiesCount(count) {
        const counters = document.querySelectorAll('.communities-count');
        counters.forEach(counter => {
            counter.textContent = count;
        });
    }

    // Глобальная функция для открытия модального окна
    window.openCommunitiesModal = function() {
        communitiesModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // Добавляем стили для состояний загрузки и ошибки
    const additionalStyles = `
        .loading {
            padding: 1rem;
            text-align: center;
            color: var(--text-secondary);
        }

        .search-error {
            padding: 1rem;
            text-align: center;
            color: var(--error-color);
        }

        .search-error i {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }

        .search-error small {
            display: block;
            margin-top: 0.5rem;
            opacity: 0.8;
        }
    `;

    // Добавляем новые стили
    const styleElement = document.createElement('style');
    styleElement.textContent = additionalStyles;
    document.head.appendChild(styleElement);

    // Предпросмотр аватара
    const avatarInput = document.getElementById('communityAvatar');
    const avatarPreview = document.getElementById('avatarPreview');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreview.src = e.target.result;
                    avatarPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Обработчики для табов
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Обработчик поиска
    if (document.querySelector('.search-input')) {
        document.querySelector('.search-input').addEventListener('input', debounce(handleSearch, 300));
    }
}); 