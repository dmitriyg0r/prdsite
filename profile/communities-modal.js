document.addEventListener('DOMContentLoaded', () => {
    const communitiesModal = document.getElementById('communities-modal');
    const communitiesCount = document.querySelector('.communities-count');
    const modalClose = communitiesModal.querySelector('.modal-close');
    const tabButtons = communitiesModal.querySelectorAll('.tab-btn');
    const tabContents = communitiesModal.querySelectorAll('.tab-content');
    const communitiesHeaderBtn = document.querySelector('.communities-header-btn');

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
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabName) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Функция для показа уведомлений
    function showNotification(message, type = 'info') {
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
                    const modal = document.getElementById('create-community-modal');
                    if (modal) modal.style.display = 'block';
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
            showNotification('Ошибка при загрузке сообществ', 'error');
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
            showNotification('Ошибка при поиске сообществ', 'error');
            return [];
        }
    }

    // Функция для создания сообщества
    async function createCommunity(event) {
        event.preventDefault();
        console.log('Creating community...');
        
        const form = event.target;
        const formData = new FormData(form);
        
        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            if (!currentUser) {
                throw new Error('User not found');
            }
            
            formData.append('userId', currentUser.id);
            
            const response = await fetch('/api/communities/create', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to create community: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to create community');
            }

            // Закрываем модальное окно
            const modal = document.getElementById('create-community-modal');
            if (modal) modal.style.display = 'none';

            // Очищаем форму
            form.reset();

            // Перезагружаем список сообществ
            await loadCommunities(currentUser.id);

            showNotification('Сообщество успешно создано', 'success');
        } catch (err) {
            console.error('Error creating community:', err);
            showNotification(err.message, 'error');
        }
    }

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

            const createForm = document.getElementById('create-community-form');
            if (createForm) {
                createForm.addEventListener('submit', createCommunity);
            }
        } catch (err) {
            console.error('Error initializing communities:', err);
            showNotification('Ошибка при инициализации сообществ', 'error');
        }
    }

    // Инициализация при загрузке страницы
    initCommunities();

    // Добавляем стили для результатов поиска
    const style = document.createElement('style');
    style.textContent = `
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

    document.head.appendChild(style);

    // Добавляем функцию handleSearch
    function handleSearch(e) {
        const searchInput = e.target;
        const searchResults = document.querySelector('.search-results');
        const query = searchInput.value.trim();

        if (!searchResults) {
            console.error('Search results container not found');
            return;
        }

        if (!query) {
            searchResults.style.display = 'none';
            return;
        }

        searchResults.style.display = 'block';
        showSearchLoading();

        // Используем уже существующую функцию debounce
        debounce(async () => {
            try {
                const response = await fetch(`/api/communities/search?q=${encodeURIComponent(query)}`);
                if (!response.ok) throw new Error('Ошибка поиска');
                
                const data = await response.json();
                displaySearchResults(data.communities || []);
            } catch (err) {
                console.error('Search error:', err);
                searchResults.innerHTML = `
                    <div class="search-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Ошибка при поиске сообществ</p>
                        <small>Пожалуйста, попробуйте позже</small>
                    </div>
                `;
            }
        }, 300)();
    }

    // Обновляем обработчик для поискового поля
    const searchInput = document.querySelector('.community-search input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
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
}); 