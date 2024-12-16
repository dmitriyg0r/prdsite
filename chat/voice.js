class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
        this.audioContext = null;
        this.analyser = null;
        
        this.setupUI();
        this.setupEventListeners();

        // Привязываем методы к контексту класса
        this.toggleRecording = this.toggleRecording.bind(this);
        this.cancelRecording = this.cancelRecording.bind(this);
        this.sendVoiceMessage = this.sendVoiceMessage.bind(this);
    }

    setupUI() {
        // Добавляем кнопку записи голоса в контролы ввода
        const inputControls = document.querySelector('.input-controls');
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
        const cancelButton = this.recordingContainer.querySelector('.voice-cancel-button');
        const sendButton = this.recordingContainer.querySelector('.voice-send-button');

        // Используем привязанные методы
        voiceButton.addEventListener('click', this.toggleRecording);
        cancelButton.addEventListener('click', this.cancelRecording);
        sendButton.addEventListener('click', this.sendVoiceMessage);
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
            const response = await fetch('https://adminflow.ru:5003/api/messages/voice', {
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
        
        const duration = message.duration || '00:00';
        
        messageElement.innerHTML = `
            <div class="voice-message">
                <button class="voice-message-play" data-file-path="${message.file_path}">
                    <i class="fas fa-play"></i>
                </button>
                <div class="voice-message-waveform">
                    <div class="voice-message-progress"></div>
                </div>
                <span class="voice-message-time">${duration}</span>
            </div>
        `;
    
        // Добавляем обработчик воспроизведения
        const playButton = messageElement.querySelector('.voice-message-play');
        playButton.addEventListener('click', async () => {
            try {
                const response = await fetch(`https://adminflow.ru:5003/api/messages/voice/${message.id}`);
                if (!response.ok) throw new Error('Ошибка загрузки аудио');
                
                const blob = await response.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                
                audio.onplay = () => {
                    playButton.innerHTML = '<i class="fas fa-pause"></i>';
                };
                
                audio.onpause = () => {
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                };
                
                audio.onended = () => {
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                };
                
                if (audio.paused) {
                    audio.play();
                } else {
                    audio.pause();
                }
            } catch (error) {
                console.error('Ошибка воспроизведения:', error);
                alert('Не удалось воспроизвести сообщение');
            }
        });
    
        const messagesContainer = document.getElementById('messages');
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.voiceRecorder = new VoiceRecorder();
});
