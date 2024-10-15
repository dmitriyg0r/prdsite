document.addEventListener('DOMContentLoaded', function() {
    const companyName = document.querySelector('.company-name');
    const developersPhrase = document.querySelector('.developers-phrase');
    const additionalPhrase = document.querySelector('.additional-phrase');
    let companyNameHidden = false;
    let developersPhraseVisible = false;

    function handleScroll() {
        if (!companyNameHidden && window.scrollY > 0) {
            companyName.classList.add('hidden');
            companyNameHidden = true;
            developersPhrase.classList.add('visible');
            developersPhraseVisible = true;
        }

        if (developersPhraseVisible && window.scrollY > 100) {
            additionalPhrase.classList.add('visible');
        }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Проверяем состояние при загрузке страницы
});