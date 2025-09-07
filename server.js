// Simple static server + WebSocket signaling (same host/port) – Replit friendly
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

// --- tiny static server ---
const server = http.createServer((req, res) => {
  let { pathname } = url.parse(req.url);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(PUBLIC, pathname));
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// --- WebSocket signaling on same server/port ---
const wss = new WebSocket.Server({ server });

const clients = { host: null, left: null, right: null };

wss.on("connection", (ws, req) => {
  const params = new URLSearchParams(url.parse(req.url).query || "");
  const role = params.get("role");
  if (!["host", "left", "right"].includes(role)) {
    ws.close();
    return;
  }

  console.log(`[WS] ${role} connected`);
  clients[role] = ws;

  ws.on("message", (msg) => {
    let data;
    try { data = JSON.parse(msg.toString()); } catch { return; }
    data.from = role; // tag sender

    const sendTo = (targetRole) => {
      const peer = clients[targetRole];
      if (peer && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify(data));
      }
    };

    if (role === "host") {
      // Host -> camera (must include data.to = 'left' | 'right')
      if (data.to === "left") sendTo("left");
      if (data.to === "right") sendTo("right");
    } else {
      // Camera -> host
      sendTo("host");
    }
  });

  ws.on("close", () => {
    console.log(`[WS] ${role} disconnected`);
    if (clients[role] === ws) clients[role] = null;
  });
});

server.listen(PORT, () => {
  console.log(`HTTP/WS server listening on port ${PORT}`);
});
