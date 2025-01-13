class VoiceRecorder {
    constructor() {
        // Инициализация свойств
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
        this.audioContext = null;
        this.analyser = null;
        this.recordingContainer = null;

        // Привязка методов к контексту
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.toggleRecording = this.toggleRecording.bind(this);
        this.cancelRecording = this.cancelRecording.bind(this);
        this.sendVoiceMessage = this.sendVoiceMessage.bind(this);
        this.updateUI = this.updateUI.bind(this);
        this.resetUI = this.resetUI.bind(this);
        this.startTimer = this.startTimer.bind(this);
        this.stopTimer = this.stopTimer.bind(this);
        this.visualize = this.visualize.bind(this);
        this.formatTime = this.formatTime.bind(this);

        // Инициализация UI и обработчиков
        this.init();
    }

    // Вспомогательная функция для форматирования времени
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    init() {
        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        // Добавляем кнопку записи голоса
        const inputControls = document.querySelector('.input-controls');
        if (!inputControls) return;

        const voiceButton = document.createElement('button');
        voiceButton.className = 'voice-button';
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceButton.id = 'voiceButton';
        inputControls.insertBefore(voiceButton, inputControls.firstChild);

        // Создаем контейнер для записи
        this.recordingContainer = document.createElement('div');
        this.recordingContainer.className = 'voice-recording-container';
        this.recordingContainer.style.display = 'none';
        this.recordingContainer.innerHTML = `
            <span class="voice-timer">00:00</span>
            <div class="voice-waveform">
                <canvas class="voice-waveform-canvas"></canvas>
            </div>
            <div class="voice-actions">
                <button class="voice-cancel-button">
                    <i class="fas fa-times"></i>
                </button>
                <button class="voice-send-button">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        inputControls.parentNode.insertBefore(this.recordingContainer, inputControls);
    }

    setupEventListeners() {
        const voiceButton = document.getElementById('voiceButton');
        if (!voiceButton || !this.recordingContainer) return;

        const cancelButton = this.recordingContainer.querySelector('.voice-cancel-button');
        const sendButton = this.recordingContainer.querySelector('.voice-send-button');

        // Используем стрелочные функции для сохранения контекста
        voiceButton.addEventListener('click', () => this.toggleRecording());
        cancelButton.addEventListener('click', () => this.cancelRecording());
        sendButton.addEventListener('click', () => this.sendVoiceMessage());
    }

    toggleRecording() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupAudioContext(stream);
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.startTime = Date.now();
            this.updateUI(true);
            this.startTimer();
            this.visualize();
        } catch (error) {
            console.error('Ошибка при записи голоса:', error);
            alert('Не удалось получить доступ к микрофону');
        }
    }

    setupAudioContext(stream) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        this.analyser.fftSize = 256;
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateUI(false);
            this.stopTimer();
            
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    cancelRecording() {
        this.stopRecording();
        this.audioChunks = [];
        this.resetUI();
    }

    async sendVoiceMessage() {
        try {
            // Сначала останавливаем запись
            this.stopRecording();
            
            // Ждем, пока все чанки будут доступны
            await new Promise(resolve => setTimeout(resolve, 200));
    
            if (this.audioChunks.length === 0) {
                console.error('Нет аудио данных для отправки');
                return;
            }
    
            // Создаем blob из записанных чанков
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            
            // Создаем FormData для отправки файла
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');
            formData.append('senderId', currentUser.id);
            formData.append('receiverId', currentChatPartner.id);
    
            // Добавляем индикатор загрузки
            const messageContainer = document.getElementById('messages');
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'message message-sent';
            loadingMessage.innerHTML = `
                <div class="voice-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Отправка голосового сообщения...</span>
                </div>
            `;
            messageContainer.appendChild(loadingMessage);
            scrollToBottom();
    
            // Отправляем запрос
            const response = await fetch('https://space-point.ru/api/messages/voice', {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) {
                throw new Error('Ошибка при отправке голосового сообщения');
            }
    
            const data = await response.json();
            
            // Удаляем сообщение о загрузке
            messageContainer.removeChild(loadingMessage);
    
            if (data.success) {
                // Добавляем сообщение в чат
                this.addVoiceMessageToChat(data.message);
                
                // Очищаем данные записи
                this.audioChunks = [];
                this.resetUI();
            } else {
                throw new Error(data.error || 'Ошибка при отправке');
            }
    
        } catch (error) {
            console.error('Ошибка при отправке голосового сообщения:', error);
            alert('Не удалось отправить голосовое сообщение: ' + error.message);
        } finally {
            // Всегда сбрасываем UI в исходное состояние
            this.resetUI();
        }
    }
    
    // Обновляем метод addVoiceMessageToChat
    addVoiceMessageToChat(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
        messageElement.dataset.messageId = message.id;
        
        // Создаем контейнер для голосового сообщения
        const voiceContainer = document.createElement('div');
        voiceContainer.className = 'voice-message';
        
        // Добавляем информацию об отправителе для полученных сообщений
        if (message.sender_id !== currentUser.id) {
            const senderInfo = document.createElement('div');
            senderInfo.className = 'message-sender';
            senderInfo.textContent = message.sender_name || 'Пользователь';
            messageElement.appendChild(senderInfo);
        }

        // Создаем кнопку воспроизведения
        const playButton = document.createElement('button');
        playButton.className = 'voice-message-play';
        playButton.innerHTML = '<i class="fas fa-play"></i>';

        // Создаем визуализацию волны
        const waveform = document.createElement('div');
        waveform.className = 'voice-message-waveform';
        
        // Добавляем прогресс-бар
        const progress = document.createElement('div');
        progress.className = 'voice-message-progress';
        waveform.appendChild(progress);

        // Добавляем время
        const timeSpan = document.createElement('span');
        timeSpan.className = 'voice-message-time';
        timeSpan.textContent = '00:00';

        // Собираем все элементы
        voiceContainer.appendChild(playButton);
        voiceContainer.appendChild(waveform);
        voiceContainer.appendChild(timeSpan);
        messageElement.appendChild(voiceContainer);

        // Добавляем время отправки
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.appendChild(timestamp);

        // Добавляем обработчик воспроизведения
        let audio = null;
        playButton.addEventListener('click', async () => {
            try {
                if (audio && !audio.paused) {
                    audio.pause();
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    return;
                }

                playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                const response = await fetch(`https://space-point.ru/api/messages/voice/${message.id}`);
                if (!response.ok) throw new Error('Ошибка загрузки аудио');
                
                const blob = await response.blob();
                audio = new Audio(URL.createObjectURL(blob));
                
                // Обработчики событий аудио
                audio.onplay = () => {
                    playButton.innerHTML = '<i class="fas fa-pause"></i>';
                };
                
                audio.onpause = () => {
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                };
                
                audio.onended = () => {
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    progress.style.width = '0%';
                };

                // Обновление прогресса воспроизведения
                audio.ontimeupdate = () => {
                    const percent = (audio.currentTime / audio.duration) * 100;
                    progress.style.width = `${percent}%`;
                    timeSpan.textContent = this.formatTime(audio.currentTime);
                };

                // Обработка загрузки метаданных
                audio.onloadedmetadata = () => {
                    timeSpan.textContent = this.formatTime(audio.duration);
                };

                await audio.play();

            } catch (error) {
                console.error('Ошибка воспроизведения:', error);
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                alert('Не удалось воспроизвести сообщение');
            }
        });

        // Добавляем сообщение в контейнер
        const messagesContainer = document.getElementById('messages');
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }

    updateUI(isRecording) {
        const voiceButton = document.getElementById('voiceButton');
        const inputControls = document.querySelector('.input-controls');
        
        if (isRecording) {
            voiceButton?.classList.add('recording');
            inputControls.style.display = 'none';
            this.recordingContainer.style.display = 'flex';
        } else {
            voiceButton?.classList.remove('recording');
        }
    }

    resetUI() {
        const inputControls = document.querySelector('.input-controls');
        if (inputControls && this.recordingContainer) {
            inputControls.style.display = 'flex';
            this.recordingContainer.style.display = 'none';
            document.getElementById('voiceButton')?.classList.remove('recording');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - this.startTime;
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const timerElement = document.querySelector('.voice-timer');
            if (timerElement) {
                timerElement.textContent = formattedTime;
            }
        }, 100);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    visualize() {
        const canvas = document.querySelector('.voice-waveform-canvas');
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const analyser = this.audioContext.createAnalyser();
        const source = this.audioContext.createMediaStreamSource(this.mediaRecorder.stream);
        source.connect(analyser);
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const barWidth = canvas.width / dataArray.length;
        let x = 0;

        const draw = () => {
            requestAnimationFrame(draw);
            context.clearRect(0, 0, canvas.width, canvas.height);
            analyser.getByteFrequencyData(dataArray);
            context.fillStyle = 'rgba(0, 0, 0, 0.1)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = 'rgba(0, 0, 255, 0.5)';
            dataArray.forEach(value => {
                const y = (value / 255) * canvas.height;
                context.fillRect(x, canvas.height - y, barWidth, y);
                x += barWidth;
            });
            x = 0;
        };

        draw();
    }
}

// Создаем экземпляр класса только после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.voiceRecorder = new VoiceRecorder();
});
