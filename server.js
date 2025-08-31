const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let clients = {};

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch (e) { return; }

    if (data.type === 'register') {
      ws.role = data.role;
      clients[data.role] = ws;
      console.log(`Registered ${data.role}`);
    }

    if (data.type === 'signal' && data.to) {
      if (clients[data.to]) {
        clients[data.to].send(JSON.stringify({
          type: 'signal',
          from: ws.role,
          data: data.data
        }));
      }
    }
  });

  ws.on('close', () => {
    if (ws.role && clients[ws.role] === ws) {
      delete clients[ws.role];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
