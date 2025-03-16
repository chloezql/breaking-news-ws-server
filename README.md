# Breaking News WebSocket Server

A WebSocket server for handling RFID card scans and broadcasting them to connected clients.

## Features

- WebSocket server for real-time communication
- RFID card scan handling and broadcasting
- Sound notifications for RFID scans
- Simple API endpoints for status and testing

## Local Development

1. Install dependencies:

   ```
   npm install
   ```

2. Start the server:

   ```
   npm start
   ```

3. The server will be available at:
   - Local: http://localhost:8080
   - WebSocket: ws://localhost:8080

## Deployment on Railway

### Option 1: Deploy via Railway CLI

1. Install the Railway CLI:

   ```
   npm i -g @railway/cli
   ```

2. Login to Railway:

   ```
   railway login
   ```

3. Link to your Railway project:

   ```
   railway link
   ```

4. Deploy the application:
   ```
   railway up
   ```

### Option 2: Deploy via GitHub

1. Push this repository to GitHub
2. Create a new project in Railway
3. Connect to your GitHub repository
4. Railway will automatically deploy the application

### Environment Variables

- `PORT`: The port on which the server will run (default: 8080)
- `ENABLE_SOUND`: Set to 'false' to disable sound notifications (default: true)

## API Endpoints

- `GET /ping`: Simple health check endpoint
- `GET /api/status`: Get server status information
- `GET /test-sound`: Test the sound notification
