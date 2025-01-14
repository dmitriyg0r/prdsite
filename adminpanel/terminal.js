const express = require('express');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 3002 });

app.use(bodyParser.json());
app.use(cors());

// Хранилище активных соединений и процессов
const activeConnections = new Map();

wss.on('connection', (ws) => {
    const sessionId = Date.now().toString();
    let sshClient = null;
    let currentStream = null; // Добавляем отслеживание текущего потока

    console.log(`Новое WebSocket подключение: ${sessionId}`);

    activeConnections.set(sessionId, { ws, sshClient, currentStream });

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const connection = activeConnections.get(sessionId);
            
            switch(data.type) {
                case 'command':
                    executeCommand(data.command, sessionId);
                    break;
                case 'signal':
                    // Обработка сигналов (Ctrl+C и др.)
                    if (connection.currentStream) {
                        if (data.signal === 'SIGINT') {
                            connection.currentStream.write('\x03'); // Ctrl+C
                        } else if (data.signal === 'SIGTSTP') {
                            connection.currentStream.write('\x1A'); // Ctrl+Z
                        }
                    }
                    break;
            }
        } catch (err) {
            console.error('Ошибка обработки сообщения:', err);
        }
    });

    ws.on('close', () => {
        console.log(`Закрытие соединения: ${sessionId}`);
        const connection = activeConnections.get(sessionId);
        if (connection) {
            if (connection.currentStream) {
                connection.currentStream.end();
            }
            if (connection.sshClient) {
                connection.sshClient.end();
            }
        }
        activeConnections.delete(sessionId);
    });

    ws.send(JSON.stringify({ type: 'session', sessionId }));
});

function executeCommand(command, sessionId) {
    const connection = activeConnections.get(sessionId);
    if (!connection || !connection.ws) {
        console.error('Соединение не найдено');
        return;
    }

    const conn = new Client();
    
    conn.on('ready', () => {
        console.log(`Выполнение команды: ${command}`);
        
        // Используем shell вместо exec для интерактивных команд
        conn.shell((err, stream) => {
            if (err) {
                connection.ws.send(JSON.stringify({
                    type: 'error',
                    data: `Ошибка выполнения команды: ${err.message}`
                }));
                return;
            }

            // Сохраняем поток и клиент
            connection.sshClient = conn;
            connection.currentStream = stream;

            // Отправляем команду
            stream.write(`${command}\n`);

            stream.on('close', () => {
                connection.ws.send(JSON.stringify({
                    type: 'close',
                    data: '\nСессия завершена'
                }));
                connection.currentStream = null;
                conn.end();
            });

            stream.on('data', (data) => {
                connection.ws.send(JSON.stringify({
                    type: 'output',
                    data: data.toString()
                }));
            });

            stream.stderr.on('data', (data) => {
                connection.ws.send(JSON.stringify({
                    type: 'error',
                    data: data.toString()
                }));
            });
        });
    }).on('error', (err) => {
        console.error('SSH ошибка:', err);
        connection.ws.send(JSON.stringify({
            type: 'error',
            data: `SSH ошибка: ${err.message}`
        }));
    }).connect({
        host: 'localhost',
        port: 22,
        username: 'root',
        password: 'ваш_пароль'
    });
}

app.listen(3001, () => {
    console.log('Терминал сервер запущен на порту 3001');
});