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
            <p>Цена: ${product.price} руб.</p>
            <button onclick="buyProduct('${product.name}')">Купить</button>
        `;
        
        productsContainer.appendChild(productElement);
    });
}

function buyProduct(productName) {
    alert(`Вы купили товар "${productName}"!`);
    // Здесь вы можете добавить логику для реальной покупки товара
}

// Вызываем функцию отображения товаров при загрузке страницы
window.onload = displayProducts;
