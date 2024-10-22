let orders = [];

function fetchOrders() {
    // Проверяем, есть ли сохраненные заказы в локальном хранилище
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
        displayOrders();
    } else {
        fetch('/get-orders')
            .then(response => response.json())
            .then(data => {
                orders = data;
                displayOrders();
                // Сохраняем полученные заказы в локальное хранилище
                localStorage.setItem('orders', JSON.stringify(orders));
            })
            .catch(error => console.error('Error:', error));
    }
}

function displayOrders() {
    const ordersContainer = document.getElementById('orders');
    ordersContainer.innerHTML = '';

    orders.forEach((order, index) => {
        const orderElement = document.createElement('div');
        orderElement.classList.add('order');
        orderElement.innerHTML = `
            <h3>Заказ #${index + 1}</h3>
            <p><strong>Продукт:</strong> ${order.product}</p>
            <p><strong>Тема:</strong> ${order.subject}</p>
            <p><strong>Описание:</strong> ${order.description}</p>
            <p><strong>Дата:</strong> ${order.date}</p>
        `;
        ordersContainer.appendChild(orderElement);
    });
}

// Добавляем новую функцию для обновления заказов
function updateOrders(newOrder) {
    orders.push(newOrder);
    displayOrders();
    // Сохраняем обновленные заказы в локальное хранилище
    localStorage.setItem('orders', JSON.stringify(orders));
}

// Загрузка заказов при открытии страницы
window.onload = fetchOrders;
