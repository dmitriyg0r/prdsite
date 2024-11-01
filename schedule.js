document.addEventListener("DOMContentLoaded", function() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (воскресенье) - 6 (суббота)
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Текущее время в минутах

    // Массив с временными слотами (начало и конец в минутах)
    const timeSlots = [
        { start: 9 * 60, end: 10 * 60 + 30 },     // 9:00 - 10:30
        { start: 10 * 60 + 40, end: 12 * 60 + 10 }, // 10:40 - 12:10
        { start: 12 * 60 + 40, end: 14 * 60 + 10 }, // 12:40 - 14:10
        { start: 14 * 60 + 40, end: 16 * 60 + 10 }, // 14:40 - 16:10
        { start: 16 * 60 + 20, end: 17 * 60 + 50 }, // 16:20 - 17:50
        { start: 18 * 60, end: 19 * 60 + 30 }      // 18:00 - 19:30
    ];

    // Вычисление номера недели
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    const weekNumber = getWeekNumber(today);
    const isEvenWeek = weekNumber % 2 === 0;

    // Отображение расписания в зависимости от четности недели
    const evenWeekSchedule = document.getElementById('even-week-schedule');
    const oddWeekSchedule = document.getElementById('odd-week-schedule');

    if (evenWeekSchedule && oddWeekSchedule) {
        evenWeekSchedule.style.display = isEvenWeek ? 'block' : 'none';
        oddWeekSchedule.style.display = isEvenWeek ? 'none' : 'block';
    }

    // Подсветка текущего дня и активной пары
    const activeSchedule = isEvenWeek ? evenWeekSchedule : oddWeekSchedule;
    if (dayOfWeek > 0 && dayOfWeek < 6) { // Проверяем, что это будний день
        const rows = activeSchedule.querySelectorAll('tbody tr');
        const currentRow = rows[dayOfWeek - 1];
        
        if (currentRow) {
            currentRow.classList.add('today-highlight'); // Подсвечиваем текущий день

            // Находим текущую пару
            const cells = currentRow.querySelectorAll('td');
            timeSlots.forEach((slot, index) => {
                if (currentTime >= slot.start && currentTime <= slot.end) {
                    cells[index + 1]?.classList.add('current-lesson');
                } else if (currentTime < slot.start) {
                    cells[index + 1]?.classList.add('upcoming-lesson');
                } else {
                    cells[index + 1]?.classList.add('past-lesson');
                }
            });
        }
    }

    function updateLessonProgress() {
        if (dayOfWeek > 0 && dayOfWeek < 6) {
            const currentLesson = document.querySelector('.current-lesson');
            if (currentLesson) {
                timeSlots.forEach((slot, index) => {
                    if (currentTime >= slot.start && currentTime <= slot.end) {
                        const totalDuration = slot.end - slot.start;
                        const elapsed = currentTime - slot.start;
                        const progress = (elapsed / totalDuration) * 100;
                        
                        let progressBar = currentLesson.querySelector('.progress-bar');
                        if (!progressBar) {
                            progressBar = document.createElement('div');
                            progressBar.className = 'progress-bar';
                            currentLesson.appendChild(progressBar);
                        }
                        
                        progressBar.style.transform = `translateX(-${100 - progress}%)`;
                    }
                });
            }
        }
    }

    // Обновляем прогресс каждую минуту
    updateLessonProgress();
    setInterval(updateLessonProgress, 60000);
});