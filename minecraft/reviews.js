// Функция проверки авторизации
const isAdmin = () => {
    const userDataSources = [
        localStorage.getItem('userData'),
        localStorage.getItem('user'),
        localStorage.getItem('adminData'),
        sessionStorage.getItem('userData'),
        sessionStorage.getItem('user'),
        sessionStorage.getItem('adminData')
    ];

    for (const source of userDataSources) {
        if (source) {
            try {
                const userData = JSON.parse(source);
                if (userData.role === 'admin') {
                    return true;
                }
            } catch (e) {}
        }
    }
    return false;
};

// Функция для получения текущего пользователя
const getCurrentUser = () => {
    const sources = ['userData', 'user', 'adminData'];
    
    for (const source of sources) {
        const data = localStorage.getItem(source) || sessionStorage.getItem(source);
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {}
        }
    }
    return null;
};

// Функция получения ID текущего пользователя
const getCurrentUserId = () => {
    const user = getCurrentUser();
    return user ? user.id : null;
};

// Функция форматирования времени
const formatTime = (date) => {
    return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

// Функция создания элемента отзыва
const createReviewElement = (review) => {
    const reviewElement = document.createElement('div');
    reviewElement.className = 'review-message';
    reviewElement.dataset.reviewId = review.id;
    
    const deleteButton = isAdmin() ? 
        `<button class="delete-review-btn" title="Удалить отзыв">
            <i class="fas fa-trash"></i>
        </button>` : '';
    
    reviewElement.innerHTML = `
        <img src="${review.avatar || '/uploads/avatars/default.png'}" 
             alt="${review.username}" 
             class="review-avatar">
        <div class="review-content">
            <div class="review-header">
                <span class="review-username">${review.username}</span>
                <span class="review-time">${formatTime(new Date(review.timestamp))}</span>
                ${deleteButton}
            </div>
            <p class="review-text">${review.text}</p>
        </div>
    `;
    
    if (isAdmin()) {
        const deleteBtn = reviewElement.querySelector('.delete-review-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await deleteReview(review.id);
            });
        }
    }
    
    return reviewElement;
};

// Функция удаления отзыва
const deleteReview = async (reviewId) => {
    if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) {
        return;
    }

    try {
        const userId = getCurrentUserId();
        const response = await fetch(`/api/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();
        
        if (data.success) {
            const reviewElement = document.querySelector(`[data-review-id="${reviewId}"]`);
            if (reviewElement) {
                reviewElement.remove();
            }
        } else {
            alert(data.error || 'Ошибка при удалении отзыва');
        }
    } catch (error) {
        alert('Ошибка при удалении отзыва');
    }
};

// Загрузка отзывов
const loadReviews = async () => {
    try {
        const response = await fetch('/api/reviews');
        const data = await response.json();
        
        if (data.success) {
            const reviewsContainer = document.getElementById('reviews-messages');
            reviewsContainer.innerHTML = '';
            
            data.reviews.forEach(review => {
                const reviewElement = createReviewElement(review);
                reviewsContainer.appendChild(reviewElement);
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке отзывов:', error);
    }
};

// Обработчик отправки формы
document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('review-input');
    const text = input.value.trim();
    const userId = getCurrentUserId();
    
    if (!text || !userId) {
        alert('Пожалуйста, войдите в систему и введите текст отзыва');
        return;
    }
    
    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            await loadReviews();
        } else {
            alert(data.error || 'Ошибка при добавлении отзыва');
        }
    } catch (error) {
        alert('Ошибка при отправке отзыва');
    }
});

// Загружаем отзывы при загрузке страницы
document.addEventListener('DOMContentLoaded', loadReviews); 