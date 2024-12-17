document.addEventListener('DOMContentLoaded', () => {
    // Инициализация счетчика корзины при загрузке
    updateCartCounter();

    // Получаем все необходимые элементы
    const quickViewBtns = document.querySelectorAll('.quick-view-btn');
    const modal = document.querySelector('.quick-view-modal');
    const modalContent = modal.querySelector('.modal-content');

    // Обработчик для кнопок быстрого просмотра
    quickViewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Получаем данные о товаре из карточки
            const productCard = btn.closest('.product-card');
            const productData = {
                id: productCard.dataset.productId,
                title: productCard.querySelector('.product-title').textContent,
                price: productCard.querySelector('.product-price').textContent,
                image: "picturies/photo_futbolka.jpg",
                image2: "picturies/photo_futbolka2.jpg"
            };

            openModal(productData);
        });
    });

    // Функция открытия модального окна
    function openModal(productData) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Обновляем содержимое модального окна без галереи миниатюр
        modalContent.innerHTML = `
            <button class="close-modal">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-product-details">
                <div class="modal-product-image">
                    <div class="main-image">
                        <button class="nav-btn prev-btn">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <img src="${productData.image}" alt="${productData.title}">
                        <button class="nav-btn next-btn">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-product-info">
                    <h2>${productData.title}</h2>
                    <p class="modal-price">${productData.price} </p>
                    <div class="size-selector">
                        <h3>Размер</h3>
                        <div class="size-options">
                            <button class="size-btn">S</button>
                            <button class="size-btn">M</button>
                            <button class="size-btn">L</button>
                            <button class="size-btn">XL</button>
                        </div>
                    </div>
                    <button class="add-to-cart-btn" disabled>Добавить в корзину</button>
                    <div class="product-description">
                        <h3>Описание</h3>
                        <p>Классическая футболка прямого кроя с коротким рукавом для мужчин с полной запечаткой ткани с обеих сторон. Выполнена из синтетического гипоаллергенного материала полиэфир, приятного на ощупь.</p>
                    </div>
                </div>
            </div>
        `;

        // Инициализируем обработчики в модальном окне
        initializeModalHandlers(productData);
    }

    // Функция закрытия модального окна
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });

    function initializeModalHandlers(productData) {
        const closeBtn = modalContent.querySelector('.close-modal');
        const sizeBtns = modalContent.querySelectorAll('.size-btn');
        const addToCartBtn = modalContent.querySelector('.add-to-cart-btn');
        const prevBtn = modalContent.querySelector('.prev-btn');
        const nextBtn = modalContent.querySelector('.next-btn');
        const galleryThumbs = modalContent.querySelectorAll('.gallery-thumb');
        const mainImage = modalContent.querySelector('.main-image img');

        // Обработчик закрытия
        closeBtn.addEventListener('click', closeModal);

        // Обработчик выбора размер
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                addToCartBtn.disabled = false;
            });
        });

        let currentImageIndex = 0;
        const images = [productData.image, productData.image2];

        function updateActiveImage(index) {
            currentImageIndex = index;
            mainImage.src = images[index];
            galleryThumbs.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        }

        // Обработчики для навигации
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
            updateActiveImage(newIndex);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
            updateActiveImage(newIndex);
        });

        // Обработчик для миниатюр
        galleryThumbs.forEach((thumb, index) => {
            thumb.addEventListener('click', () => {
                updateActiveImage(index);
            });
        });

        // Обработчик добавления в корзину
        addToCartBtn.addEventListener('click', () => {
            const selectedSize = modalContent.querySelector('.size-btn.selected');
            if (selectedSize) {
                addToCart({
                    id: productData.id,
                    title: productData.title,
                    price: productData.price,
                    size: selectedSize.textContent,
                    image: productData.image,
                    quantity: 1
                });
                showNotification('Товар добавлен в корзину');
                closeModal();
            }
        });
    }
});

// Вспомогательные функции
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function addToCart(item) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounter();
}

function updateCartCounter() {
    const counter = document.querySelector('.cart-counter');
    if (counter) {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        counter.textContent = cart.length;
        counter.style.display = cart.length > 0 ? 'flex' : 'none';
    }
}
