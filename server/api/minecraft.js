const net = require('net');

async function checkMinecraftServer(ip, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        
        socket.setTimeout(5000); // 5 секунд таймаут
        
        socket.on('connect', () => {
            socket.destroy();
            resolve({ online: true, players: { online: '?', max: '?' }});
        });
        
        socket.on('error', () => {
            resolve({ online: false });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ online: false });
        });
        
        socket.connect(port, ip);
    });
}

// Express route handler
app.get('/api/minecraft/status', async (req, res) => {
    try {
        const { ip, port } = req.query;
        const status = await checkMinecraftServer(ip, port);
        res.json(status);
    } catch (error) {
        console.error('Error checking Minecraft server status:', error);
        res.status(500).json({ online: false, error: 'Internal server error' });
    }
}); 