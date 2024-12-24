const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./utils/db');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const PORT = 5003;

// Middleware
app.use(cors());
app.use(express.json());

// SSL Configuration
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/chain.pem')
};

// Test database connection
testConnection().then(connected => {
    if (!connected) {
        console.error('Unable to connect to the database');
        process.exit(1);
    }
});

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/profile'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/feed'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/upload'));
app.use('/api', require('./routes/messages'));

// HTTPS Server
const httpsServer = https.createServer(sslOptions, app);
httpsServer.listen(PORT, 'localhost', () => {
    console.log(`HTTPS Server running on localhost:${PORT}`);
});

// Socket.IO
const io = new Server(httpsServer, {
    cors: {
        origin: ['https://adminflow.ru', 'http://adminflow.ru'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('New Socket.IO connection:', socket.id);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});