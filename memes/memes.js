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

    // Обработка выбора файла
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.querySelector('.file-input-label');
    const fileName = document.getElementById('file-name');

    if (fileInput && fileLabel && fileName) {
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                fileName.textContent = `Выбран файл: ${this.files[0].name}`;
                fileLabel.style.borderColor = 'var(--button-hover)';
            } else {
                fileName.textContent = '';
                fileLabel.style.borderColor = 'var(--button-background)';
            }
        });

        // Drag & Drop функционал
        fileLabel.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        fileLabel.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        fileLabel.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInput.files = e.dataTransfer.files;
                fileName.textContent = `Выбран файл: ${e.dataTransfer.files[0].name}`;
                fileLabel.style.borderColor = 'var(--button-hover)';
            }
        });
    }
}); 