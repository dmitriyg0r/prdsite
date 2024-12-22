const clearCacheBtn = document.getElementById('clearCacheBtn');
clearCacheBtn?.addEventListener('click', async () => {
    if (!confirm('КЭШ УДАЛИ!')) return;

    try {
        clearCacheBtn.classList.add('loading');
        clearCacheBtn.disabled = true;

        // Clear browser cache
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        // Clear local and session storage
        localStorage.clear();
        sessionStorage.clear();

        // Hard reload the page with cache bypass
        window.location.reload(true);

        // If the above doesn't work in some browsers, force reload through URL
        setTimeout(() => {
            window.location.href = window.location.href + '?t=' + Date.now();
        }, 100);
        
    } catch (error) {
        console.error('Ошибка при очистке кэша:', error);
        alert('Произошла ошибка при очистке кэша');
    } finally {
        clearCacheBtn.classList.remove('loading');
        clearCacheBtn.disabled = false;
    }
});