const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();

// Путь к файлу с данными
const DB_PATH = path.join(__dirname, 'users.json');

// Функция для загрузки пользователей из файла
function loadUsers() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    // Возвращаем массив по умолчанию, если файл не существует или произошла ошибка
    return [
        { 
            username: 'dimon', 
            password: 'Gg3985502', 
            role: 'Admin',
            createdAt: new Date()
        }
    ];
}

// Функция для сохранения пользователей в файл
function saveUsers(users) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Загружаем пользователей при старте сервера
let users = loadUsers();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://adminflow.ru'],
    credentials: true
}));
app.use(bodyParser.json());

// Логгер запросов
app.use((req, res, next) => {
    console.log('\n=== Новый запрос ===');
    console.log('Время:', new Date().toISOString());
    console.log('Метод:', req.method);
    console.log('URL:', req.url);
    console.log('Тело:', req.body);
    next();
});

// Маршрут для регистрации
app.post('/api/register', (req, res) => {
    console.log('POST /api/register вызван');
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Требуются имя пользователя и пароль'
        });
    }

    if (users.find(u => u.username === username)) {
        return res.status(400).json({
            success: false,
            message: 'Пользователь уже существует'
        });
    }

    const newUser = {
        username,
        password,
        role: 'User',
        createdAt: new Date()
    };

    users.push(newUser);
    saveUsers(users); // Сохраняем изменения

    res.json({
        success: true,
        message: 'Регистрация успешна',
        data: { username: newUser.username, role: newUser.role }
    });
});

// Маршрут для входа
app.post('/api/auth/login', (req, res) => {
    console.log('POST /api/auth/login вызван');
    console.log('Тело запроса:', req.body);
    
    const { username, password } = req.body;

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Неверное имя пользователя или пароль'
        });
    }

    res.json({
        success: true,
        message: 'Вход выполнен успешно',
        data: {
            username: user.username,
            role: user.role
        }
    });
});

// Маршрут для анонимного входа
app.post('/api/auth/anonymous-login', (req, res) => {
    console.log('POST /api/auth/anonymous-login вызван');
    
    const anonymousUser = {
        username: `anonymous_${Date.now()}`,
        role: 'Anonymous'
    };

    res.json({
        success: true,
        message: 'Анонимный вход выполнен успешно',
        data: anonymousUser
    });
});

// Маршрут для получения списка пользователей
app.get('/api/users', (req, res) => {
    console.log('GET /api/users вызван');
    
    // Отправляем список пользователей без паролей
    const safeUsers = users.map(user => ({
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
    }));

    res.json({
        success: true,
        data: safeUsers
    });
});

// Маршрут для удаления пользователя
app.delete('/api/users/:username', (req, res) => {
    console.log('DELETE /api/users/:username вызван');
    const { username } = req.params;
    
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }
    
    if (users[userIndex].role === 'Admin' && 
        users.filter(u => u.role === 'Admin').length === 1) {
        return res.status(400).json({
            success: false,
            message: 'Невозможно удалить последнего администратора'
        });
    }
    
    users.splice(userIndex, 1);
    saveUsers(users); // Сохраняем изменения

    res.json({
        success: true,
        message: 'Пользователь успешно удален'
    });
});

// Добавьте новые маршруты для работы с рекордами
app.post('/api/scores', async (req, res) => {
    const { username, score } = req.body;
    
    try {
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // Сохраняем рекорд в файл scores.json
        const scoresPath = path.join(__dirname, 'scores.json');
        let scores = [];
        
        if (fs.existsSync(scoresPath)) {
            scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
        }
        
        scores.push({
            username,
            score,
            timestamp: new Date()
        });
        
        fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));

        res.json({
            success: true,
            message: 'Рекорд сохранен'
        });
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при сохранении рекорда'
        });
    }
});

app.get('/api/scores', (req, res) => {
    try {
        const scoresPath = path.join(__dirname, 'scores.json');
        let scores = [];
        
        if (fs.existsSync(scoresPath)) {
            scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
        }
        
        // Сортируем по убыванию счета и берем топ-10
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 10);

        res.json({
            success: true,
            data: scores
        });
    } catch (error) {
        console.error('Error getting scores:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении рекордов'
        });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log('Доступные маршруты:');
    console.log('POST /api/register');
    console.log('POST /api/auth/login');
    console.log('POST /api/auth/anonymous-login');
    console.log('GET  /api/users');
});