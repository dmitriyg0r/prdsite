const express = require('express');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const cors = require('cors'); // Добавляем CORS

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Разрешаем все CORS-запросы

app.post('/execute-command', (req, res) => {
    const { command } = req.body;

    const conn = new Client();
    conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
            if (err) {
                return res.status(500).send('Ошибка выполнения команды');
            }
            let output = '';
            stream.on('close', (code, signal) => {
                conn.end();
                res.send(output);
            }).on('data', (data) => {
                output += data;
            }).stderr.on('data', (data) => {
                output += data;
            });
        });
    }).connect({
        host: '45.91.238.3',
        port: 22,
        username: 'root',
        password: 'sGLTccA_Na#9zC'
    });
});

app.listen(3001, () => {
    console.log('Консоль запущена на порту 3001');
});