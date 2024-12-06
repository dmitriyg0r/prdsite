document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '/authreg/authreg.html';
        return;
    }

    // Заполняем информацию профиля
    document.getElementById('username').textContent = user.username;
    document.getElementById('role').textContent = user.role;
    document.getElementById('created_at').textContent = new Date(user.created_at).toLocaleString();
    document.getElementById('last_login').textContent = user.last_login ? 
        new Date(user.last_login).toLocaleString() : 'Нет данных';

    // Устанавливаем аватар пользователя
    document.getElementById('profile-avatar').src = user.avatar_url || '/uploads/avatars/default.png';

    // Загрузка аватара
    const avatarUpload = document.getElementById('avatar-upload');
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('userId', user.id);

        try {
            const response = await fetch('https://adminflow.ru:5003/api/upload-avatar', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();
            
            if (response.ok) {
                const newAvatarUrl = data.avatarUrl + '?t=' + new Date().getTime();
                document.getElementById('profile-avatar').src = newAvatarUrl;
                
                // Обновляем URL аватарки в localStorage
                user.avatar_url = data.avatarUrl;
                localStorage.setItem('user', JSON.stringify(user));
            } else {
                alert(data.error || 'Ошибка при загрузке аватара');
            }
        } catch (err) {
            console.error('Error uploading avatar:', err);
            alert('Ошибка при загрузке аватара');
        }
    });

    // Обработчик выхода
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '/authreg/authreg.html';
    });
}); 