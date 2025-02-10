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

    // Функции для работы с сообществами
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

            const container = document.querySelector('.communities-container');
            if (!container) return;

            if (!data.communities || data.communities.length === 0) {
                container.innerHTML = `
                    <div class="no-communities">
                        <div class="no-communities-content">
                            <i class="fas fa-users-slash"></i>
                            <p>Сообществ пока нет</p>
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

            displayCommunities(data.communities);
        } catch (err) {
            console.error('Error loading communities:', err);
            const container = document.querySelector('.communities-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Не удалось загрузить сообщества</p>
                        <small>${err.message}</small>
                    </div>
                `;
            }
        }
    }

    function displayCommunities(communities) {
        const container = document.querySelector('.communities-container');
        if (!container) return;

        const communitiesHTML = communities.map(community => `
            <div class="community-card">
                <img src="${community.avatar_url || '/images/default-community.png'}" alt="${community.name}" class="community-avatar">
                <div class="community-info">
                    <h3>${community.name}</h3>
                    <p>${community.description || 'Нет описания'}</p>
                    <div class="community-stats">
                        <span><i class="fas fa-users"></i> ${community.members_count || 0}</span>
                    </div>
                </div>
                <a href="/community/community.html?id=${community.id}" class="view-community-btn">
                    Перейти
                </a>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="communities-header">
                <h2>Мои сообщества</h2>
                <button class="create-community-btn" onclick="document.getElementById('create-community-modal').style.display='block'">
                    <i class="fas fa-plus"></i>
                    Создать сообщество
                </button>
            </div>
            <div class="communities-grid">
                ${communitiesHTML}
            </div>
        `;
    }

    // Функция для создания сообщества
    async function createCommunity(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        // Добавляем ID текущего пользователя
        formData.append('userId', currentUser.id);
        
        try {
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
                throw new Error(data.error || 'Не удалось создать сообщество');
            }

            // Закрываем модальное окно
            const modal = document.getElementById('create-community-modal');
            if (modal) modal.style.display = 'none';

            // Очищаем форму
            form.reset();

            // Перезагружаем список сообществ
            await loadCommunities(currentUser.id);

            // Показываем уведомление об успехе
            showNotification('Сообщество успешно создано', 'success');
        } catch (err) {
            console.error('Error creating community:', err);
            showNotification(err.message, 'error');
        }
    }

    // Функция для показа уведомлений
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Добавляем обработчик поиска с debounce
    let searchTimeout;
    function handleSearch(event) {
        const searchQuery = event.target.value.trim();
        const resultsContainer = document.querySelector('.search-results');
        
        // Очищаем предыдущий таймаут
        clearTimeout(searchTimeout);
        
        // Если поле пустое, скрываем результаты
        if (!searchQuery) {
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
            }
            return;
        }
        
        // Устанавливаем новый таймаут
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/communities/search?q=${encodeURIComponent(searchQuery)}`);
                
                if (!response.ok) {
                    throw new Error(`Search failed: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to search communities');
                }
                
                displaySearchResults(data.communities);
            } catch (err) {
                console.error('Error searching communities:', err);
                showNotification('Ошибка при поиске сообществ', 'error');
            }
        }, 300); // Задержка 300мс
    }

    function displaySearchResults(communities) {
        const container = document.querySelector('.search-results');
        if (!container) return;
        
        if (communities.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>Сообщества не найдены</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="search-results-list">
                    ${communities.map(community => `
                        <div class="search-result-item">
                            <img src="${community.avatar_url || '/images/default-community.png'}" 
                                 alt="${community.name}" 
                                 class="community-avatar">
                            <div class="community-info">
                                <h4>${community.name}</h4>
                                <p>${community.description || 'Нет описания'}</p>
                                <span class="members-count">
                                    <i class="fas fa-users"></i> ${community.members_count}
                                </span>
                            </div>
                            <button onclick="joinCommunity(${community.id})" class="join-btn">
                                Присоединиться
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        container.style.display = 'block';
    }

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

    // Добавляем обработчик для поискового поля
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

    // Инициализация
    if (currentUser?.id) {
        loadCommunities(currentUser.id);
    }
}); 