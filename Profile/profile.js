// Импорты из модулей
import {
    API_BASE_URL,
    showError,
    showSuccess,
    togglePassword,
    apiRequest
} from './modules/utils.js';

import {
    handleLogin,
    handleRegister,
    handleLogout,
    handleAnonymousLogin,
    showProfile,
    loadUserAvatar,
    initializeAvatarUpload
} from './modules/auth.js';

import {
    openChat,
    closeChat,
    sendMessage,
    deleteMessage,
    initializeChatHandlers
} from './modules/chat.js';

import {
    loadFriendsList,
    loadFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    showFriendWall
} from './modules/friends.js';

import {
    createPost,
    loadPosts,
    likePost,
    deletePost,
    initializePostHandlers
} from './modules/posts.js';

import {
    loadUsers,
    changeRole,
    deleteUser,
    createUser,
    checkUserRole,
    updateInterfaceBasedOnRole
} from './modules/admin.js';

// Делаем функции доступными глобально
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.handleAnonymousLogin = handleAnonymousLogin;
window.togglePassword = togglePassword;

window.openChat = openChat;
window.closeChat = closeChat;
window.sendMessage = sendMessage;
window.deleteMessage = deleteMessage;

window.loadFriendsList = loadFriendsList;
window.loadFriendRequests = loadFriendRequests;
window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.removeFriend = removeFriend;
window.searchUsers = searchUsers;
window.showFriendWall = showFriendWall;

window.createPost = createPost;
window.loadPosts = loadPosts;
window.likePost = likePost;
window.deletePost = deletePost;

window.loadUsers = loadUsers;
window.changeRole = changeRole;
window.deleteUser = deleteUser;
window.createUser = createUser;
window.checkUserRole = checkUserRole;

// Глобальная переменная для интервала проверки роли
let roleCheckInterval;

// Функция запуска проверки роли
function startRoleChecking() {
    roleCheckInterval = setInterval(checkUserRole, 30000); // Проверка каждые 30 секунд
}

// Функция остановки проверки роли
function stopRoleChecking() {
    if (roleCheckInterval) {
        clearInterval(roleCheckInterval);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Проверяем авторизацию
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            await showProfile(user);
            startRoleChecking();
        }

        // Инициализируем обработчики
        initializeChatHandlers();
        initializePostHandlers();

        // Инициализируем поиск пользователей
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (e.target.value.trim()) {
                    searchUsers(e.target.value);
                }
            });
        }

        // Загружаем начальные данные
        loadFriendsList();
        loadFriendRequests();
        loadPosts();

        // Обработчики переключения форм
        const showRegisterBtn = document.getElementById('show-register');
        const showLoginBtn = document.getElementById('show-login');
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                document.getElementById('login-container').style.display = 'none';
                document.getElementById('register-container').style.display = 'block';
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                document.getElementById('register-container').style.display = 'none';
                document.getElementById('login-container').style.display = 'block';
            });
        }

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Ошибка при инициализации приложения');
    }
});

// Обработчик перед закрытием страницы
window.addEventListener('beforeunload', () => {
    stopRoleChecking();
});

// Обработчик ошибок
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError('Произошла непредвиденная ошибка');
});

// Обработчик непойманных промисов
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('Произошла ошибка при выполнении асинхронной операции');
});

