console.log('Скрипт communities-modal.js загружен');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up community handlers');
    
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

    // Получаем ID пользователя при инициализации
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const currentUserId = currentUser?.id;

    console.log('Текущий пользователь:', currentUserId);

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

    // Переключение вкладок
    function switchTab(tabId) {
        // Деактивируем все вкладки
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
            const searchInput = document.querySelector('#community-search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    // Функция для показа уведомлений
    function showNotification(type, message) {
        console.log(`Уведомление (${type}):`, message);
        // Здесь должен быть код для отображения уведомлений
        alert(message); // Временное решение, если нет системы уведомлений
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

    // Добавляем контейнер для сообществ, если его нет
    function ensureCommunitiesContainer() {
        let container = document.querySelector('.communities-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'communities-container';
            const tabContent = document.getElementById('all-communities');
            if (tabContent) {
                tabContent.appendChild(container);
            }
        }
        return container;
    }

    // Обновляем функцию displayCommunities
    function displayCommunities(communities) {
        const container = ensureCommunitiesContainer();
        if (!container) {
            console.error('Container for communities not found');
            return;
        }

        // Очищаем контейнер перед добавлением нового содержимого
        container.innerHTML = '';

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
            
            // Добавляем обработчик для кнопки создания
            const createBtn = container.querySelector('.create-community-btn');
            if (createBtn) {
                createBtn.addEventListener('click', openCreateCommunityModal);
            }
            return;
        }

        // Создаем контейнер для карточек сообществ
        const communitiesGrid = document.createElement('div');
        communitiesGrid.className = 'communities-grid';

        // Добавляем карточки сообществ
        communities.forEach(community => {
            const communityCard = document.createElement('div');
            communityCard.className = 'community-card';
            communityCard.innerHTML = createCommunityCard(community);
            communitiesGrid.appendChild(communityCard);
        });

        // Добавляем сетку с сообществами в контейнер
        container.appendChild(communitiesGrid);

        // Обновляем счетчик сообществ
        const countElements = document.querySelectorAll('.communities-count');
        countElements.forEach(el => {
            el.textContent = communities.length;
        });

        console.log('Communities displayed:', communities.length);
    }

    // Обновленная функция загрузки сообществ
    async function loadCommunities(userId) {
        try {
            console.log('Loading communities for user:', userId);
            const response = await fetch(`/api/communities?userId=${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received communities data:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load communities');
            }

            displayCommunities(data.communities);
        } catch (err) {
            console.error('Error loading communities:', err);
            const container = document.querySelector('.communities-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Ошибка при загрузке сообществ</p>
                        <button class="retry-btn" type="button">Повторить попытку</button>
                    </div>
                `;
                
                const retryBtn = container.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => loadCommunities(userId));
                }
            }
        }
    }

    // Находим элементы для поиска сообществ
    const communitySearchInput = document.querySelector('#community-search-input');
    const communitySearchResults = document.querySelector('.search-results');

    console.log('Community search input found:', !!communitySearchInput);

    if (communitySearchInput) {
        communitySearchInput.addEventListener('input', (e) => {
            console.log('Поиск сообществ:', e.target.value);
            const query = e.target.value.trim();
            
            if (window.communitySearchTimeout) {
                clearTimeout(window.communitySearchTimeout);
            }

            window.communitySearchTimeout = setTimeout(() => {
                console.log('Выполняется поиск сообществ для:', query);
                handleSearch(query, currentUserId);
            }, 300);
        });
    }

    // Обновляем функцию handleSearch
    async function handleSearch(query, userId) {
        // Важно: убедимся, что мы ищем результаты в правильном контейнере
        const searchResults = document.querySelector('#search-communities .search-results');
        console.log('Контейнер для результатов:', searchResults); // Отладка

        if (!query) {
            if (searchResults) searchResults.innerHTML = '';
            return;
        }

        if (!userId) {
            console.error('ID пользователя не найден');
            if (searchResults) {
                searchResults.innerHTML = '<div class="error-message">Ошибка: пользователь не авторизован</div>';
            }
            return;
        }

        try {
            const url = `/api/communities/search?q=${encodeURIComponent(query)}&userId=${userId}`;
            console.log('URL запроса:', url);

            const response = await fetch(url);
            const data = await response.json();
            console.log('Получены данные:', data);

            if (!searchResults) {
                console.error('Контейнер для результатов поиска не найден');
                return;
            }

            if (data.success) {
                if (data.communities.length === 0) {
                    searchResults.innerHTML = '<div class="no-results">Сообществ не найдено</div>';
                    return;
                }

                const html = data.communities.map(community => `
                    <div class="community-card">
                        <img src="${community.avatar_url || '/uploads/communities/default.png'}" 
                             alt="${community.name}" 
                             class="community-avatar"
                             onerror="this.src='/images/default-community.png'">
                        <div class="community-info">
                            <div class="community-name">${community.name}</div>
                            <div class="community-description">${community.description || ''}</div>
                            <div class="community-meta">
                                ${community.members_count} ${declOfNum(community.members_count, ['участник', 'участника', 'участников'])}
                            </div>
                        </div>
                        <button class="community-action-btn ${community.is_member ? 'leave' : 'join'}"
                                data-community-id="${community.id}">
                            ${community.is_member ? 'Выйти' : 'Вступить'}
                        </button>
                    </div>
                `).join('');

                console.log('Сгенерированный HTML:', html);
                searchResults.innerHTML = html;
                searchResults.style.display = 'block'; // Убедимся, что контейнер видим
            }
        } catch (err) {
            console.error('Ошибка при поиске сообществ:', err);
            if (searchResults) {
                searchResults.innerHTML = '<div class="error-message">Произошла ошибка при поиске</div>';
            }
        }
    }

    // Вспомогательная функция для склонения числительных
    function declOfNum(number, titles) {
        const cases = [2, 0, 1, 1, 1, 2];
        return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    }

    // Находим контейнер результатов поиска
    const searchResultsContainer = document.querySelector('#search-communities .search-results');

    // Добавляем обработчик для кнопок в контейнере результатов поиска
    searchResultsContainer.addEventListener('click', async (e) => {
        console.log('Клик в контейнере результатов поиска');
        
        // Обработка кнопки "Вступить"
        const joinButton = e.target.closest('.community-action-btn.join');
        if (joinButton && !joinButton.disabled) {
            console.log('Клик по кнопке вступления');
            const communityId = joinButton.dataset.communityId;
            if (communityId) {
                await joinCommunity(communityId, joinButton);
            }
        }

        // Обработка кнопки "Перейти в сообщество"
        const visitButton = e.target.closest('.visit-community-btn');
        if (visitButton) {
            console.log('Клик по кнопке перехода в сообщество');
            const communityId = visitButton.dataset.communityId;
            if (communityId) {
                console.log('Переход в сообщество:', communityId);
                window.location.href = `/community/community.html?id=${communityId}`;
            }
        }
    });

    // Обновляем функцию создания карточки сообщества
    function createCommunityCard(community) {
        console.log('Создание карточки для сообщества:', community);
        return `
            <div class="community-card" data-id="${community.id}">
                <div class="community-header">
                    <img src="${community.avatar_url || '/uploads/communities/default.png'}" 
                         alt="${community.name}" 
                         class="community-avatar"
                         onerror="this.src='/images/default-community.png'">
                    <div class="community-info">
                        <div class="community-name">${community.name}</div>
                        <div class="community-description">${community.description || 'Нет описания'}</div>
                        <div class="community-meta">
                            ${community.members_count || 0} ${getPluralForm(community.members_count || 0, ['участник', 'участника', 'участников'])}
                        </div>
                    </div>
                </div>
                <div class="community-actions">
                    <button type="button" 
                            class="community-action-btn join" 
                            data-community-id="${community.id}"
                            ${community.is_member ? 'disabled' : ''}>
                        ${community.is_member ? 'Вы участник' : 'Вступить'}
                    </button>
                    <a href="/community/community.html?id=${community.id}" 
                       class="visit-community-link">
                        Перейти в сообщество
                    </a>
                </div>
            </div>
        `;
    }

    // Обновляем функцию поиска сообществ
    async function searchCommunities(query) {
        try {
            console.log('Начало поиска сообществ для запроса:', query);
            const currentUser = JSON.parse(localStorage.getItem('user'));
            
            const response = await fetch(`/api/communities/search?q=${encodeURIComponent(query)}&userId=${currentUser.id}`);
            const data = await response.json();
            console.log('Получены результаты поиска:', data);

            if (data.success && data.communities.length > 0) {
                const html = data.communities.map(createCommunityCard).join('');
                console.log('Сгенерированный HTML:', html);
                searchResultsContainer.innerHTML = html;
            } else {
                searchResultsContainer.innerHTML = '<p class="no-results">Сообщества не найдены</p>';
            }
        } catch (err) {
            console.error('Ошибка при поиске сообществ:', err);
            searchResultsContainer.innerHTML = '<p class="error">Произошла ошибка при поиске</p>';
        }
    }

    // Обновляем функцию joinCommunity
    async function joinCommunity(communityId, button) {
        console.log('Вызвана функция joinCommunity');
        try {
            button.disabled = true;
            console.log('Кнопка отключена');

            const currentUser = JSON.parse(localStorage.getItem('user'));
            if (!currentUser || !currentUser.id) {
                throw new Error('Необходима авторизация');
            }

            const response = await fetch(`/api/communities/${communityId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id
                })
            });

            const data = await response.json();
            console.log('Ответ сервера:', data);

            if (data.success) {
                button.textContent = 'Вы участник';
                button.classList.remove('join');
                button.classList.add('leave');
                button.disabled = true;

                // Обновляем счетчик участников
                const communityCard = button.closest('.community-card');
                const metaDiv = communityCard.querySelector('.community-meta');
                if (metaDiv) {
                    const currentCount = parseInt(metaDiv.textContent) || 0;
                    metaDiv.textContent = `${currentCount + 1} ${getPluralForm(currentCount + 1, ['участник', 'участника', 'участников'])}`;
                }

                alert('Вы успешно вступили в сообщество');
            } else {
                throw new Error(data.error || 'Ошибка при вступлении в сообщество');
            }
        } catch (err) {
            console.error('Ошибка:', err);
            alert(err.message || 'Не удалось вступить в сообщество');
            button.disabled = false;
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
                        await handleSearch(query, currentUserId);
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
            margin-top: 16px;
            background: var(--surface-color);
            border-radius: 12px;
            overflow: hidden;
        }

        .community-search-item {
            padding: 16px;
            border-bottom: 1px solid var(--border-light);
            transition: background 0.3s ease;
        }

        .community-search-item:last-child {
            border-bottom: none;
        }

        .community-search-item:hover {
            background: var(--background-color);
        }

        .community-search-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
        }

        .community-avatar {
            width: 64px;
            height: 64px;
            border-radius: 12px;
            object-fit: cover;
        }

        .community-info {
            flex: 1;
        }

        .community-name {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 4px 0;
        }

        .community-meta {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .community-description {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.5;
        }

        .join-community-btn {
            padding: 8px 16px;
            border-radius: 8px;
            border: none;
            background: var(--primary-color);
            color: white;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }

        .join-community-btn:hover:not(:disabled) {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }

        .join-community-btn.joined {
            background: var(--surface-color);
            color: var(--text-secondary);
            border: 1px solid var(--border-light);
            cursor: default;
        }

        .empty-search {
            padding: 32px;
            text-align: center;
            color: var(--text-secondary);
        }

        .empty-search i {
            font-size: 32px;
            margin-bottom: 12px;
            opacity: 0.5;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
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

    // Добавляем обработчик для закрытия результатов по клику вне
    document.addEventListener('click', (e) => {
        const searchInput = document.querySelector('#community-search-input');
        const searchResults = document.querySelector('.search-results');
        
        if (searchInput && searchResults && 
            !searchInput.contains(e.target) && 
            !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Добавляем обработчик для кнопок вступления в сообщество
    searchResults.addEventListener('click', async (e) => {
        const joinButton = e.target.closest('.join-community-btn');
        if (!joinButton || joinButton.disabled) return;

        const communityId = joinButton.dataset.communityId;
        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
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
                joinButton.disabled = true;
                joinButton.textContent = 'Вы участник';
            } else {
                throw new Error('Ошибка при вступлении в сообщество');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось вступить в сообщество');
        }
    });

    // Обновляем обработчик событий для кнопок действий с сообществами
    document.addEventListener('click', async (e) => {
        const button = e.target.closest('.community-action-btn');
        if (!button) return;

        console.log('Клик по кнопке сообщества:', button);
        
        const communityId = button.dataset.communityId;
        if (!communityId) {
            console.error('Не найден ID сообщества');
            return;
        }

        if (button.classList.contains('join')) {
            console.log('Начинаем процесс вступления в сообщество');
            e.preventDefault();
            try {
                await joinCommunity(communityId, button);
            } catch (err) {
                console.error('Ошибка при вступлении в сообщество:', err);
            }
        }
    });

    // Вспомогательная функция для склонения слов
    function getPluralForm(number, forms) {
        const cases = [2, 0, 1, 1, 1, 2];
        return forms[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    }

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
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // При создании модального окна добавляем класс
    const modal = document.createElement('div');
    modal.className = 'modal communities-modal';

    function showCommunitiesModal() {
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="communities-modal" style="
                background: white;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                position: relative;
                z-index: 1001;
            ">
                <div class="modal-header" style="
                    padding: 16px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h2>Поиск сообществ</h2>
                    <button class="close-modal-btn" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0 8px;
                    ">×</button>
                </div>
                <div class="modal-content" style="
                    padding: 16px;
                    overflow-y: auto;
                    flex: 1;
                ">
                    <div class="search-container">
                        <input type="text" 
                               id="community-search-input"
                               class="search-input" 
                               placeholder="Поиск сообществ..."
                               style="
                                   width: 100%;
                                   padding: 8px;
                                   border: 1px solid #ddd;
                                   border-radius: 4px;
                                   margin-bottom: 16px;
                               ">
                    </div>
                    <div id="search-results" class="search-results" style="
                        min-height: 200px;
                    ">
                        <div class="search-hint" style="
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            padding: 20px;
                            color: #666;
                        ">
                            <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <p>Введите текст для поиска сообществ</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем стили для overlay
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        // Добавляем модальное окно в DOM
        document.body.appendChild(modal);

        // Получаем элементы
        const searchInput = document.getElementById('community-search-input');
        const searchResults = document.getElementById('search-results');
        const closeBtn = modal.querySelector('.close-modal-btn');

        // Обработчик закрытия
        function closeModal() {
            document.body.removeChild(modal);
        }

        // Обработчик поиска
        async function handleSearch(query) {
            console.log('Searching for:', query); // Отладочный вывод

            if (query.length < 2) {
                searchResults.innerHTML = `
                    <div class="search-hint" style="text-align: center; padding: 20px;">
                        <i class="fas fa-search"></i>
                        <p>Введите минимум 2 символа для поиска</p>
                    </div>`;
                return;
            }

            searchResults.innerHTML = `
                <div class="search-loading" style="text-align: center; padding: 20px;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Поиск...</p>
                </div>`;

            try {
                const currentUser = JSON.parse(localStorage.getItem('user'));
                const response = await fetch(`/api/communities/search?q=${encodeURIComponent(query)}&userId=${currentUser.id}`);
                const data = await response.json();

                console.log('Search response:', data); // Отладочный вывод

                if (!data.success) {
                    throw new Error('Ошибка при поиске');
                }

                if (data.communities.length === 0) {
                    searchResults.innerHTML = `
                        <div class="no-results" style="text-align: center; padding: 20px;">
                            <i class="fas fa-search"></i>
                            <p>Сообщества не найдены</p>
                        </div>`;
                    return;
                }

                const communitiesHTML = data.communities.map(community => `
                    <div class="community-search-item" style="
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        border-bottom: 1px solid #eee;
                    ">
                        <img src="${community.avatar_url || '/uploads/communities/default.png'}" 
                             alt="${community.name}" 
                             class="community-avatar"
                             style="
                                 width: 50px;
                                 height: 50px;
                                 border-radius: 50%;
                                 margin-right: 12px;
                             ">
                        <div class="community-info" style="flex: 1;">
                            <h3 style="margin: 0 0 4px 0;">${community.name}</h3>
                            <p style="margin: 0; color: #666;">${community.description || 'Нет описания'}</p>
                            <div class="community-stats">
                                <span><i class="fas fa-users"></i> ${community.members_count || 0}</span>
                            </div>
                        </div>
                        <button class="join-community-btn" 
                                data-community-id="${community.id}"
                                ${community.is_member ? 'disabled' : ''}
                                style="
                                    padding: 8px 16px;
                                    border-radius: 4px;
                                    border: none;
                                    background: ${community.is_member ? '#eee' : '#4CAF50'};
                                    color: ${community.is_member ? '#666' : 'white'};
                                    cursor: ${community.is_member ? 'default' : 'pointer'};
                                ">
                            ${community.is_member ? 'Вы участник' : 'Вступить'}
                        </button>
                    </div>
                `).join('');

                searchResults.innerHTML = communitiesHTML;
            } catch (err) {
                console.error('Ошибка поиска:', err);
                searchResults.innerHTML = `
                    <div class="search-error" style="text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Произошла ошибка при поиске</p>
                    </div>`;
            }
        }
    }

    // Добавляем обработчик для перехода в сообщество
    document.querySelector('#communities-modal').addEventListener('click', (e) => {
        const visitButton = e.target.closest('.community-action-btn.visit');
        if (visitButton) {
            const communityCard = visitButton.closest('.community-card');
            const communityId = communityCard.dataset.id;
            if (communityId) {
                console.log('Переход в сообщество:', communityId);
                window.location.href = `/community/community.html?id=${communityId}`;
            }
        }
    });

    // Добавляем стили
    const styles = `
        .community-card {
            border: 1px solid var(--border-color, #ddd);
            border-radius: 8px;
            margin-bottom: 10px;
            padding: 15px;
            background: var(--surface-color, #fff);
        }

        .community-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }

        .community-avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            margin-right: 15px;
            object-fit: cover;
        }

        .community-info {
            flex-grow: 1;
        }

        .community-name {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 5px;
        }

        .community-description {
            color: var(--text-secondary, #666);
            font-size: 0.9em;
            margin-bottom: 5px;
        }

        .community-meta {
            font-size: 0.8em;
            color: var(--text-secondary, #666);
        }

        .community-actions {
            display: flex;
            gap: 10px;
            padding: 10px;
            justify-content: flex-end;
            align-items: center;
        }

        .community-action-btn,
        .visit-community-link {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .community-action-btn.join {
            background-color: var(--primary-color, #007bff);
            color: white;
        }

        .visit-community-link {
            display: inline-block;
            padding: 8px 16px;
            background-color: var(--secondary-color, #6c757d);
            color: white;
            text-decoration: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .visit-community-link:hover {
            background-color: var(--secondary-color-dark, #5a6268);
            text-decoration: none;
            color: white;
        }

        .community-action-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    `;

    // Добавляем стили на страницу
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Добавляем отладочную информацию
    console.log('Скрипт communities-modal.js загружен');
    console.log('DOM загружен');
    console.log('Контейнер результатов поиска:', searchResultsContainer);

    // Глобальная функция для перехода в сообщество
    window.visitCommunity = function(communityId) {
        console.log('Переход в сообщество:', communityId);
        window.location.href = `/community/community.html?id=${communityId}`;
    };

    // Добавляем обработчик для всего модального окна сообществ
    document.getElementById('communities-modal').addEventListener('click', function(e) {
        // Обработка кнопки "Вступить"
        if (e.target.classList.contains('join')) {
            const communityId = e.target.dataset.communityId;
            if (communityId) {
                joinCommunity(communityId, e.target);
            }
        }
        
        // Обработка кнопки "Перейти в сообщество"
        if (e.target.classList.contains('visit-community-link')) {
            const communityCard = e.target.closest('.community-card');
            if (communityCard) {
                const communityId = communityCard.dataset.id;
                if (communityId) {
                    console.log('Клик по кнопке перехода, ID:', communityId);
                    visitCommunity(communityId);
                }
            }
        }
    });
});