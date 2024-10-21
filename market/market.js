const products = [
    {
        name: 'Товар 1',
        price: 1000,
        image: 'https://via.placeholder.com/150',
        description: 'Описание товара 1'
    },
    {
        name: 'Товар 2',
        price: 2000,
        image: 'https://via.placeholder.com/150',
        description: 'Описание товара 2'
    },
    {
        name: 'Товар 3',
        price: 3000,
        image: 'https://via.placeholder.com/150',
        description: 'Описание товара 3'
    },
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
            <button onclick="addToCart('${product.name}')">Добавить в корзину</button>
        `;
        
        productsContainer.appendChild(productElement);
    });
}

function addToCart(productName) {
    alert(`Товар "${productName}" добавлен в корзину!`);
    // Здесь вы можете добавить логику для реального добавления товара в корзину
}

// Вызываем функцию отображения товаров при загрузке страницы
window.onload = displayProducts;

