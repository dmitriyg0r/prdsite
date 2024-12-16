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

        voiceButton.addEventListener('click', () => this.toggleRecording());
        cancelButton.addEventListener('click', () => this.cancelRecording());
        sendButton.addEventListener('click', () => this.sendVoiceMessage());
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
        if (this.audioChunks.length === 0) return;

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('senderId', currentUser.id);
        formData.append('receiverId', currentChatPartner.id);

        try {
            const response = await fetch('https://adminflow.ru:5003/api/messages/voice', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Ошибка при отправке голосового сообщения');
            }

            const data = await response.json();
            this.addVoiceMessageToChat(data.message);
            this.resetUI();
        } catch (error) {
            console.error('Ошибка при отправке голосового сообщения:', error);
            alert('Не удалось отправить голосовое сообщение');
        }
    }

    updateUI(isRecording) {
        const voiceButton = document.getElementById('voiceButton');
        const inputControls = document.querySelector('.input-controls');
        
        if (isRecording) {
            voiceButton.classList.add('recording');
            inputControls.style.display = 'none';
            this.recordingContainer.style.display = 'flex';
        } else {
            voiceButton.classList.remove('recording');
        }
    }

    resetUI() {
        const inputControls = document.querySelector('.input-controls');
        inputControls.style.display = 'flex';
        this.recordingContainer.style.display = 'none';
        document.getElementById('voiceButton').classList.remove('recording');
    }

    startTimer() {
        const timerElement = this.recordingContainer.querySelector('.voice-timer');
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    visualize() {
        const canvas = this.recordingContainer.querySelector('.voice-waveform-canvas');
        const canvasCtx = canvas.getContext('2d');
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.isRecording) return;

            requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = 'rgb(200, 200, 200)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                canvasCtx.fillStyle = `rgb(${barHeight + 100},50,50)`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw();
    }

    toggleRecording() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    addVoiceMessageToChat(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${message.senderId === currentUser.id ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <div class="voice-message">
                <button class="voice-message-play">
                    <i class="fas fa-play"></i>
                </button>
                <div class="voice-message-waveform"></div>
                <span class="voice-message-time">${message.duration}</span>
            </div>
        `;

        const messagesContainer = document.getElementById('messages');
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.voiceRecorder = new VoiceRecorder();
});
