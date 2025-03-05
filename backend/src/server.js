const { app } = require('./index');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  // ...existing code...
});
