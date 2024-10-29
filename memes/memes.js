document.addEventListener('DOMContentLoaded', function() {
    const showUploadFormButton = document.getElementById('show-upload-form');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const uploadForm = document.getElementById('upload-form');

    if (showUploadFormButton && uploadFormContainer) {
        showUploadFormButton.addEventListener('click', function() {
            uploadFormContainer.classList.toggle('show');
        });

        // Закрыть форму при клике вне её
        document.addEventListener('click', function(event) {
            if (!uploadFormContainer.contains(event.target) && event.target !== showUploadFormButton) {
                uploadFormContainer.classList.remove('show');
            }
        });
    }

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const adminPassword = prompt("Пожалуйста, введите пароль администратора:");
    
        if (adminPassword !== "Gg3985502") {
            alert("Неверный пароль администратора. Доступ запрещен.");
            return;
        }
    
        const formData = new FormData(uploadForm);
        formData.append('admin_password', adminPassword);
    
        fetch('memes.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Мем успешно загружен!');
                uploadForm.reset();
                uploadFormContainer.classList.remove('show');
                // Здесь можно добавить обновление списка мемов
            } else {
                alert(data.message || 'Произошла ошибка при загрузке мема');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Произошла ошибка при загрузке мема');
        });
    });

    // Добавляем эффект убегания от курсора
    const image = document.querySelector('.development-image img');
    const container = document.querySelector('.development-image');

    if (image && container) {
        let isMoving = false;
        const maxMove = 50; // Максимальное расстояние перемещения в пикселях

        container.addEventListener('mousemove', (e) => {
            if (isMoving) return;

            const rect = image.getBoundingClientRect();
            const imageX = rect.left + rect.width / 2;
            const imageY = rect.top + rect.height / 2;

            // Вычисляем расстояние от курсора до центра изображения
            const distanceX = e.clientX - imageX;
            const distanceY = e.clientY - imageY;

            // Вычисляем направление "убегания" (противоположное от курсора)
            const moveX = -Math.sign(distanceX) * Math.min(Math.abs(distanceX) * 0.1, maxMove);
            const moveY = -Math.sign(distanceY) * Math.min(Math.abs(distanceY) * 0.1, maxMove);

            // Применяем трансформацию
            isMoving = true;
            image.style.transform = `translate(${moveX}px, ${moveY}px)`;

            // Добавляем небольшой наклон в противоположную сторону
            const tiltX = -moveY * 0.05;
            const tiltY = moveX * 0.05;
            image.style.transform += ` rotate3d(${tiltX}, ${tiltY}, 0, 5deg)`;

            // Возвращаем изображение в исходное положение через небольшую задержку
            setTimeout(() => {
                image.style.transform = 'translate(0, 0) rotate3d(0, 0, 0, 0deg)';
                setTimeout(() => {
                    isMoving = false;
                }, 200);
            }, 150);
        });

        // Добавляем случайное "подрагивание" при клике
        image.addEventListener('click', () => {
            const randomX = (Math.random() - 0.5) * 10;
            const randomY = (Math.random() - 0.5) * 10;
            image.style.transform = `translate(${randomX}px, ${randomY}px)`;
        });
    }
}); 