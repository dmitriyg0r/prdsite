const products = [
    {
        name: 'Домашнее задание',
        price: 300,
        image: 'одетый.png',
        description: 'Заказать домашнее задание по любому предмету'
    },
    {
        name: 'Презентация',
        price: 200,
        image: 'голый.png',
        description: 'Купить презентацию по любому предмету'
    },
    // Третий товар удален
    // Добавьте больше товаров по необходимости
];

function displayProducts() {
    const productsContainer = document.getElementById('products');
    
    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.classList.add('product');
        
        productElement.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p>${product.description}</p>
            <p>Цена от: ${product.price} руб.</p>
            <button onclick="buyProduct('${product.name}')">Купить</button>
        `;
        
        productsContainer.appendChild(productElement);
    });
}

function buyProduct(productName) {
    // Показываем форму заказа
    document.getElementById('orderForm').style.display = 'flex';
    // Сохраняем название продукта в глобальной переменной
    window.currentProduct = productName;
}

function closeOrderForm() {
    document.getElementById('orderForm').style.display = 'none';
}

// Изменяем обработчик отправки формы
document.getElementById('purchaseForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const subject = document.getElementById('orderSubject').value;
    const description = document.getElementById('orderDescription').value;
    const date = document.getElementById('orderDate').value;
    
    // Создаем объект с данными заказа
    const orderData = {
        product: window.currentProduct,
        subject: subject,
        description: description,
        date: date
    };
    
    // Отправляем данные на страницу администратора
    sendOrderToAdmin(orderData);
    
    closeOrderForm();
    this.reset(); // Очищаем форму
});

// Изменяем функцию sendOrderToAdmin
function sendOrderToAdmin(orderData) {
    console.log('Отправка данных заказа:', orderData);
    
    // Проверяем, существует ли функция updateOrders на странице администратора
    if (window.parent && typeof window.parent.updateOrders === 'function') {
        // Если функция существует, вызываем ее с данными заказа
        window.parent.updateOrders(orderData);
        alert('Заказ успешно отправлен!');
    } else {
        // Если функция не найдена, сохраняем заказ в локальное хранилище
        const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        savedOrders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(savedOrders));
        console.log('Заказ сохранен в локальное хранилище');
        alert('Заказ успешно сохранен!');
    }
}

// Вызываем функцию отображения товаров при загрузке страницы
window.onload = displayProducts;
