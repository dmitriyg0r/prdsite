class ScrollManager {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.scrollButton = document.getElementById('scrollToBottomBtn');
        this.setupScrollButton();
    }

    setupScrollButton() {
        if (!this.messagesContainer || !this.scrollButton) return;

        // Обработчик прокрутки
        this.messagesContainer.addEventListener('scroll', () => {
            this.toggleScrollButton();
        });

        // Обработчик клика по кнопке
        this.scrollButton.addEventListener('click', () => {
            this.scrollToBottom();
        });
    }

    toggleScrollButton() {
        if (!this.messagesContainer || !this.scrollButton) return;

        // Показываем кнопку, если прокручено вверх более чем на 200px
        const shouldShow = this.messagesContainer.scrollHeight - this.messagesContainer.scrollTop 
            > this.messagesContainer.clientHeight + 200;
        
        if (shouldShow) {
            this.scrollButton.style.display = 'flex';
            this.scrollButton.classList.add('visible');
        } else {
            this.scrollButton.classList.remove('visible');
            setTimeout(() => {
                if (!this.scrollButton.classList.contains('visible')) {
                    this.scrollButton.style.display = 'none';
                }
            }, 300); // Соответствует времени анимации в CSS
        }
    }

    scrollToBottom() {
        if (!this.messagesContainer) return;

        this.messagesContainer.scrollTo({
            top: this.messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Метод для внешнего использования
    checkScroll() {
        this.toggleScrollButton();
    }
}

// Создаем глобальную переменную scrollManager сразу
window.scrollManager = null;

// Инициализируем после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.scrollManager = new ScrollManager();
});
