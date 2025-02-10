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

    // Поиск сообществ
    const searchInput = document.getElementById('community-search-input');
    let searchTimeout;

    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = searchInput.value.trim();
            if (query.length < 2) return;

            try {
                const response = await fetch(`https://space-point.ru/api/communities/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();

                const searchResults = document.querySelector('.community-search-results');
                if (searchResults) {
                    searchResults.innerHTML = data.communities.map(community => `
                        <div class="community-card">
                            <img src="${community.avatar_url || '/uploads/avatars/default-community.png'}" 
                                 alt="${community.name}" 
                                 class="community-avatar">
                            <div class="community-info">
                                <div class="community-name">${community.name}</div>
                                <div class="community-meta">${community.members_count} участников</div>
                            </div>
                            <div class="community-actions">
                                ${!community.is_member 
                                    ? `<button class="join-community-btn" data-community-id="${community.id}">
                                         <i class="fas fa-plus"></i> Вступить
                                       </button>`
                                    : `<button class="leave-community-btn" data-community-id="${community.id}">
                                         <i class="fas fa-sign-out-alt"></i> Покинуть
                                       </button>`
                                }
                            </div>
                        </div>
                    `).join('');
                }
            } catch (err) {
                console.error('Error searching communities:', err);
            }
        }, 300);
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