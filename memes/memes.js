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

    // Добавляем эффект наклона для изображения
    const image = document.querySelector('.development-image img');
    const container = document.querySelector('.development-image');

    if (image && container) {
        let rect = container.getBoundingClientRect();
        const maxRotate = 15; // Максимальный угол поворота

        container.addEventListener('mousemove', (e) => {
            rect = container.getBoundingClientRect();
            
            // Вычисляем положение курсора относительно центра изображения
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Вычисляем расстояние от курсора до центра в процентах
            const percentX = (e.clientX - centerX) / (rect.width / 2);
            const percentY = (e.clientY - centerY) / (rect.height / 2);
            
            // Применяем поворот с ограничением максимального угла
            const rotateX = -percentY * maxRotate;
            const rotateY = percentX * maxRotate;
            
            image.style.transform = `
                perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                scale3d(1.05, 1.05, 1.05)
            `;
        });

        // Возвращаем изображение в исходное положение при уходе курсора
        container.addEventListener('mouseleave', () => {
            image.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });

        // Сбрасываем положение при касании на мобильных устройствах
        container.addEventListener('touchstart', () => {
            image.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    }
}); 