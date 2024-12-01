const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
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

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads', 'avatars');
        // Создаем директорию, если она не существует
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB максимальный размер
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Разрешены только изображения!'));
    }
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
    
    // Отправляем список пользователей без паролей, но с аватарами
    const safeUsers = users.map(user => ({
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        avatarUrl: user.avatar // Добавляем путь к аватару
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

app.get('/api/scores', async (req, res) => {
    try {
        const scoresPath = path.join(__dirname, 'scores.json');
        let scores = [];
        
        if (fs.existsSync(scoresPath)) {
            scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
        }
        
        // Добавляем информацию об аватарах к рекордам
        const scoresWithAvatars = scores.map(score => {
            const user = users.find(u => u.username === score.username);
            return {
                ...score,
                avatarUrl: user?.avatar || null
            };
        });
        
        // Сортируем по убыванию счета и берем топ-10
        scoresWithAvatars.sort((a, b) => b.score - a.score);
        const top10Scores = scoresWithAvatars.slice(0, 10);

        res.json({
            success: true,
            data: top10Scores
        });
    } catch (error) {
        console.error('Error getting scores:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении рекордов'
        });
    }
});

// Добавляем новый маршрут для загрузки аватара
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Файл не был загружен'
        });
    }

    const username = req.body.username;
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    // Обновляем путь к аватару пользователя
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    saveUsers(users);

    res.json({
        success: true,
        message: 'Аватар успешно загружен',
        data: {
            avatarUrl: user.avatar
        }
    });
});

// Добавляем маршрут для получения аватара
app.get('/api/uploads/avatars/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', 'avatars', filename);
    
    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).send('Аватар не найден');
    }
});

// Добавляем маршрут для получения информации об аватаре пользователя
app.get('/api/users/:username/avatar', (req, res) => {
    const { username } = req.params;
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    res.json({
        success: true,
        data: {
            avatarUrl: user.avatar || null
        }
    });
});

// Добавляем структуру для хранения запросов в друзья и списков друзей
const friendRequests = [];
const friendships = [];

// Маршрут для поиска пользователей
app.get('/api/users/search', (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.json({ success: true, data: [] });
    }

    const searchResults = users
        .filter(user => 
            user.username.toLowerCase().includes(query.toLowerCase()) &&
            user.username !== req.headers.authorization.split(' ')[1] // Исключаем текущего пользователя
        )
        .map(user => ({
            username: user.username,
            avatarUrl: user.avatar
        }));

    res.json({ success: true, data: searchResults });
});

// Маршрут для отправки запроса в друзья
app.post('/api/friends/request', (req, res) => {
    const { targetUsername } = req.body;
    const senderUsername = req.headers.authorization.split(' ')[1];

    // Проверяем существование пользователей
    if (!users.find(u => u.username === targetUsername)) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    // Проверяем, не существует ли уже запрос
    const existingRequest = friendRequests.find(
        req => req.from === senderUsername && req.to === targetUsername
    );

    if (existingRequest) {
        return res.status(400).json({
            success: false,
            message: 'Запрос уже отправлен'
        });
    }

    // Проверяем, не являются ли пользователи уже друзьями
    const existingFriendship = friendships.find(
        f => (f.user1 === senderUsername && f.user2 === targetUsername) ||
             (f.user1 === targetUsername && f.user2 === senderUsername)
    );

    if (existingFriendship) {
        return res.status(400).json({
            success: false,
            message: 'Пользователи уже являются друзьями'
        });
    }

    // Создаем новый запрос
    const newRequest = {
        id: Date.now().toString(),
        from: senderUsername,
        to: targetUsername,
        createdAt: new Date()
    };

    friendRequests.push(newRequest);

    res.json({
        success: true,
        message: 'Запрос отправлен'
    });
});

// Маршрут для получения входящих запросов в друзья
app.get('/api/friends/requests', (req, res) => {
    const username = req.headers.authorization.split(' ')[1];

    const requests = friendRequests
        .filter(req => req.to === username)
        .map(req => {
            const sender = users.find(u => u.username === req.from);
            return {
                id: req.id,
                username: req.from,
                avatarUrl: sender?.avatar,
                createdAt: req.createdAt
            };
        });

    res.json({
        success: true,
        data: requests
    });
});

// Маршрут для принятия запроса в друзья
app.post('/api/friends/accept/:requestId', (req, res) => {
    const { requestId } = req.params;
    const username = req.headers.authorization.split(' ')[1];

    const requestIndex = friendRequests.findIndex(
        req => req.id === requestId && req.to === username
    );

    if (requestIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Запрос не найден'
        });
    }

    const request = friendRequests[requestIndex];

    // Создаем новую дружбу
    friendships.push({
        user1: request.from,
        user2: request.to,
        createdAt: new Date()
    });

    // Удаляем запрос
    friendRequests.splice(requestIndex, 1);

    res.json({
        success: true,
        message: 'Запрос принят'
    });
});

// Маршрут для отклонения запроса в друзья
app.post('/api/friends/reject/:requestId', (req, res) => {
    const { requestId } = req.params;
    const username = req.headers.authorization.split(' ')[1];

    const requestIndex = friendRequests.findIndex(
        req => req.id === requestId && req.to === username
    );

    if (requestIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Запрос не найден'
        });
    }

    // Удаляем запрос
    friendRequests.splice(requestIndex, 1);

    res.json({
        success: true,
        message: 'Запрос отклонен'
    });
});

// Маршрут для получения списка друзей
app.get('/api/friends/list', (req, res) => {
    const username = req.headers.authorization.split(' ')[1];

    const friendsList = friendships
        .filter(f => f.user1 === username || f.user2 === username)
        .map(f => {
            const friendUsername = f.user1 === username ? f.user2 : f.user1;
            const friend = users.find(u => u.username === friendUsername);
            return {
                username: friendUsername,
                avatarUrl: friend?.avatar,
                online: true // В реальном приложении здесь будет реальный статус
            };
        });

    res.json({
        success: true,
        data: friendsList
    });
});

// Маршрут для удаления друга
app.delete('/api/friends/remove/:friendUsername', (req, res) => {
    const { friendUsername } = req.params;
    const username = req.headers.authorization.split(' ')[1];

    const friendshipIndex = friendships.findIndex(
        f => (f.user1 === username && f.user2 === friendUsername) ||
             (f.user1 === friendUsername && f.user2 === username)
    );

    if (friendshipIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Дружба не найдена'
        });
    }

    // Удаляем дружбу
    friendships.splice(friendshipIndex, 1);

    res.json({
        success: true,
        message: 'Друг удален'
    });
});

// Добавляем структуру для хранения сообщений
const messages = [];

// Маршрут для получения истории сообщений
app.get('/api/chat/history/:username', (req, res) => {
    const { username } = req.params;
    const currentUser = req.headers.authorization.split(' ')[1];

    const chatHistory = messages.filter(msg => 
        (msg.from === currentUser && msg.to === username) ||
        (msg.from === username && msg.to === currentUser)
    );

    res.json({
        success: true,
        data: chatHistory
    });
});

// Маршрут для отправки сообщения
app.post('/api/chat/send', (req, res) => {
    const { to, message } = req.body;
    const from = req.headers.authorization.split(' ')[1];

    const newMessage = {
        from,
        to,
        message,
        timestamp: new Date()
    };

    messages.push(newMessage);

    res.json({
        success: true,
        data: newMessage
    });
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