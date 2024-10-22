const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;

const app = express();
app.use(bodyParser.json());

const ORDERS_FILE = 'orders.json';

// Функция для чтения заказов из файла
async function readOrders() {
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Если файл не существует, возвращаем пустой массив
            return [];
        }
        throw error;
    }
}

// Функция для записи заказов в файл
async function writeOrders(orders) {
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// Обработчик для добавления нового заказа
app.post('/add-order', async (req, res) => {
    try {
        const newOrder = req.body;
        const orders = await readOrders();
        orders.push(newOrder);
        await writeOrders(orders);
        res.json({ success: true, message: 'Заказ успешно добавлен' });
    } catch (error) {
        console.error('Ошибка при добавлении заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка при добавлении заказа' });
    }
});

// Обработчик для получения всех заказов
app.get('/get-orders', async (req, res) => {
    try {
        const orders = await readOrders();
        res.json(orders);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ success: false, message: 'Ошибка при получении заказов' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
