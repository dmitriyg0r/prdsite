const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();

// Пути к файлам данных
const DB_PATH = path.join(__dirname, 'users.json');
const FRIENDS_DB_PATH = path.join(__dirname, 'friends.json');
const FRIEND_REQUESTS_DB_PATH = path.join(__dirname, 'friend_requests.json');
const MESSAGES_DB_PATH = path.join(__dirname, 'messages.json');
const SCHEDULE_PATH = path.join(__dirname, 'schedule.json');

// Загрузка данных при старте
let users = loadUsers();
let friendships = loadFriendships();
let friendRequests = loadFriendRequests();
let messages = loadMessages();
let schedule = loadSchedule();

// Функции для работы с пользователями
function loadUsers() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [
        { 
            username: 'dimon', 
            password: 'Gg3985502', 
            role: 'Admin',
            createdAt: new Date()
        }
    ];
}

function saveUsers(users) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Функции для работы с друзьями
function loadFriendships() {
    try {
        if (fs.existsSync(FRIENDS_DB_PATH)) {
            const data = fs.readFileSync(FRIENDS_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading friendships:', error);
    }
    return [];
}

function saveFriendships(friendships) {
    try {
        fs.writeFileSync(FRIENDS_DB_PATH, JSON.stringify(friendships, null, 2));
    } catch (error) {
        console.error('Error saving friendships:', error);
    }
}

// Функции для работы с запросами в друзья
function loadFriendRequests() {
    try {
        if (fs.existsSync(FRIEND_REQUESTS_DB_PATH)) {
            const data = fs.readFileSync(FRIEND_REQUESTS_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
    return [];
}

function saveFriendRequests(requests) {
    try {
        fs.writeFileSync(FRIEND_REQUESTS_DB_PATH, JSON.stringify(requests, null, 2));
    } catch (error) {
        console.error('Error saving friend requests:', error);
    }
}

// Функции для работы с сообщениями
function loadMessages() {
    try {
        if (fs.existsSync(MESSAGES_DB_PATH)) {
            const data = fs.readFileSync(MESSAGES_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
    return [];
}

function saveMessages(messages) {
    try {
        fs.writeFileSync(MESSAGES_DB_PATH, JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error('Error saving messages:', error);
    }
}

// Функции для работы с расписанием
function loadSchedule() {
    try {
        if (fs.existsSync(SCHEDULE_PATH)) {
            return JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
    return {};
}

function saveSchedule(schedule) {
    try {
        fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2));
    } catch (error) {
        console.error('Error saving schedule:', error);
    }
}

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
    saveUsers(users);

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
    
    const safeUsers = users.map(user => ({
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        avatarUrl: user.avatar
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
    saveUsers(users);

    res.json({
        success: true,
        message: 'Пользователь успешно удален'
    });
});

// Маршруты для работы с рекордами
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
        
        const scoresWithAvatars = scores.map(score => {
            const user = users.find(u => u.username === score.username);
            return {
                ...score,
                avatarUrl: user?.avatar || null
            };
        });
        
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

// Маршрут для загрузки аватара
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
        // Удаляем загруженный файл, если пользоватеь не найден
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    // Удаляем старую аватарку, если она существует
    if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, user.avatar);
        try {
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        } catch (error) {
            console.error('Error deleting old avatar:', error);
        }
    }

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

// Маршрут для получения аватара
app.get('/api/uploads/avatars/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', 'avatars', filename);
    
    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).send('Аватар не найден');
    }
});

// Маршрут для получения информации об аватаре пользователя
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

// Маршрут для поиска пользователей
app.get('/api/users/search', (req, res) => {
    const { query } = req.query;
    const currentUser = req.headers.authorization?.split(' ')[1];
    
    if (!query || !currentUser) {
        return res.json({ success: true, data: [] });
    }

    const searchResults = users
        .filter(user => 
            user.username.toLowerCase().includes(query.toLowerCase()) &&
            user.username !== currentUser
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
    const senderUsername = req.headers.authorization?.split(' ')[1];

    if (!senderUsername || !targetUsername) {
        return res.status(400).json({
            success: false,
            message: 'Отсутствуют необходимые данные'
        });
    }

    if (!users.find(u => u.username === targetUsername)) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    const existingRequest = friendRequests.find(
        req => req.from === senderUsername && req.to === targetUsername
    );

    if (existingRequest) {
        return res.status(400).json({
            success: false,
            message: 'Запрос уже отправлен'
        });
    }

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

    const newRequest = {
        id: Date.now().toString(),
        from: senderUsername,
        to: targetUsername,
        createdAt: new Date()
    };

    friendRequests.push(newRequest);
    saveFriendRequests(friendRequests);

    res.json({
        success: true,
        message: 'Запрос отправлен'
    });
});

// Маршрут для получения входящих запросов в друзья
app.get('/api/friends/requests', (req, res) => {
    const username = req.headers.authorization?.split(' ')[1];

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }

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
    const username = req.headers.authorization?.split(' ')[1];

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }

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

    friendships.push({
        user1: request.from,
        user2: request.to,
        createdAt: new Date()
    });

    friendRequests.splice(requestIndex, 1);
    
    saveFriendships(friendships);
    saveFriendRequests(friendRequests);

    res.json({
        success: true,
        message: 'Запрос принят'
    });
});

// Маршрут для отклонения запроса в друзья
app.post('/api/friends/reject/:requestId', (req, res) => {
    const { requestId } = req.params;
    const username = req.headers.authorization?.split(' ')[1];

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }

    const requestIndex = friendRequests.findIndex(
        req => req.id === requestId && req.to === username
    );

    if (requestIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Запрос не найден'
        });
    }

    friendRequests.splice(requestIndex, 1);
    saveFriendRequests(friendRequests);

    res.json({
        success: true,
        message: 'Запрос отклонен'
    });
});

