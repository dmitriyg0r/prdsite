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
    
    // Отправляем данные на сервер
    sendOrderToTelegram(orderData);
    
    closeOrderForm();
    this.reset(); // Очищаем форму
});

// Добавляем функцию для отправки данных на сервер
function sendOrderToTelegram(orderData) {
    console.log('Отправка данных заказа:', orderData);
    fetch('/send-order', {  // Изменен URL на локальный эндпоинт
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
    })
    .then(response => {
        console.log('Ответ сервера:', response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Данные ответа:', data);
        if (data.success) {
            alert('Заказ успешно отправлен в Telegram!');
        } else {
            alert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch((error) => {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
    });
}

// Вызываем функцию отображения товаров при загрузке страницы
window.onload = displayProducts;
