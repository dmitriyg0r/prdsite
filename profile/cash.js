const clearCacheBtn = document.getElementById('clear-cache-btn');
clearCacheBtn?.addEventListener('click', async () => {
    if (!confirm('Вы уверены, что хотите очистить кэш? Это может помочь при проблемах с отображением сайта.')) {
        return;
    }

    try {
        clearCacheBtn.classList.add('loading');
        clearCacheBtn.disabled = true;

        // Очищаем кэш ServiceWorker если он есть
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        }

        // Очищаем кэш браузера
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }

        // Очищаем localStorage (сохраняем только данные пользователя)
        const userData = localStorage.getItem('user');
        localStorage.clear();
        if (userData) {
            localStorage.setItem('user', userData);
        }

        alert('Кэш успешно очищен. Страница будет перезагружена.');
        window.location.reload(true);
    } catch (err) {
        console.error('Error clearing cache:', err);
        alert('Ошибка при очистке кэша');
    } finally {
        clearCacheBtn.classList.remove('loading');
        clearCacheBtn.disabled = false;
    }
});