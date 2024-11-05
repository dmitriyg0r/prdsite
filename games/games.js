document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('pixelCanvas');
    const colorPicker = document.getElementById('colorPicker');
    const clearButton = document.getElementById('clearButton');
    const GRID_SIZE = 50;
    let isDrawing = false;

    // Создаем сетку пикселей
    function createGrid() {
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const pixel = document.createElement('div');
            pixel.classList.add('pixel');
            canvas.appendChild(pixel);
        }
    }

    // Обработчики событий для рисования
    canvas.addEventListener('mousedown', () => isDrawing = true);
    document.addEventListener('mouseup', () => isDrawing = false);
    document.addEventListener('mouseleave', () => isDrawing = false);

    canvas.addEventListener('mouseover', (e) => {
        if (isDrawing && e.target.classList.contains('pixel')) {
            e.target.style.backgroundColor = colorPicker.value;
        }
    });

    canvas.addEventListener('click', (e) => {
        if (e.target.classList.contains('pixel')) {
            e.target.style.backgroundColor = colorPicker.value;
        }
    });

    // Кнопка очистки
    clearButton.addEventListener('click', () => {
        document.querySelectorAll('.pixel').forEach(pixel => {
            pixel.style.backgroundColor = 'white';
        });
    });

    // Инициализация игры
    createGrid();
});
