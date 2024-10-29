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
}); 