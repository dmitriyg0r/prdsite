// Основные переменные
const searchInput = document.querySelector('.search-input');
const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
const sortSelect = document.querySelector('.sort-select');
const clearFiltersBtn = document.querySelector('.clear-filters-btn');
const gamesGrid = document.querySelector('.games-grid');
const viewButtons = document.querySelectorAll('.view-btn');
const gameCards = document.querySelectorAll('.game-card');

// Состояние фильтров
let filters = {
    search: '',
    categories: [],
    sort: 'popular'
};

// Обработчик поиска
searchInput?.addEventListener('input', (e) => {
    filters.search = e.target.value.toLowerCase();
    updateGames();
});

// Обработчик категорий
categoryCheckboxes?.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            filters.categories.push(e.target.value.toLowerCase());
        } else {
            filters.categories = filters.categories.filter(cat => 
                cat !== e.target.value.toLowerCase()
            );
        }
        updateGames();
    });
});

// Обработчик сортировки
sortSelect?.addEventListener('change', (e) => {
    filters.sort = e.target.value;
    updateGames();
});

// Сброс фильтров
clearFiltersBtn?.addEventListener('click', () => {
    filters = {
        search: '',
        categories: [],
        sort: 'popular'
    };
    
    if (searchInput) searchInput.value = '';
    categoryCheckboxes?.forEach(checkbox => checkbox.checked = false);
    if (sortSelect) sortSelect.value = 'popular';
    
    updateGames();
});

// Переключение вида отображения
viewButtons?.forEach(btn => {
    btn.addEventListener('click', () => {
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const viewType = btn.dataset.view;
        if (gamesGrid) {
            gamesGrid.className = `games-${viewType}`;
        }
    });
});

// Функция обновления списка игр
function updateGames() {
    const gameCards = document.querySelectorAll('.game-card');
    if (!gameCards.length) return;
    
    gameCards.forEach(card => {
        const title = card.querySelector('.game-title')?.textContent.toLowerCase() || '';
        const category = card.querySelector('.game-category')?.textContent.toLowerCase() || '';
        
        let showCard = true;
        
        // Фильтр по поиску
        if (filters.search && !title.includes(filters.search)) {
            showCard = false;
        }
        
        // Фильтр по категориям
        if (filters.categories.length > 0 && !filters.categories.includes(category)) {
            showCard = false;
        }
        
        // Применяем видимость
        card.style.display = showCard ? 'block' : 'none';
    });
    
    // Сортировка
    const sortedCards = Array.from(gameCards);
    sortedCards.sort((a, b) => {
        switch(filters.sort) {
            case 'popular':
                const usersA = parseInt(a.querySelector('.fa-users')?.nextSibling?.textContent || '0');
                const usersB = parseInt(b.querySelector('.fa-users')?.nextSibling?.textContent || '0');
                return usersB - usersA;
            case 'new':
                const dateA = new Date(a.dataset.date || 0);
                const dateB = new Date(b.dataset.date || 0);
                return dateB - dateA;
            case 'rating':
                const ratingA = parseFloat(a.querySelector('.game-rating span')?.textContent || '0');
                const ratingB = parseFloat(b.querySelector('.game-rating span')?.textContent || '0');
                return ratingB - ratingA;
            default:
                return 0;
        }
    });
    
    // Перестраиваем DOM
    if (gamesGrid) {
        sortedCards.forEach(card => gamesGrid.appendChild(card));
    }
}

// Анимация карточек при появлении
function animateCards() {
    const cards = document.querySelectorAll('.game-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Обработка наведения на карточки
gameCards.forEach(card => {
    const overlay = card.querySelector('.game-overlay');
    if (!overlay) return;
    
    card.addEventListener('mouseenter', () => {
        overlay.style.opacity = '1';
    });
    
    card.addEventListener('mouseleave', () => {
        overlay.style.opacity = '0';
    });
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    try {
        animateCards();
        updateGames();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
});

// Мобильные фильтры
const mobileFiltersToggle = document.querySelector('.mobile-filters-toggle');
const gamesSidebar = document.querySelector('.games-sidebar');

if (mobileFiltersToggle && gamesSidebar) {
    // Добавляем кнопку закрытия
    const closeButton = document.createElement('button');
    closeButton.className = 'mobile-filters-close';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    gamesSidebar.appendChild(closeButton);

    // Обработчики событий
    mobileFiltersToggle.addEventListener('click', () => {
        gamesSidebar.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeButton.addEventListener('click', () => {
        gamesSidebar.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Закрытие при клике вне фильтров
    document.addEventListener('click', (e) => {
        if (gamesSidebar.classList.contains('active') && 
            !gamesSidebar.contains(e.target) && 
            !mobileFiltersToggle.contains(e.target)) {
            gamesSidebar.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}
