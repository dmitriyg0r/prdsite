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
        
        reviewElement.innerHTML = `
            <img src="${review.avatar || '/uploads/avatars/default.png'}" 
                 alt="${review.username}" 
                 class="review-avatar">
            <div class="review-content">
                <div class="review-header">
                    <span class="review-username">${review.username}</span>
                    <span class="review-time">${formatTime(new Date(review.timestamp))}</span>
                </div>
                <p class="review-text">${review.text}</p>
            </div>
        `;
        
        return reviewElement;
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
        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    userId: getCurrentUserId() // Функция должна быть определена в вашем основном JS
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Добавляем новый отзыв в контейнер
                const reviewElement = createReviewElement(data.review);
                reviewsContainer.appendChild(reviewElement);
                
                // Прокручиваем к новому сообщению
                reviewsContainer.scrollTop = reviewsContainer.scrollHeight;
                
                // Очищаем поле ввода
                reviewInput.value = '';
            }
        } catch (error) {
            console.error('Ошибка при отправке отзыва:', error);
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
        // Здесь должна быть логика получения ID текущего пользователя
        // Например, из localStorage или из глобального состояния приложения
        return localStorage.getItem('userId');
    };

    // Добавляем обработчик для автоматического расширения поля ввода
    reviewInput.addEventListener('input', () => {
        reviewInput.style.height = 'auto';
        reviewInput.style.height = reviewInput.scrollHeight + 'px';
    });

    // Загружаем отзывы при загрузке страницы
    loadReviews();

    // Опционально: периодическое обновление отзывов
    setInterval(loadReviews, 30000); // Обновление каждые 30 секунд
}); 