const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Пути к файлам
const DB_PATH = path.join(__dirname, 'users.json');
const FRIENDS_DB_PATH = path.join(__dirname, 'friends.json');
const FRIEND_REQUESTS_DB_PATH = path.join(__dirname, 'friend_requests.json');
const MESSAGES_DB_PATH = path.join(__dirname, 'messages.json');
const SCHEDULE_PATH = path.join(__dirname, 'schedule.json');
const POSTS_DB_PATH = path.join(__dirname, 'posts.json');

// Функции загрузки данных
function loadUsers() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return [{ username: 'dimon', password: 'Gg3985502', role: 'Admin', createdAt: new Date() }];
}

function loadFriendships() {
    try {
        if (fs.existsSync(FRIENDS_DB_PATH)) {
            return JSON.parse(fs.readFileSync(FRIENDS_DB_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading friendships:', error);
    }
    return [];
}

function loadMessages() {
    try {
        if (fs.existsSync(MESSAGES_DB_PATH)) {
            return JSON.parse(fs.readFileSync(MESSAGES_DB_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
    return [];
}

function loadPosts() {
    try {
        if (fs.existsSync(POSTS_DB_PATH)) {
            return JSON.parse(fs.readFileSync(POSTS_DB_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
    return [];
}

function loadFriendRequests() {
    try {
        if (fs.existsSync(FRIEND_REQUESTS_DB_PATH)) {
            return JSON.parse(fs.readFileSync(FRIEND_REQUESTS_DB_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
    return [];
}

// Функции сохранения данных
function saveUsers(users) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

function saveFriendships(friendships) {
    try {
        fs.writeFileSync(FRIENDS_DB_PATH, JSON.stringify(friendships, null, 2));
    } catch (error) {
        console.error('Error saving friendships:', error);
    }
}

function saveMessages(messages) {
    try {
        fs.writeFileSync(MESSAGES_DB_PATH, JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error('Error saving messages:', error);
    }
}

function savePosts(posts) {
    try {
        fs.writeFileSync(POSTS_DB_PATH, JSON.stringify(posts, null, 2));
    } catch (error) {
        console.error('Error saving posts:', error);
    }
}

function saveFriendRequests(requests) {
    try {
        fs.writeFileSync(FRIEND_REQUESTS_DB_PATH, JSON.stringify(requests, null, 2));
    } catch (error) {
        console.error('Error saving friend requests:', error);
    }
}

// Конфигурация multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads', 'avatars');
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
    limits: { fileSize: 5 * 1024 * 1024 },
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

module.exports = {
    loadUsers,
    loadFriendships,
    loadMessages,
    saveUsers,
    saveFriendships,
    saveMessages,
    upload,
    DB_PATH,
    FRIENDS_DB_PATH,
    MESSAGES_DB_PATH,
    loadPosts,
    savePosts,
    loadFriendRequests,
    saveFriendRequests
}; 