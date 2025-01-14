const express = require('express');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 3002 }); // WebSocket сервер

app.use(bodyParser.json());
app.use(cors());

// Хранилище активных соединений
const activeConnections = new Map();

// WebSocket обработчик подключений
wss.on('connection', (ws) => {
    const sessionId = Date.now().toString();
    activeConnections.set(sessionId, ws);

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'command') {
            executeCommand(data.command, sessionId);
        }
    });

    ws.on('close', () => {
        const connection = activeConnections.get(sessionId);
        if (connection) {
            connection.client && connection.client.end();
            activeConnections.delete(sessionId);
        }
    });

    // Отправляем sessionId клиенту
    ws.send(JSON.stringify({ type: 'session', sessionId }));
});

function executeCommand(command, sessionId) {
    const ws = activeConnections.get(sessionId);
    if (!ws) return;

    const conn = new Client();
    
    conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
            if (err) {
                ws.send(JSON.stringify({
                    type: 'error',
                    data: 'Ошибка выполнения команды'
                }));
                return;
            }

            // Сохраняем соединение
            activeConnections.set(sessionId, { ws, client: conn });

            stream.on('close', (code, signal) => {
                ws.send(JSON.stringify({
                    type: 'close',
                    data: `\nКоманда завершена (код: ${code})`
                }));
            }).on('data', (data) => {
                ws.send(JSON.stringify({
                    type: 'output',
                    data: data.toString()
                }));
            }).stderr.on('data', (data) => {
                ws.send(JSON.stringify({
                    type: 'error',
                    data: data.toString()
                }));
            });
        });
    }).connect({
        host: '45.91.238.3',
        port: 22,
        username: 'root',
        password: 'sGLTccA_Na#9zC'
    });
}

app.listen(3001, () => {
    console.log('Терминал сервер запущен на порту 3001');
});