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
.card .bar{height:6px;background:#21262d;border-radius:3px;margin-top:12px;overflow:hidden}
.card .bar-fill{height:100%;border-radius:3px;transition:width 0.5s}
.chat{margin-top:20px}
.chat-box{background:#0d1117;border:1px solid #30363d;border-radius:12px;height:400px;overflow-y:auto;padding:16px}
.msg{margin-bottom:12px;padding:10px 14px;border-radius:8px;max-width:80%}
.msg-user{background:#1a3a5a;float:right;color:#79c0ff}
.msg-ult{background:#1a2a1a;color:#a3be8c;float:left}
.msg-sys{background:#1a1a2a;color:#bb9af7;float:none;text-align:center;max-width:100%}
.input-row{display:flex;gap:10px;margin-top:12px}
.input-row input{flex:1;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px 16px;color:#c9d1d9;font-size:1rem;outline:none}
.input-row input:focus{border-color:#58a6ff}
.input-row button{background:#238636;border:none;border-radius:8px;padding:12px 24px;color:#fff;font-weight:600;cursor:pointer}
.input-row button:hover{background:#2ea043}
.themes{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.theme-btn{padding:6px 14px;border-radius:16px;border:1px solid #30363d;background:#161b22;color:#c9d1d9;cursor:pointer;font-size:0.8rem}
.theme-btn.active{border-color:#58a6ff;background:#1a2a3a}
.log{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;margin-top:12px;max-height:200px;overflow-y:auto;font-family:monospace;font-size:0.8rem;color:#8b949e}
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
      <button onclick="send()">Send</button>
    </div>
  </div>
  <div class="card" style="margin-top:20px">
    <h3>System Log</h3>
    <div class="log" id="log"></div>
  </div>
</div>
<script>
let ws;
function connect(){
  ws=new WebSocket('ws://'+location.host+'/ws');
  ws.onopen=()=>{document.getElementById('status').textContent='Connected';document.getElementById('status').className='status status-ok'};
  ws.onclose=()=>{document.getElementById('status').textContent='Disconnected';document.getElementById('status').className='status status-error';setTimeout(connect,3000)};
  ws.onmessage=(e)=>{const d=JSON.parse(e.data);handleMessage(d)};
}
function handleMessage(d){
  if(d.type==='stats')renderStats(d.data);
  if(d.type==='chat')addMsg(d.role,d.text);
  if(d.type==='log')addLog(d.text);
}
function renderStats(s){
  const el=document.getElementById('stats');
  el.innerHTML=\\\`
    <div class="card"><h3>Mutations</h3><div class="value">\\\${s.mutations||0}</div><div class="label">Total transformations</div></div>
    <div class="card"><h3>Interactions</h3><div class="value">\\\${s.interactions||0}</div><div class="label">Total conversations</div></div>
    <div class="card"><h3>Skills</h3><div class="value">\\\${s.skills||0}</div><div class="label">Active skills</div></div>
    <div class="card"><h3>Memory</h3><div class="value">\\\${s.memory||0}</div><div class="label">Stored entries</div></div>
    <div class="card"><h3>Snapshots</h3><div class="value">\\\${s.snapshots||0}</div><div class="label">Available backups</div></div>
    <div class="card"><h3>Form</h3><div class="value" style="font-size:1.2rem">\\\${s.form||'terminal-cli'}</div><div class="label">Current transformation</div></div>
  \\\`;
}
function addMsg(role,text){
  const box=document.getElementById('chatbox');
  const div=document.createElement('div');
  div.className='msg msg-'+(role==='user'?'user':role==='system'?'sys':'ult');
  div.textContent=text;
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}
function addLog(text){
  const el=document.getElementById('log');
  el.textContent+=new Date().toLocaleTimeString()+' '+text+'\\n';
  el.scrollTop=el.scrollHeight;
}
function send(){
  const input=document.getElementById('input');
  const msg=input.value.trim();
  if(!msg)return;
  addMsg('user',msg);
  if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'chat',message:msg}));
  input.value='';
}
document.getElementById('input').addEventListener('keydown',e=>{if(e.key==='Enter')send()});
connect();
</script>
</body>
</html>`;

export class WebDashboard {
  private server: http.Server | null = null;
  private wsClients: Set<import('node:http').IncomingMessage> = new Set();
  private port: number;

  constructor(port = 3001) {
    this.port = port;
  }

  start(getData: () => Promise<Record<string, unknown>>): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        if (req.url === '/' || req.url === '/index.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(DASHBOARD_HTML);
        } else if (req.url === '/api/data') {
          const data = await getData();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      this.server.listen(this.port, () => {
        logger.info('Dashboard', 'Web dashboard at http://localhost:' + this.port);
        resolve();
      });
    });
  }

  broadcast(data: Record<string, unknown>): void {
    const msg = JSON.stringify(data);
    for (const client of this.wsClients) {
      try {
        client.socket?.write('HTTP/1.1 101 Switching Protocols\r\n\r\n');
      } catch { /* */ }
    }
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) this.server.close(() => resolve());
      else resolve();
    });
  }
}
