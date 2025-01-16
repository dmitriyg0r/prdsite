const express = require('express');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Создаем HTTP сервер
const server = require('http').createServer(app);

// Настраиваем WebSocket сервер на том же HTTP сервере
const wss = new WebSocket.Server({ 
    server: server,
    path: '/ws'  // Добавляем путь /ws
});

// Функция для очистки ANSI-кодов
function stripAnsi(str) {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

const activeConnections = new Map();

// Функция для получения системной информации
async function getSystemInfo() {
    return new Promise((resolve) => {
        // Используем комбинацию команд для получения информации о системе
        exec(`
            top -bn1 | grep "Cpu(s)" | awk '{print $2}' && 
            free -m | grep Mem | awk '{print $3"/"$2"M"}' && 
            df -h / | tail -1 | awk '{print $5}'
        `, (error, stdout) => {
            if (error) {
                console.error('Ошибка получения системной информации:', error);
                resolve({
                    data: 'CPU: N/A\nMem: N/A\nDisk: N/A'
                });
                return;
            }
            
            const [cpu, mem, disk] = stdout.trim().split('\n');
            
            resolve({
                data: {
                    cpu: `${cpu}%`,
                    ram: mem,
                    disk: disk
                }
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
            rows: 30,
            cols: 100,
            env: {
                TERM: 'xterm-256color',
                LANG: 'en_US.UTF-8'
            }
        }, (err, stream) => {
            if (err) {
                console.error('Ошибка создания shell:', err);
                ws.send(JSON.stringify({
                    type: 'error',
                    data: 'Ошибка создания shell: ' + err.message
                }));
                return;
            }

            const connection = activeConnections.get(sessionId);
            connection.sshClient = conn;
            connection.currentStream = stream;
            connection.shellSession = stream;

            // Отправляем подтверждение успешного подключения
            ws.send(JSON.stringify({
                type: 'connected',
                data: 'Терминал подключен'
            }));

            stream.on('data', (data) => {
                try {
                    const cleanData = stripAnsi(data.toString());
                    ws.send(JSON.stringify({
                        type: 'output',
                        data: cleanData
                    }));
                } catch (err) {
                    console.error('Ошибка отправки данных:', err);
                }
            });

            stream.stderr.on('data', (data) => {
                try {
                    const cleanData = stripAnsi(data.toString());
                    ws.send(JSON.stringify({
                        type: 'error',
                        data: cleanData
                    }));
                } catch (err) {
                    console.error('Ошибка отправки ошибки:', err);
                }
            });

            stream.on('close', () => {
                try {
                    ws.send(JSON.stringify({
                        type: 'close',
                        data: '\nСессия завершена'
                    }));
                } catch (err) {
                    console.error('Ошибка закрытия потока:', err);
                }
            });
        });
    }).on('error', (err) => {
        console.error('Ошибка SSH соединения:', err);
        ws.send(JSON.stringify({
            type: 'error',
            data: 'Ошибка SSH соединения: ' + err.message
        }));
    }).connect({
        host: 'localhost',
        port: 22,
        username: 'root',
        password: 'sGLTccA_Na#9zC',
        readyTimeout: 20000,
        keepaliveInterval: 10000
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

    // Добавляем обработку ошибок WebSocket
    ws.on('error', (error) => {
        console.error('WebSocket ошибка:', error);
    });

    // Добавляем пинг для поддержания соединения
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.ping();
        }
    }, 30000);

    ws.on('close', () => {
        console.log(`Закрытие соединения: ${sessionId}`);
        clearInterval(pingInterval);
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

// Добавляем новые эндпоинты для файлового менеджера
app.get('/api/files', async (req, res) => {
    try {
        const dirPath = req.query.path || '/var/www/html';
        
        // Проверяем, что путь находится внутри /var/www/html
        if (!dirPath.startsWith('/var/www/html')) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        const files = await fs.readdir(dirPath);
        const fileList = await Promise.all(files.map(async (file) => {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            return {
                name: file,
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modified: stats.mtime
            };
        }));

        // Сортируем: сначала папки, потом файлы
        fileList.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'directory' ? -1 : 1;
        });

        res.json({
            success: true,
            files: fileList
        });
    } catch (err) {
        console.error('Ошибка при чтении директории:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при чтении директории'
        });
    }
});

app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Файл не найден'
            });
        }

        const uploadPath = req.body.path || '/var/www/html';
        
        // Проверяем, что путь находится внутри /var/www/html
        if (!uploadPath.startsWith('/var/www/html')) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        const finalPath = path.join(uploadPath, req.file.originalname);
        await fs.rename(req.file.path, finalPath);

        res.json({
            success: true,
            message: 'Файл успешно загружен'
        });
    } catch (err) {
        console.error('Ошибка при загрузке файла:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при загрузке файла'
        });
    }
});

app.post('/api/files/folder', async (req, res) => {
    try {
        const { path: dirPath, folderName } = req.body;
        
        // Проверяем, что путь находится внутри /var/www/html
        if (!dirPath.startsWith('/var/www/html')) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        const newFolderPath = path.join(dirPath, folderName);
        await fs.mkdir(newFolderPath);

        res.json({
            success: true,
            message: 'Папка успешно создана'
        });
    } catch (err) {
        console.error('Ошибка при создании папки:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании папки'
        });
    }
});

app.delete('/api/files', async (req, res) => {
    try {
        const { path: filePath } = req.body;
        
        // Проверяем, что путь находится внутри /var/www/html
        if (!filePath.startsWith('/var/www/html')) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
            await fs.rmdir(filePath, { recursive: true });
        } else {
            await fs.unlink(filePath);
        }

        res.json({
            success: true,
            message: 'Файл/папка успешно удален(а)'
        });
    } catch (err) {
        console.error('Ошибка при удалении:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении файла/папки'
        });
    }
});

app.post('/api/files/rename', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        
        // Проверяем, что путь находится внутри /var/www/html
        if (!oldPath.startsWith('/var/www/html')) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        const dirPath = path.dirname(oldPath);
        const newPath = path.join(dirPath, newName);
        
        // Проверяем, что новый путь также находится внутри /var/www/html
        if (!newPath.startsWith('/var/www/html')) {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        await fs.rename(oldPath, newPath);

        res.json({
            success: true,
            message: 'Файл/папка успешно переименован(а)'
        });
    } catch (err) {
        console.error('Ошибка при переименовании:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при переименовании файла/папки'
        });
    }
});

// Добавим обработку ошибок WebSocket сервера
wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
});

// Логирование при запуске
console.log('WebSocket сервер запущен на порту 3002');

// Запускаем единый сервер на порту 3001
server.listen(3001, () => {
    console.log('Сервер запущен на порту 3001');
});