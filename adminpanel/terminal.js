const express = require('express');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 3002 });

app.use(bodyParser.json());
app.use(cors());

const activeConnections = new Map();

wss.on('connection', (ws) => {
    const sessionId = Date.now().toString();
    let sshClient = null;
    let currentStream = null;
    let shellSession = null;

    console.log(`Новое WebSocket подключение: ${sessionId}`);

    activeConnections.set(sessionId, { ws, sshClient, currentStream, shellSession });

    const conn = new Client();
    
    conn.on('ready', () => {
        console.log('SSH соединение установлено');
        conn.shell({ term: 'xterm-color' }, (err, stream) => {
            if (err) {
                console.error('Ошибка создания shell:', err);
                return;
            }

            const connection = activeConnections.get(sessionId);
            connection.sshClient = conn;
            connection.currentStream = stream;
            connection.shellSession = stream;

            stream.on('data', (data) => {
                ws.send(JSON.stringify({
                    type: 'output',
                    data: data.toString()
                }));
            });

            stream.stderr.on('data', (data) => {
                ws.send(JSON.stringify({
                    type: 'error',
                    data: data.toString()
                }));
            });

            stream.on('close', () => {
                ws.send(JSON.stringify({
                    type: 'close',
                    data: '\nСессия завершена'
                }));
            });
        });
    }).connect({
        host: 'localhost',
        port: 22,
        username: 'root',
        password: 'sGLTccA_Na#9zC'
    });

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const connection = activeConnections.get(sessionId);
            
            switch(data.type) {
                case 'command':
                    if (connection.shellSession) {
                        connection.shellSession.write(`${data.command}\n`);
                    }
                    break;
                case 'signal':
                    if (connection.currentStream) {
                        if (data.signal === 'SIGINT') {
                            connection.currentStream.write('\x03');
                        } else if (data.signal === 'SIGTSTP') {
                            connection.currentStream.write('\x1A');
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
            if (connection.shellSession) {
                connection.shellSession.end('exit\n');
            }
            if (connection.sshClient) {
                connection.sshClient.end();
            }
        }
        activeConnections.delete(sessionId);
    });

    ws.send(JSON.stringify({ type: 'session', sessionId }));
});

app.listen(3001, () => {
    console.log('Терминал сервер запущен на порту 3001');
});