// Маршрут для получения списка друзей
app.get('/api/chat/friends', (req, res) => {
    const currentUser = req.headers.authorization?.split(' ')[1];
    
    if (!currentUser) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    // Находим текущего пользователя
    const user = users.find(u => u.username === currentUser);
    
    if (!user || !user.friends) {
        return res.json({
            success: true,
            data: []
        });
    }

    // Получаем список друзей с их данными
    const friendsList = user.friends
        .map(friendUsername => {
            const friend = users.find(u => u.username === friendUsername);
            if (friend) {
                return {
                    username: friend.username,
                    avatarUrl: friend.avatar || null
                };
            }
            return null;
        })
        .filter(friend => friend !== null); // Убираем null значения

    res.json({
        success: true,
        data: friendsList
    });
});

// Маршрут для получения последних сообщений
app.get('/api/chat/last-messages', (req, res) => {
    const currentUser = req.headers.authorization?.split(' ')[1];
    
    if (!currentUser) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    // Находим текущего пользователя и его друзей
    const user = users.find(u => u.username === currentUser);
    if (!user || !user.friends) {
        return res.json({
            success: true,
            data: {}
        });
    }

    // Получаем последние сообщения только для друзей
    const lastMessages = {};
    messages.forEach(msg => {
        if ((msg.from === currentUser || msg.to === currentUser) && 
            user.friends.includes(msg.from === currentUser ? msg.to : msg.from)) {
            const otherUser = msg.from === currentUser ? msg.to : msg.from;
            if (!lastMessages[otherUser] || new Date(msg.timestamp) > new Date(lastMessages[otherUser].timestamp)) {
                lastMessages[otherUser] = {
                    message: msg.message,
                    timestamp: msg.timestamp
                };
            }
        }
    });

    res.json({
        success: true,
        data: lastMessages
    });
});

// Маршрут для проверки статуса дружбы
app.get('/api/chat/check-friendship/:username', (req, res) => {
    const currentUser = req.headers.authorization?.split(' ')[1];
    const targetUsername = req.params.username;
    
    if (!currentUser) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    const user = users.find(u => u.username === currentUser);
    const isFriend = user && user.friends && user.friends.includes(targetUsername);

    res.json({
        success: true,
        data: { isFriend }
    });
});

// Маршрут для получения истории чата
app.get('/api/chat/history/:username', (req, res) => {
    console.log('GET /api/chat/history/:username вызван');
    const { username } = req.params;
    const currentUser = req.headers.authorization.split(' ')[1];

    try {
        const chatHistory = messages.filter(msg => 
            (msg.from === currentUser && msg.to === username) ||
            (msg.from === username && msg.to === currentUser)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log('Отправка истории чата:', {
            currentUser,
            chatPartner: username,
            messageCount: chatHistory.length
        });

        res.json({
            success: true,
            data: chatHistory
        });
    } catch (error) {
        console.error('Error in chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении истории чата',
            error: error.message
        });
    }
});

// Маршрут для отправки сообщения
app.post('/api/chat/send', (req, res) => {
    console.log('POST /api/chat/send вызван');
    const { to, message } = req.body;
    const from = req.headers.authorization.split(' ')[1];

    try {
        if (!message || !to) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо указать получателя и текст сообщения'
            });
        }

        const newMessage = {
            from,
            to,
            message,
            timestamp: new Date(),
            id: Date.now().toString()
        };

        messages.push(newMessage);
        saveMessages(messages);

        console.log('Сообщение отправлено:', {
            from,
            to,
            messageId: newMessage.id
        });

        res.json({
            success: true,
            data: newMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при отправке сообщения',
            error: error.message
        });
    }
});

// Маршрут для удаления сообщения
app.delete('/api/chat/message/:messageId', (req, res) => {
    console.log('DELETE /api/chat/message/:messageId вызван');
    const { messageId } = req.params;
    const currentUser = req.headers.authorization.split(' ')[1];

    try {
        const messageIndex = messages.findIndex(
            msg => msg.id === messageId && msg.from === currentUser
        );

        if (messageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Сообщение не найдено или у вас нет прав на его удаление'
            });
        }

        messages.splice(messageIndex, 1);
        saveMessages(messages);

        console.log('Сообщение удалено:', { messageId });

        res.json({
            success: true,
            message: 'Сообщение успешно удалено'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении сообщения',
            error: error.message
        });
    }
});

