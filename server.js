// Save this as server.js
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
// Add player module for audio
const player = require('play-sound')(opts = {});

// Configuration
const config = {
    port: process.env.PORT || 8080,
    // Disable sound by default in production environments like Railway
    enableSound: process.env.ENABLE_SOUND === 'true' && process.env.NODE_ENV !== 'production',
    environment: process.env.NODE_ENV || 'development'
};

// Create Express app
const app = express();
app.use(cors());  // Important for cross-machine requests
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();
let lastCardId = null;

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientId = Date.now();
    clients.set(ws, clientId);

    // Get client IP address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`New client connected: ${clientId} from ${ip}`);

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log(`Received: ${message}`);

            if (data.type === 'rfid_scan') {
                // Store the card ID and forward to all React clients
                lastCardId = data.cardId;

                // Play a buzz sound when RFID is scanned (if enabled)
                playBuzzSound();

                // Broadcast to all React clients
                clients.forEach((id, client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        scanData = {
                            type: 'rfid_scan',
                            cardId: data.cardId,
                            deviceId: data.deviceId,
                            timestamp: new Date().toISOString(),
                        }
                        // check if it's deviceId esp32-003, if so add a readerId to the broadcast
                        if (data.deviceId === 'esp32-003' && data.readerId) {
                            scanData.readerId = data.readerId;
                        }

                        client.send(JSON.stringify(scanData));
                    }
                });
            } else if (data.type === 'device_connect') {
                console.log(`Device connected: ${data.deviceId} (${data.deviceType})`);

                // If it's a React client connecting, send the last card ID if available
                if (data.deviceType === 'react_client' && lastCardId) {
                    ws.send(JSON.stringify({
                        type: 'last_rfid_scan',
                        cardId: lastCardId,
                        timestamp: new Date().toISOString(),
                        deviceId: data.deviceId
                    }));
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // Handle disconnection
    ws.on('close', () => {
        console.log(`Client disconnected: ${clients.get(ws)}`);
        clients.delete(ws);
    });
});

// Function to play a buzz sound
function playBuzzSound() {
    // Skip if sound is disabled
    if (!config.enableSound) {
        console.log('Sound is disabled. Skipping buzz sound.');
        return;
    }

    const soundPath = path.join(__dirname, 'sounds', 'buzz.mp3');

    // Check if the sound file exists
    if (fs.existsSync(soundPath)) {
        console.log('Playing buzz sound...');
        player.play(soundPath, (err) => {
            if (err) console.error('Error playing sound:', err);
        });
    } else {
        console.warn(`Sound file not found: ${soundPath}`);
    }
}

// Simple test endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        clients: clients.size,
        lastCardId: lastCardId,
        environment: config.environment,
        soundEnabled: config.enableSound
    });
});

// Simple test endpoint
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Endpoint to test the sound
app.get('/test-sound', (req, res) => {
    playBuzzSound();
    res.send('Playing buzz sound...');
});

// Root endpoint to show server is running
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Breaking News WebSocket Server</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1 {
                        color: #333;
                    }
                    .status {
                        background-color: #f0f0f0;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .endpoints {
                        margin-top: 20px;
                    }
                    .endpoint {
                        margin-bottom: 10px;
                    }
                </style>
            </head>
            <body>
                <h1>Breaking News WebSocket Server</h1>
                <div class="status">
                    <p><strong>Status:</strong> Running</p>
                    <p><strong>Environment:</strong> ${config.environment}</p>
                    <p><strong>Connected Clients:</strong> ${clients.size}</p>
                    <p><strong>Sound Enabled:</strong> ${config.enableSound ? 'Yes' : 'No'}</p>
                    <p><strong>Last Card ID:</strong> ${lastCardId || 'None'}</p>
                </div>
                <div class="endpoints">
                    <h2>Available Endpoints:</h2>
                    <div class="endpoint">
                        <p><strong>GET /ping</strong> - Simple health check</p>
                    </div>
                    <div class="endpoint">
                        <p><strong>GET /api/status</strong> - Get server status information</p>
                    </div>
                    <div class="endpoint">
                        <p><strong>GET /test-sound</strong> - Test the sound notification</p>
                    </div>
                    <div class="endpoint">
                        <p><strong>WebSocket</strong> - Connect to the WebSocket server</p>
                    </div>
                </div>
            </body>
        </html>
    `);
});

// Get your local IP address to share with other devices
const os = require('os');
const networkInterfaces = os.networkInterfaces();
const getLocalIP = () => {
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            // Skip internal and non-IPv4 addresses
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

// Start the server
server.listen(config.port, () => {
    const localIP = getLocalIP();
    console.log(`Server is running on port ${config.port}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Local Address: http://localhost:${config.port}`);

    if (config.environment === 'development') {
        console.log(`Network Address: http://${localIP}:${config.port}`);
        console.log(`WebSocket URL: ws://${localIP}:${config.port}`);
    } else {
        console.log(`WebSocket URL: Use the Railway provided URL with ws:// protocol`);
    }

    console.log(`Sound: ${config.enableSound ? 'Enabled' : 'Disabled'}`);
    console.log(`To enable sound: ENABLE_SOUND=true node server.js`);
});