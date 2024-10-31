document.addEventListener("DOMContentLoaded", function() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (воскресенье) - 6 (суббота)
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((today - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7) % 2; // 0 - четная, 1 - нечетная

    // Отображение расписания в зависимости от четности недели
    if (weekNumber === 0) {
        document.getElementById('even-week-schedule').style.display = 'block';
        document.getElementById('odd-week-schedule').style.display = 'none';
    } else {
        document.getElementById('even-week-schedule').style.display = 'none';
        document.getElementById('odd-week-schedule').style.display = 'block';
    }

    // Подсветка текущего дня в расписании
    const rows = document.querySelectorAll('#odd-week-schedule tbody tr, #even-week-schedule tbody tr');
    if (dayOfWeek > 0 && dayOfWeek < 6) { // Проверяем, что это будний день
        rows[dayOfWeek - 1].classList.add('today-highlight'); // Подсвечиваем всю строку
    }
});