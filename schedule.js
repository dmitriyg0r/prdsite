document.addEventListener("DOMContentLoaded", function() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (воскресенье) - 6 (суббота)
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((today - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7) % 2; // 0 - четная, 1 - нечетная

    // Отображение расписания в зависимости от четности недели
    if (weekNumber === 1) {
        document.getElementById('even-week-schedule').style.display = 'block';
        document.getElementById('odd-week-schedule').style.display = 'none';
    } else {
        document.getElementById('even-week-schedule').style.display = 'none';
        document.getElementById('odd-week-schedule').style.display = 'block';
    }

    // Получаем все строки таблицы
    const rows = document.querySelectorAll('#even-week-schedule tbody tr, #odd-week-schedule tbody tr');

    // Удаляем класс .today-highlight из всех строк
    rows.forEach(row => {
        row.classList.remove('today-highlight');
    });

    // Добавляем класс .today-highlight к строке, соответствующей текущему дню
    if (dayOfWeek > 0 && dayOfWeek <= 6) { // Пропускаем воскресенье
        rows[dayOfWeek - 1].classList.add('today-highlight'); // dayOfWeek - 1, так как массив начинается с 0
    }
});