// Проверка авторизации
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') && !req.path.includes('/auth/')) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Требуется авторизация'
            });
        }
    }
    next();
});

// Маршрут для обновления роли пользователя
app.put('/api/users/:username/role', (req, res) => {
    const { username } = req.params;
    const { newRole } = req.body;
    const adminUsername = req.headers.authorization?.split(' ')[1];

    // Проверяем, что запрос делает администратор
    const admin = users.find(u => u.username === adminUsername && u.role === 'Admin');
    if (!admin) {
        return res.status(403).json({
            success: false,
            message: 'Недостаточно прав для выполнения операции'
        });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    // Запрещаем менять роль последнего администратора
    if (user.role === 'Admin' && 
        users.filter(u => u.role === 'Admin').length === 1) {
        return res.status(400).json({
            success: false,
            message: 'Невозможно изменить роль последнего администратора'
        });
    }

    user.role = newRole;
    saveUsers(users);

    res.json({
        success: true,
        message: 'Роль пользователя успешно обновлена'
    });
});

// Add a new route to get chat partners
app.get('/api/chat/partners', (req, res) => {
    const currentUser = req.headers.authorization.split(' ')[1];

    if (!currentUser) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }

    const chatPartners = messages.reduce((partners, msg) => {
        if (msg.from === currentUser && !partners.includes(msg.to)) {
            partners.push(msg.to);
        } else if (msg.to === currentUser && !partners.includes(msg.from)) {
            partners.push(msg.from);
        }
        return partners;
    }, []);

    res.json({
        success: true,
        data: chatPartners
    });
});

// Маршрут для отметки сообщений как прочитанных
app.post('/api/chat/mark-as-read', (req, res) => {
    const { fromUser } = req.body;
    const currentUser = req.headers.authorization?.split(' ')[1];

    if (!currentUser || !fromUser) {
        return res.status(400).json({
            success: false,
            message: 'Недостаточно данных'
        });
    }

    // Находим все непрочитанные сообщения от указанного пользователя
    messages = messages.map(msg => {
        if (msg.from === fromUser && msg.to === currentUser && !msg.isRead) {
            return { ...msg, isRead: true };
        }
        return msg;
    });

    // Сохраняем обновленные сообщения
    saveMessages(messages);

    res.json({
        success: true,
        message: 'Сообщения отмечены как прочитанные'
    });
});

// Маршрут для получения новых сообщений
app.get('/api/chat/new-messages/:username', (req, res) => {
    const { username } = req.params;
    const currentUser = req.headers.authorization?.split(' ')[1];

    if (!currentUser || !username) {
        return res.status(400).json({
            success: false,
            message: 'Недостаточно данных'
        });
    }

    // Получаем новые непрочитанные сообщения
    const newMessages = messages.filter(msg => 
        msg.from === username && 
        msg.to === currentUser && 
        !msg.isRead
    );

    res.json({
        success: true,
        data: newMessages
    });
});

// Маршрут для получения статуса сообщений
app.get('/api/chat/message-status/:username', (req, res) => {
    const { username } = req.params;
    const currentUser = req.headers.authorization?.split(' ')[1];

    if (!currentUser || !username) {
        return res.status(400).json({
            success: false,
            message: 'Недостаточно данных'
        });
    }

    // Получаем статусы сообщений
    const messageStatuses = messages
        .filter(msg => msg.from === currentUser && msg.to === username)
        .map(msg => ({
            messageId: msg.id,
            isRead: msg.isRead
        }));

    res.json({
        success: true,
        data: messageStatuses
    });
});

// Маршрут для обновления расписания
app.post('/api/schedule/update', (req, res) => {
    const { tableId, scheduleData } = req.body;
    const username = req.headers.authorization?.split(' ')[1];

    // Прове��яем права администратора
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: 'Недостаточно прав для редактирования расписания'
        });
    }

    try {
        const schedule = loadSchedule();
        schedule[tableId] = scheduleData;
        saveSchedule(schedule);

        res.json({
            success: true,
            message: 'Расписание успешно обновлено'
        });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении расписания'
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

// Обновляем пути к API
app.get('/api/user/check-role', (req, res) => {
    const currentUser = req.headers.authorization?.split(' ')[1];
    
    if (!currentUser) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    const user = users.find(u => u.username === currentUser);
    
    res.json({
        success: true,
        data: {
            role: user ? user.role : 'user'
        }
    });
});

app.get('/api/user/friends', (req, res) => {
    const currentUser = req.headers.authorization?.split(' ')[1];
    
    if (!currentUser) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    const user = users.find(u => u.username === currentUser);
    
    if (!user || !user.friends) {
        return res.json({
            success: true,
            data: []
        });
    }

    const friendsList = user.friends
        .map(friendUsername => {
            const friend = users.find(u => u.username === friendUsername);
            return friend ? {
                username: friend.username,
                avatarUrl: friend.avatar || null
            } : null;
        })
        .filter(Boolean);

    res.json({
        success: true,
        data: friendsList
    });
});