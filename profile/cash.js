const clearCacheBtn = document.getElementById('clearCacheBtn');
clearCacheBtn?.addEventListener('click', async () => {
    if (!confirm('КЭШ УДАЛИ!')) return;

    try {
        clearCacheBtn.classList.add('loading');
        clearCacheBtn.disabled = true;

        // Очистка кэша сервис-воркера
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
        }

        // Очистка кэша браузера
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        // Очистка локального хранилища
        localStorage.clear();
        sessionStorage.clear();

        // Очистка куки
        document.cookie.split(';').forEach(cookie => {
            document.cookie = cookie
                .replace(/^ +/, '')
                .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
        });

        // Принудительная перезагрузка с очисткой кэша
        window.location.href = window.location.origin + 
            window.location.pathname + 
            '?cache-bust=' + Date.now();
    } catch (error) {
        console.error('Ошибка при очистке кэша:', error);
        alert('Произошла ошибка при очистке кэша');
    } finally {
        clearCacheBtn.classList.remove('loading');
        clearCacheBtn.disabled = false;
    }
});