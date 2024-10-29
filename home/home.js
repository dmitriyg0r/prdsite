function displayFiles() {
    categoriesContainer.innerHTML = '';
    for (const [category, folders] of Object.entries(fileStorage)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'file-category';
        const categoryTitle = document.createElement('h3');
        categoryTitle.textContent = `${categoryIcons[category] || ''} ${category}`;
        categoryDiv.appendChild(categoryTitle);
        const folderList = document.createElement('ul');
        
        for (const [folder, files] of Object.entries(folders)) {
            const listItem = document.createElement('li');
            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            
            // Добавляем стрелку и название папки
            const arrow = document.createElement('span');
            arrow.className = 'folder-arrow';
            arrow.textContent = '▶';
            
            const folderName = document.createElement('span');
            folderName.className = 'folder-name';
            folderName.textContent = folder;
            
            folderHeader.appendChild(arrow);
            folderHeader.appendChild(folderName);
            listItem.appendChild(folderHeader);

            // Создаем контейнер для файлов
            const filesList = document.createElement('ul');
            filesList.className = 'files-list collapsed';

            Object.values(files).forEach(file => {
                const fileItem = document.createElement('li');
                const fileItemContent = document.createElement('div');
                fileItemContent.className = 'file-item';

                const fileName = document.createElement('span');
                fileName.textContent = file;
                fileItemContent.appendChild(fileName);

                const downloadButton = document.createElement('a');
                downloadButton.href = `uploads/${encodeURIComponent(category)}/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
                downloadButton.textContent = 'Скачать';
                downloadButton.className = 'download-button';
                fileItemContent.appendChild(downloadButton);

                fileItem.appendChild(fileItemContent);
                filesList.appendChild(fileItem);
            });

            listItem.appendChild(filesList);
            folderList.appendChild(listItem);

            // Добавляем обработчик клика для разворачивания/сворачивания
            folderHeader.addEventListener('click', function() {
                filesList.classList.toggle('collapsed');
                arrow.classList.toggle('rotated');
            });
        }
        
        categoryDiv.appendChild(folderList);
        categoriesContainer.appendChild(categoryDiv);
    }
}