const express = require('express');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 3002 });

app.use(bodyParser.json());
app.use(cors());

// Хранилище активных соединений
const activeConnections = new Map();

// WebSocket обработчик подключений
wss.on('connection', (ws) => {
    const sessionId = Date.now().toString();
    let sshClient = null;

    console.log(`Новое WebSocket подключение: ${sessionId}`);

    // Сохраняем соединение
    activeConnections.set(sessionId, { ws, sshClient });

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'command') {
                executeCommand(data.command, sessionId);
            }
        } catch (err) {
            console.error('Ошибка обработки сообщения:', err);
        }
    });

    ws.on('close', () => {
        console.log(`Закрытие соединения: ${sessionId}`);
        const connection = activeConnections.get(sessionId);
        if (connection && connection.sshClient) {
            connection.sshClient.end();
        }
        activeConnections.delete(sessionId);
    });

    // Отправляем sessionId клиенту
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
        conn.exec(command, (err, stream) => {
            if (err) {
                connection.ws.send(JSON.stringify({
                    type: 'error',
                    data: `Ошибка выполнения команды: ${err.message}`
                }));
                return;
            }

            // Обновляем SSH клиент в соединении
            connection.sshClient = conn;

            stream.on('close', (code, signal) => {
                connection.ws.send(JSON.stringify({
                    type: 'close',
                    data: `\nКоманда завершена (код: ${code})`
                }));
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
        password: 'sGLTccA_Na#9zC'
    });
}

app.listen(3001, () => {
    console.log('Терминал сервер запущен на порту 3001');
});