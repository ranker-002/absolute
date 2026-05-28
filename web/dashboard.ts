import http from 'node:http';
import { logger } from '../core/logger.js';

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ULTIMATE Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh}
.header{background:linear-gradient(135deg,#1a1b26,#282a36);padding:20px 30px;border-bottom:1px solid #414868;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:1.5rem;background:linear-gradient(90deg,#bb9af7,#7dcfff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.header .status{padding:6px 16px;border-radius:20px;font-size:0.8rem;font-weight:600}
.status-ok{background:#1a3a1a;color:#56d364;border:1px solid #238636}
.status-error{background:#3a1a1a;color:#f85149;border:1px solid #da3633}
.container{max-width:1200px;margin:0 auto;padding:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:20px}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;transition:border-color 0.2s}
.card:hover{border-color:#58a6ff}
.card h3{color:#58a6ff;margin-bottom:12px;font-size:1rem}
.card .value{font-size:2rem;font-weight:700;color:#c9d1d9}
.card .label{color:#8b949e;font-size:0.8rem;margin-top:4px}
.chat{margin-top:20px}
.chat-box{background:#0d1117;border:1px solid #30363d;border-radius:12px;height:400px;overflow-y:auto;padding:16px}
.msg{margin-bottom:12px;padding:10px 14px;border-radius:8px;max-width:80%;clear:both}
.msg-user{background:#1a3a5a;float:right;color:#79c0ff}
.msg-ult{background:#1a2a1a;color:#a3be8c;float:left}
.msg-sys{background:#1a1a2a;color:#bb9af7;float:none;text-align:center;max-width:100%}
.input-row{display:flex;gap:10px;margin-top:12px}
.input-row input{flex:1;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px 16px;color:#c9d1d9;font-size:1rem;outline:none}
.input-row input:focus{border-color:#58a6ff}
.input-row button{background:#238636;border:none;border-radius:8px;padding:12px 24px;color:#fff;font-weight:600;cursor:pointer}
.input-row button:hover{background:#2ea043}
.input-row button:disabled{background:#21262d;color:#484f58;cursor:not-allowed}
.log{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;margin-top:12px;max-height:200px;overflow-y:auto;font-family:monospace;font-size:0.8rem;color:#8b949e}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="header">
  <h1>ULTIMATE — Living Intelligence</h1>
  <div class="status status-ok" id="status">Connecting...</div>
</div>
<div class="container">
  <div class="grid" id="stats"></div>
  <div class="chat">
    <h3 style="color:#58a6ff;margin-bottom:12px">Conversation</h3>
    <div class="chat-box" id="chatbox"></div>
    <div class="input-row">
      <input id="input" placeholder="Type a message..." autofocus>
      <button id="sendBtn" onclick="send()">Send</button>
    </div>
  </div>
  <div class="card" style="margin-top:20px">
    <h3>System Log</h3>
    <div class="log" id="log"></div>
  </div>
</div>
<script>
let polling = null;
let isLoading = false;

function fetchStats() {
  fetch('/api/data').then(r => r.json()).then(d => {
    document.getElementById('status').textContent = 'Connected';
    document.getElementById('status').className = 'status status-ok';
    renderStats(d);
  }).catch(() => {
    document.getElementById('status').textContent = 'Disconnected';
    document.getElementById('status').className = 'status status-error';
  });
}

function renderStats(s) {
  document.getElementById('stats').innerHTML =
    '<div class="card"><h3>Mutations</h3><div class="value">' + (s.mutations||0) + '</div><div class="label">Total transformations</div></div>' +
    '<div class="card"><h3>Interactions</h3><div class="value">' + (s.interactions||0) + '</div><div class="label">Total conversations</div></div>' +
    '<div class="card"><h3>Skills</h3><div class="value">' + (s.skills||0) + '</div><div class="label">Active skills</div></div>' +
    '<div class="card"><h3>Memory</h3><div class="value">' + (s.memory||0) + '</div><div class="label">Stored entries</div></div>' +
    '<div class="card"><h3>Snapshots</h3><div class="value">' + (s.snapshots||0) + '</div><div class="label">Available backups</div></div>' +
    '<div class="card"><h3>Form</h3><div class="value" style="font-size:1.2rem">' + (s.form||'terminal-cli') + '</div><div class="label">Current transformation</div></div>';
}

function addMsg(role, text) {
  var box = document.getElementById('chatbox');
  var div = document.createElement('div');
  div.className = 'msg msg-' + (role === 'user' ? 'user' : role === 'system' ? 'sys' : 'ult');
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function addLog(text) {
  var el = document.getElementById('log');
  el.textContent += new Date().toLocaleTimeString() + ' ' + text + '\\n';
  el.scrollTop = el.scrollHeight;
}

function send() {
  var input = document.getElementById('input');
  var btn = document.getElementById('sendBtn');
  var msg = input.value.trim();
  if (!msg || isLoading) return;
  addMsg('user', msg);
  input.value = '';
  isLoading = true;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg })
  }).then(r => r.json()).then(d => {
    if (d.response) addMsg('assistant', d.response);
    if (d.error) addMsg('system', 'Error: ' + d.error);
    addLog('Chat: ' + msg.substring(0, 50));
  }).catch(e => {
    addMsg('system', 'Request failed: ' + e.message);
  }).finally(() => {
    isLoading = false;
    btn.disabled = false;
    btn.textContent = 'Send';
  });
}

document.getElementById('input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') send();
});

fetchStats();
polling = setInterval(fetchStats, 5000);
</script>
</body>
</html>`;

export class WebDashboard {
  private server: http.Server | null = null;
  private port: number;

  constructor(port = 3001) {
    this.port = port;
  }

  start(getData: () => Promise<Record<string, unknown>>, onChat?: (message: string) => Promise<string>): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        if (req.url === '/' || req.url === '/index.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(DASHBOARD_HTML);
        } else if (req.url === '/api/data' && req.method === 'GET') {
          const data = await getData();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } else if (req.url === '/api/chat' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk);
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            if (!body.message || typeof body.message !== 'string') {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'message required' }));
              return;
            }
            if (onChat) {
              const response = await onChat(body.message);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ response }));
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Chat not connected' }));
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      });

      this.server.listen(this.port, () => {
        logger.info('Dashboard', 'Web dashboard at http://localhost:' + this.port);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) this.server.close(() => resolve());
      else resolve();
    });
  }
}
