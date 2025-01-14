const express = require('express');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const wss = new WebSocket.Server({ port: 3002 });

app.use(bodyParser.json());
app.use(cors());

// Функция для очистки ANSI-кодов
function stripAnsi(str) {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

const activeConnections = new Map();

// Функция для получения системной информации
async function getSystemInfo() {
    return new Promise((resolve) => {
        // Используем более точную команду для CPU
        exec('mpstat 1 1 | tail -1 && free -m && df -h', (error, stdout) => {
            if (error) {
                // Если mpstat не установлен, используем запасной вариант
                exec('top -bn1 | grep "Cpu(s)" && free -m && df -h', (error2, stdout2) => {
                    if (error2) {
                        console.error('Ошибка получения системной информации:', error2);
                        resolve({
                            data: 'CPU: N/A\nMem: N/A\nDisk: N/A'
                        });
                        return;
                    }
                    resolve({
                        data: stdout2
                    });
                });
                return;
            }
            resolve({
                data: stdout
            });
        });
    });
}

// Функция для отправки системной информации
async function sendSystemInfo(ws) {
    const systemInfo = await getSystemInfo();
    ws.send(JSON.stringify({
        type: 'system_info',
        data: systemInfo.data
    }));
}

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
        conn.shell({ 
            term: 'xterm-256color',
            env: {
                TERM: 'xterm-256color',
                PS1: '\\w\\$ ' // Упрощенный промпт
            }
        }, (err, stream) => {
            if (err) {
                console.error('Ошибка создания shell:', err);
                return;
            }

            const connection = activeConnections.get(sessionId);
            connection.sshClient = conn;
            connection.currentStream = stream;
            connection.shellSession = stream;

            // Отключаем автоматическую настройку терминала
            stream.write('export TERM=xterm-256color\n');
            stream.write('export PS1="\\w\\$ "\n');
            stream.write('stty -echo\n'); // Отключаем локальное эхо

            stream.on('data', (data) => {
                const cleanData = stripAnsi(data.toString());
                ws.send(JSON.stringify({
                    type: 'output',
                    data: cleanData
                }));
            });

            stream.stderr.on('data', (data) => {
                const cleanData = stripAnsi(data.toString());
                ws.send(JSON.stringify({
                    type: 'error',
                    data: cleanData
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

    // Добавляем интервал обновления системной информации
    const systemInfoInterval = setInterval(() => {
        sendSystemInfo(ws);
    }, 5000); // Обновление каждые 5 секунд

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
        clearInterval(systemInfoInterval);
    });

    ws.send(JSON.stringify({ type: 'session', sessionId }));
});

app.listen(3001, () => {
    console.log('Терминал сервер запущен на порту 3001');
});