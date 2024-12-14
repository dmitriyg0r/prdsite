async function loadUsers() {
    try {
        const response = await fetch('https://adminflow.ru:5003/api/users-list');
        if (!response.ok) throw new Error('Ошибка при загрузке пользователей');
        
        const data = await response.json();
        displayUsers(data.users);
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-list');
    
    container.innerHTML = users.map(user => `
        <a href="/profile/profile.html?id=${user.id}" class="user-item">
            <img src="${user.avatar_url || '/uploads/avatars/default.png'}" 
                 alt="${user.username}" 
                 class="user-avatar">
            <span class="user-name">${user.username}</span>
        </a>
    `).join('');
}

// Добавим вызов функции при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        window.location.href = '/authreg/authreg.html';
        return;
    }
    
    await Promise.all([
        loadFeedPosts(),
        loadUsers()
    ]);
});
