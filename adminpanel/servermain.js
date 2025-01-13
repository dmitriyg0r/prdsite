const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const db = require('./maindb.js');
const app = express();
const path = require('path');

// Настройка CORS
app.use(cors({
    origin: ['https://space-point.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(express.json());

// Переместить статические маршруты после API-маршрутов
// Сначала определяем все API-маршруты
app.get('/api/WhiteList', async (req, res) => {
    console.log('Получен запрос к /api/WhiteList');
    
    try {
        console.log('Выполняем запрос к базе данных...');
        const [rows] = await db.query('SELECT * FROM White_List');
        console.log('Получены данные:', rows);
        
        res.json({ 
            success: true, 
            data: rows 
        });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/WhiteList', async (req, res) => {
    try {
        const { UUID, user } = req.body;
        if (!UUID || !user) {
            return res.status(400).json({ 
                success: false, 
                error: 'UUID и имя пользователя обязательны' 
            });
        }
        
        await db.query('INSERT INTO White_List (UUID, user) VALUES (?, ?)', [UUID, user]);
        res.json({ success: true, message: 'Запись добавлена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/WhiteList/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        await db.query('DELETE FROM White_List WHERE UUID = ?', [uuid]);
        res.json({ success: true, message: 'Запись удалена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Затем определяем статические маршруты
app.use('/adminpanel', express.static(path.join(__dirname, 'admin')));
app.get('/adminpanel', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// В самом конце - общая статика
app.use(express.static(__dirname));

// Роуты
app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает' });
});

// Добавить обработку ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера' 
    });
});

// Добавьте middleware для логирования всех запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Добавьте middleware для детального логирования всех запросов
app.use((req, res, next) => {
    console.log({
        method: req.method,
        url: req.url,
        path: req.path,
        headers: req.headers,
        query: req.query,
        body: req.body
    });
    next();
});

// Путь к SSL сертификатам
const options = {
    cert: fs.readFileSync(path.join('/etc/letsencrypt/live/space-point.ru', 'fullchain.pem')),
    key: fs.readFileSync(path.join('/etc/letsencrypt/live/space-point.ru', 'privkey.pem')),
    ca: fs.readFileSync(path.join('/etc/letsencrypt/live/space-point.ru', 'chain.pem'))
};

// Создаем HTTPS сервер
https.createServer(options, app).listen(3000, '0.0.0.0', () => {
    console.log('HTTPS Сервер запущен на порту 3000');
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
    console.error('Необработанная ошибка:', error);
});

// Добавьте в начало после определения app
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log(r.route.path)
    }
});

// Или добавьте специальный эндпоинт для просмотра маршрутов
app.get('/api/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(function(middleware){
        if(middleware.route){ // routes registered directly on the app
            routes.push({
                path: middleware.route.path,
                method: Object.keys(middleware.route.methods)[0]
            });
        }
    });
    res.json(routes);
});

// Убедимся, что маршруты API обрабатываются до статических файлов
const apiRoutes = express.Router();
apiRoutes.get('/WhiteList', /* ... существующий обработчик ... */);
apiRoutes.post('/WhiteList', /* ... существующий обработчик ... */);
apiRoutes.delete('/WhiteList/:uuid', /* ... существующий обработчик ... */);

app.use('/api', apiRoutes);

// Обработчик 404 ошибок
app.use((req, res) => {
    console.log('404 для URL:', req.url);
    res.status(404).json({
        success: false,
        error: `Путь ${req.url} не найден`
    });
});