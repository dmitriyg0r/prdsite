document.addEventListener('DOMContentLoaded', () => {
    const reviewsContainer = document.getElementById('reviews-messages');
    const reviewForm = document.getElementById('review-form');
    const reviewInput = document.getElementById('review-input');
    
    // Функция для форматирования времени
    const formatTime = (date) => {
        return new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    };

    // Функция для создания элемента отзыва
    const createReviewElement = (review) => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-message';
        
        // Добавляем data-id для идентификации отзыва
        reviewElement.dataset.reviewId = review.id;
        
        reviewElement.innerHTML = `
            <img src="${review.avatar || '/uploads/avatars/default.png'}" 
                 alt="${review.username}" 
                 class="review-avatar">
            <div class="review-content">
                <div class="review-header">
                    <span class="review-username">${review.username}</span>
                    <span class="review-time">${formatTime(new Date(review.timestamp))}</span>
                    ${isAdmin() ? `<button class="delete-review-btn" title="Удалить отзыв">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
                <p class="review-text">${review.text}</p>
            </div>
        `;
        
        // Добавляем обработчик для кнопки удаления
        if (isAdmin()) {
            const deleteBtn = reviewElement.querySelector('.delete-review-btn');
            deleteBtn.addEventListener('click', () => deleteReview(review.id));
        }
        
        return reviewElement;
    };

    // Функция проверки прав администратора
    const isAdmin = () => {
        // Проверяем localStorage на наличие данных пользователя
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.role === 'admin';
            } catch (e) {
                console.error('Ошибка при парсинге данных пользователя:', e);
            }
        }
        return false;
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
                // Находим и удаляем элемент отзыва из DOM
                const reviewElement = document.querySelector(`[data-review-id="${reviewId}"]`);
                if (reviewElement) {
                    reviewElement.remove();
                }
            } else {
                alert(data.error || 'Ошибка при удалении отзыва');
            }
        } catch (error) {
            console.error('Ошибка при удалении отзыва:', error);
            alert('Ошибка при удалении отзыва');
        }
    };

    // Функция для загрузки отзывов
    const loadReviews = async () => {
        try {
            const response = await fetch('/api/reviews');
            const data = await response.json();
            
            if (data.success) {
                reviewsContainer.innerHTML = ''; // Очищаем контейнер
                
                // Добавляем отзывы в контейнер
                data.reviews.forEach(review => {
                    const reviewElement = createReviewElement(review);
                    reviewsContainer.appendChild(reviewElement);
                });
                
                // Прокручиваем к последнему сообщению
                reviewsContainer.scrollTop = reviewsContainer.scrollHeight;
            }
        } catch (error) {
            console.error('Ошибка при загрузке отзывов:', error);
        }
    };

    // Функция для отправки нового отзыва
    const submitReview = async (text) => {
        console.log('Начало отправки отзыва');
        const userId = getCurrentUserId();
        
        if (!userId) {
            console.error('ID пользователя не найден');
            alert('Необходимо авторизоваться для отправки отзыва');
            return;
        }

        try {
            console.log('Отправка отзыва с ID:', userId);
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    userId
                })
            });
            
            const data = await response.json();
            console.log('Ответ сервера:', data);
            
            if (data.success) {
                const reviewElement = createReviewElement(data.review);
                reviewsContainer.appendChild(reviewElement);
                reviewsContainer.scrollTop = reviewsContainer.scrollHeight;
                reviewInput.value = '';
            } else {
                alert(data.error || 'Ошибка при отправке отзыва');
            }
        } catch (error) {
            console.error('Ошибка при отправке отзыва:', error);
            alert('Ошибка при отправке отзыва');
        }
    };

    // Обработчик отправки формы
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const text = reviewInput.value.trim();
        if (text) {
            submitReview(text);
        }
    });

    // Обработчик нажатия Enter в поле ввода
    reviewInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = reviewInput.value.trim();
            if (text) {
                submitReview(text);
            }
        }
    });

    // Функция для получения ID текущего пользователя
    const getCurrentUserId = () => {
        // Проверяем все возможные места хранения данных пользователя
        console.log('Проверка всех данных авторизации:');
        
        // Проверяем localStorage
        const allLocalStorage = { ...localStorage };
        console.log('localStorage:', allLocalStorage);
        
        // Проверяем sessionStorage
        const allSessionStorage = { ...sessionStorage };
        console.log('sessionStorage:', allSessionStorage);
        
        // Проверяем cookies
        console.log('cookies:', document.cookie);

        // Проверяем конкретные ключи, которые могут использоваться
        const possibleKeys = ['userData', 'user', 'authData', 'currentUser', 'userInfo'];
        
        for (const key of possibleKeys) {
            const data = localStorage.getItem(key);
            if (data) {
                console.log(`Найдены данные в localStorage по ключу ${key}:`, data);
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.id) {
                        console.log('Найден ID пользователя:', parsed.id);
                        return parsed.id;
                    }
                } catch (e) {
                    console.log(`Ошибка парсинга данных из ${key}:`, e);
                }
            }
        }

        // Если ID не найден в localStorage, проверяем другие источники
        // Добавьте здесь проверку тех механизмов авторизации, которые вы используете
        
        console.error('ID пользователя не найден в доступных источниках');
        return null;
    };

    // Добавляем обработчик для проверки длины текста
    reviewInput.addEventListener('input', () => {
        const maxLength = 250;
        if (reviewInput.value.length > maxLength) {
            reviewInput.value = reviewInput.value.slice(0, maxLength);
        }
        
        // Автоматическое изменение высоты поля ввода
        reviewInput.style.height = 'auto';
        reviewInput.style.height = reviewInput.scrollHeight + 'px';
    });

    // Загружаем отзывы при загрузке страницы
    loadReviews();

    // Опционально: периодическое обновление отзывов
    setInterval(loadReviews, 30000); // Обновление каждые 30 секунд
}); 