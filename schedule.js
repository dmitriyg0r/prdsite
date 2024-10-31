document.addEventListener("DOMContentLoaded", function() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (воскресенье) - 6 (суббота)
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Вычисление номера недели по ISO 8601
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    const weekNumber = getWeekNumber(today);
    const isEvenWeek = weekNumber % 2 === 0; // 0 - четная, 1 - нечетная

    // Отображение расписания в зависимости от четности недели
    const evenWeekSchedule = document.getElementById('even-week-schedule');
    const oddWeekSchedule = document.getElementById('odd-week-schedule');

    if (evenWeekSchedule && oddWeekSchedule) {
        evenWeekSchedule.style.display = isEvenWeek ? 'block' : 'none';
        oddWeekSchedule.style.display = isEvenWeek ? 'none' : 'block';
    }

    // Подсветка текущего дня в расписании
    const rows = document.querySelectorAll('#odd-week-schedule tbody tr, #even-week-schedule tbody tr');
    if (dayOfWeek > 0 && dayOfWeek < 6) { // Проверяем, что это будний день
        const rowIndex = dayOfWeek - 1;
        if (rows[rowIndex]) {
            rows[rowIndex].classList.add('today-highlight'); // Подсвечиваем всю строку
        }
    }
});