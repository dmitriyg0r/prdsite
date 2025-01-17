// Добавляем отладочную информацию для проверки авторизации
const checkUserAuth = () => {
    // Проверяем все возможные места хранения данных пользователя
    console.log('Проверка авторизации:');
    console.log('localStorage userData:', localStorage.getItem('userData'));
    console.log('localStorage user:', localStorage.getItem('user'));
    console.log('sessionStorage userData:', sessionStorage.getItem('userData'));
    console.log('sessionStorage user:', sessionStorage.getItem('user'));
    
    // Проверяем cookies
    console.log('Cookies:', document.cookie);
};

document.addEventListener('DOMContentLoaded', () => {
    checkUserAuth();
    const reviewsContainer = document.getElementById('reviews-messages');
    const reviewForm = document.getElementById('review-form');
    const reviewInput = document.getElementById('review-input');
    
    // Функция для форматирования времени
    const formatTime = (date) => {
        return new Intl.DateTimeFormat('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Функция для создания элемента отзыва
    const createReviewElement = (review) => {
        console.log('Создание элемента отзыва:', review);
        console.log('Пользователь админ?', isAdmin());
        
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
                    console.log('Нажата кнопка удаления для отзыва:', review.id);
                    await deleteReview(review.id);
                });
            }
        }
        
        return reviewElement;
    };

    // Функция проверки авторизации
    const isAdmin = () => {
        // Проверяем все возможные источники данных
        const userDataSources = [
            localStorage.getItem('userData'),
            localStorage.getItem('user'),
            localStorage.getItem('adminData'),
            sessionStorage.getItem('userData'),
            sessionStorage.getItem('user'),
            sessionStorage.getItem('adminData')
        ];

        console.log('Все источники данных:', userDataSources);

        for (const source of userDataSources) {
            if (source) {
                try {
                    const userData = JSON.parse(source);
                    console.log('Найдены данные пользователя:', userData);
                    if (userData.role === 'admin') {
                        return true;
                    }
                } catch (e) {
                    console.error('Ошибка парсинга данных:', e);
                }
            }
        }

        // Проверяем cookie
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        
        console.log('Cookies:', cookies);

        return false;
    };

    // Функция для получения текущего пользователя
    const getCurrentUser = () => {
        // Проверяем все возможные источники данных
        const sources = ['userData', 'user', 'adminData'];
        
        for (const source of sources) {
            const data = localStorage.getItem(source) || sessionStorage.getItem(source);
            if (data) {
                try {
                    return JSON.parse(data);
                } catch (e) {
                    console.error(`Ошибка парсинга ${source}:`, e);
                }
            }
        }
        
        return null;
    };

    // Функция получения ID текущего пользователя
    const getCurrentUserId = () => {
        const user = getCurrentUser();
        return user ? user.id : null;
    };

    // Функция удаления отзыва
    const deleteReview = async (reviewId) => {
        console.log('Попытка удаления отзыва:', reviewId);
        
        if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) {
            console.log('Удаление отменено пользователем');
            return;
        }

        try {
            const userId = getCurrentUserId();
            console.log('ID пользователя для удаления:', userId);
            
            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });

            console.log('Ответ сервера:', response);
            const data = await response.json();
            console.log('Данные ответа:', data);
            
            if (data.success) {
                const reviewElement = document.querySelector(`[data-review-id="${reviewId}"]`);
                if (reviewElement) {
                    reviewElement.remove();
                    console.log('Отзыв успешно удален из DOM');
                }
            } else {
                console.error('Ошибка при удалении:', data.error);
                alert(data.error || 'Ошибка при удалении отзыва');
            }
        } catch (error) {
            console.error('Ошибка при удалении отзыва:', error);
            alert('Ошибка при удалении отзыва');
        }
    };

    // Функция для загрузки отзывов
    const loadReviews = async () => {
        console.log('Начало загрузки отзывов');
        try {
            const response = await fetch('/api/reviews');
            const data = await response.json();
            console.log('Полученные отзывы:', data);
            
            if (data.success) {
                const reviewsContainer = document.getElementById('reviews-messages');
                reviewsContainer.innerHTML = '';
                
                data.reviews.forEach(review => {
                    const reviewElement = createReviewElement(review);
                    reviewsContainer.appendChild(reviewElement);
                });
                console.log('Отзывы успешно загружены и отображены');
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