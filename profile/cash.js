const clearCacheBtn = document.getElementById('clearCacheBtn');
clearCacheBtn?.addEventListener('click', async () => {
    if (!confirm('КЭШ УДАЛИ!')) return;

    try {
        clearCacheBtn.classList.add('loading');
        clearCacheBtn.disabled = true;

        // Forcefully clear browser cache using window.location reload
        window.location.reload(true);
        
        // For modern browsers, clear application cache
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        // Force reload from server
        window.location.href = window.location.href;
    } catch (error) {
        console.error('Ошибка при очистке кэша:', error);
        alert('Произошла ошибка при очистке кэша');
    } finally {
        clearCacheBtn.classList.remove('loading');
        clearCacheBtn.disabled = false;
    }
});