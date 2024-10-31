document.addEventListener("DOMContentLoaded", function() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (воскресенье) - 6 (суббота)
    const weekNumber = Math.ceil((today.getDate() + (new Date(today.getFullYear(), today.getMonth(), 1).getDay())) / 7) % 2; // 0 - четная, 1 - нечетная

    // Отображение расписания в зависимости от четности недели
    if (weekNumber === 0) {
        document.getElementById('even-week-schedule').style.display = 'block';
        document.getElementById('odd-week-schedule').style.display = 'none';
    } else {
        document.getElementById('even-week-schedule').style.display = 'none';
        document.getElementById('odd-week-schedule').style.display = 'block';
    }

    // Подсветка текущего дня
    const todayHighlightClass = 'today-highlight';
    const currentDayCells = document.querySelectorAll(`tbody tr:nth-child(${dayOfWeek + 1}) td`);
    currentDayCells.forEach(cell => {
        cell.classList.add(todayHighlightClass);
    });
});