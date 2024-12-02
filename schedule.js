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

    // Проверяем роль пользователя при загрузке
    const userRole = localStorage.getItem('userRole');
    const adminControls = document.querySelectorAll('.admin-controls');
    
    if (userRole === 'Admin') {
        adminControls.forEach(control => control.style.display = 'block');
    }

    // Получаем все необходимые элементы
    const tables = document.querySelectorAll('.table-container table');
    const editBtns = document.querySelectorAll('.edit-schedule-btn');
    const saveBtns = document.querySelectorAll('.save-schedule-btn');
    const cancelBtns = document.querySelectorAll('.cancel-edit-btn');

    let originalData = {};

    // Функция для включения режима редактирования
    function enableEditing(tableContainer) {
        const table = tableContainer.querySelector('table');
        const cells = table.querySelectorAll('td:not(:first-child)');
        
        // Сохраняем оригинальные данные
        originalData[table.id] = Array.from(cells).map(cell => cell.textContent);

        cells.forEach(cell => {
            const value = cell.textContent;
            cell.classList.add('editing');
            cell.innerHTML = `<input type="text" value="${value}" />`;
        });

        // Показываем/скрываем соответствующие кнопки
        tableContainer.querySelector('.edit-schedule-btn').style.display = 'none';
        tableContainer.querySelector('.save-schedule-btn').style.display = 'inline-block';
        tableContainer.querySelector('.cancel-edit-btn').style.display = 'inline-block';
    }

    // Функция для сохранения изменений
    function saveChanges(tableContainer) {
        const table = tableContainer.querySelector('table');
        const cells = table.querySelectorAll('td:not(:first-child)');
        
        const scheduleData = Array.from(cells).map(cell => {
            const input = cell.querySelector('input');
            const value = input.value;
            cell.innerHTML = value;
            cell.classList.remove('editing');
            return value;
        });

        // Здесь можно добавить отправку данных на сервер
        saveScheduleToServer(table.id, scheduleData);

        // Возвращаем кнопки в исходное состояние
        tableContainer.querySelector('.edit-schedule-btn').style.display = 'inline-block';
        tableContainer.querySelector('.save-schedule-btn').style.display = 'none';
        tableContainer.querySelector('.cancel-edit-btn').style.display = 'none';
    }

    // Функция для отмены изменений
    function cancelEditing(tableContainer) {
        const table = tableContainer.querySelector('table');
        const cells = table.querySelectorAll('td:not(:first-child)');
        
        cells.forEach((cell, index) => {
            cell.innerHTML = originalData[table.id][index];
            cell.classList.remove('editing');
        });

        // Возвращаем кнопки в исходное состояние
        tableContainer.querySelector('.edit-schedule-btn').style.display = 'inline-block';
        tableContainer.querySelector('.save-schedule-btn').style.display = 'none';
        tableContainer.querySelector('.cancel-edit-btn').style.display = 'none';
    }

    // Функция для сохранения данных на сервере
    async function saveScheduleToServer(tableId, scheduleData) {
        try {
            const response = await fetch('/api/schedule/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify({
                    tableId,
                    scheduleData
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при сохранении расписания');
            }

            // Показываем уведомление об успешном сохранении
            alert('Расписание успешно обновлено');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при сохранении расписания');
        }
    }

    // Добавляем обработчики событий для кнопок
    editBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tableContainer = btn.closest('.table-container');
            enableEditing(tableContainer);
        });
    });

    saveBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tableContainer = btn.closest('.table-container');
            saveChanges(tableContainer);
        });
    });

    cancelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tableContainer = btn.closest('.table-container');
            cancelEditing(tableContainer);
        });
    });
});