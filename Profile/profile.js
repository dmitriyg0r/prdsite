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
    handleAnonymousLogin,
    handleLogout,
    showProfile,
    initializeAvatarUpload
} from './modules/auth.js';

import {
    loadFriendsList,
    loadFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    toggleFriendsList
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
    checkUserRole,
    updateInterfaceBasedOnRole
} from './modules/admin.js';

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

// Функция для открытия чата с пользователем
function openChat(username) {
    // Сохраняем выбранного пользователя в localStorage
    localStorage.setItem('chatPartner', username);
    // Перенаправляем на страницу чата
    window.location.href = '../chat/chat.html';
}

// Делаем функцию доступной глобально
window.openChat = openChat;

// Функция для отображения модального окна добавления друга
function showAddFriendModal() {
    const addFriendModal = document.getElementById('add-friend-modal');
    if (addFriendModal) {
        addFriendModal.style.display = 'block';
    }
}

// Делаем функцию доступной глобально
window.showAddFriendModal = showAddFriendModal;

// Функция для отображения кнопки чата в сайдбаре
function showChatButton() {
    const chatLink = document.getElementById('chat-link');
    if (chatLink) {
        chatLink.style.display = 'flex'; // Используем flex для соответствия стилям сайдбара
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
            showChatButton(); // Показываем кнопку чата после авторизации
        }

        // Инициализируем обработчики
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

