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
        showCommunitiesModal();
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
            communityCard.innerHTML = `
                <div class="community-header">
                    <img src="${community.avatar_url || '/images/default-community.png'}" 
                         alt="${community.name}" 
                         class="community-avatar">
                    <h3 class="community-name">${community.name}</h3>
                </div>
                <div class="community-body">
                    <p class="community-description">${community.description || 'Нет описания'}</p>
                    <div class="community-stats">
                        <span class="members-count">
                            <i class="fas fa-users"></i> ${community.members_count || 0}
                        </span>
                    </div>
                </div>
                <div class="community-footer">
                    <button class="visit-community-btn" data-community-id="${community.id}">
                        Перейти в сообщество
                    </button>
                </div>
            `;
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
                        <button class="retry-btn">Повторить попытку</button>
                    </div>
                `;
                
                const retryBtn = container.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => loadCommunities(userId));
                }
            }
        }
    }

    // Находим элементы управления модальным окном
    const searchInput = document.getElementById('community-search-input');
    const searchResults = document.querySelector('.search-results');
    
    console.log('Search input element:', searchInput);
    console.log('Search results element:', searchResults);

    // Удаляем дублирующуюся функцию handleSearch и оставляем одну версию
    async function handleSearch(query) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) {
            console.error('Search results container not found');
            return;
        }

        if (query.length < 2) {
            searchResults.innerHTML = `
                <div class="search-hint">
                    <i class="fas fa-search"></i>
                    <p>Введите минимум 2 символа для поиска</p>
                </div>`;
            return;
        }

        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`https://space-point.ru/api/communities/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Ошибка при поиске');
            }

            displaySearchResults(data.communities);
        } catch (err) {
            console.error('Ошибка поиска:', err);
            searchResults.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Произошла ошибка при поиске</p>
                </div>`;
        }
    }

    // Обновляем обработчик ввода для поиска
    document.querySelectorAll('.community-search input, .search-input').forEach(input => {
        if (input) {
            input.addEventListener('input', debounce((e) => handleSearch(e.target.value.trim()), 300));
        }
    });

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
                        await handleSearch(query);
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

        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid var(--border-light);
            border-radius: 8px;
            font-size: 16px;
            background: var(--background-color);
            color: var(--text-primary);
            transition: all 0.3s ease;
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

    // Обновляем функцию displaySearchResults
    function displaySearchResults(communities) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;

        if (!communities || communities.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-users-slash"></i>
                    <p>Сообщества не найдены</p>
                </div>`;
            return;
        }

        searchResults.innerHTML = communities.map(community => `
            <div class="community-search-item">
                <div class="community-search-header">
                    <img src="${community.avatar_url || '/uploads/communities/default.png'}" 
                         alt="${community.name}" 
                         class="community-avatar">
                    <div class="community-info">
                        <h3 class="community-name">${community.name}</h3>
                        <div class="community-meta">
                            <span class="members-count">
                                <i class="fas fa-users"></i> ${community.members_count || 0} участников
                            </span>
                        </div>
                    </div>
                </div>
                <div class="community-description">
                    ${community.description || 'Нет описания'}
                </div>
                <button class="join-community-btn ${community.is_member ? 'joined' : ''}" 
                        data-community-id="${community.id}"
                        ${community.is_member ? 'disabled' : ''}>
                    <i class="fas ${community.is_member ? 'fa-check' : 'fa-user-plus'}"></i>
                    ${community.is_member ? 'Вы участник' : 'Присоединиться'}
                </button>
            </div>
        `).join('');
    }

    // Добавляем обработчик для закрытия результатов по клику вне
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
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

    // При создании модального окна добавляем класс
    const modal = document.createElement('div');
    modal.className = 'modal communities-modal';

    // Обновляем функцию showCommunitiesModal
    function showCommunitiesModal() {
        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Сообщества</h2>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="search-container">
                            <input type="text" 
                                   class="search-input" 
                                   placeholder="Поиск сообществ...">
                        </div>
                        <div class="search-results"></div>
                    </div>
                </div>
            </div>
        `;

        // Добавляем стили для модального окна
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .modal-overlay {
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
            }

            .modal-content {
                background: var(--surface-color);
                width: 90%;
                max-width: 600px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }

            .modal-header {
                padding: 20px;
                border-bottom: 1px solid var(--border-light);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h2 {
                margin: 0;
                font-size: 20px;
                color: var(--text-primary);
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-secondary);
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .modal-close:hover {
                background: var(--background-color);
                color: var(--text-primary);
            }

            .modal-body {
                padding: 20px;
                max-height: 70vh;
                overflow-y: auto;
            }

            .search-container {
                margin-bottom: 20px;
            }

            .search-input {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid var(--border-light);
                border-radius: 8px;
                font-size: 16px;
                background: var(--background-color);
                color: var(--text-primary);
                transition: all 0.3s ease;
            }

            .search-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
            }
        `;

        document.head.appendChild(modalStyle);

        // Создаем и добавляем модальное окно
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Получаем элементы
        const modal = modalContainer.querySelector('.modal-overlay');
        const closeBtn = modal.querySelector('.modal-close');
        const searchInput = modal.querySelector('.search-input');

        // Обработчики
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modalContainer);
            }
        });

        // Инициализируем поиск
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => handleSearch(e.target.value.trim()), 300));
            searchInput.focus();
        }
    }
});