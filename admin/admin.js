let orders = [];

function fetchOrders() {
    fetch('/get-orders-from-file')
        .then(response => response.json())
        .then(data => {
            orders = data;
            displayOrders();
        })
        .catch(error => console.error('Error:', error));
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

// Добавляем функцию для периодического обновления заказов
function startOrderUpdates() {
    setInterval(fetchOrders, 30000); // Обновляем каждые 30 секунд
}

// Запускаем периодическое обновление при загрузке страницы
window.onload = () => {
    fetchOrders();
    startOrderUpdates();
};
