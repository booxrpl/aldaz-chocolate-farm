const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DATA_FILE = path.join(__dirname, 'datos_finca.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Enable CORS for local flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API to load saved farm data from disk
  if (req.method === 'GET' && req.url === '/api/datos') {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'No se pudo leer el archivo de datos.' }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ empty: true }));
    }
    return;
  }

  // API to save farm data to disk automatically
  if (req.method === 'POST' && req.url === '/api/datos') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        // Validate JSON before writing
        JSON.parse(body);
        fs.writeFileSync(DATA_FILE, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Formato de datos inválido.' }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const fullPath = path.join(__dirname, filePath);

  // Prevent directory traversal
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Acceso denegado');
    return;
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log('  ALDAZ CHOCOLATE FARM - SISTEMA DE CONTROL');
  console.log(`  Abierto en: http://localhost:${PORT}`);
  console.log('  Todos los datos se guardan en: datos_finca.json');
  console.log('====================================================');
});
