'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const DEFAULT_PORT = 8787;
const PUBLIC_FILES = new Set([
  'index.html', 'style.css', 'app.js', 'browser-ai.js', 'browser-pip.js', 'ai-worker.js',
  'activity-core.js', 'alert-core.js', 'pose-core.js', 'records.js', 'favicon.svg'
]);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

function failure(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

function json(res, status, value) {
  if (res.destroyed) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function isLoopback(host) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(host);
}

function createApp({ root = __dirname } = {}) {
  const resolvedRoot = fs.realpathSync(root);
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Vary', 'Origin');
    try {
      let host;
      try { host = new URL(`http://${req.headers.host || ''}`); }
      catch { throw failure(403, 'invalid_host', 'Địa chỉ truy cập không hợp lệ.'); }
      if (!isLoopback(host.hostname) || host.username || host.password || host.pathname !== '/' || Number(host.port || 80) !== req.socket.localPort) {
        throw failure(403, 'invalid_host', 'Ứng dụng chỉ phục vụ trên localhost.');
      }
      const origin = req.headers.origin;
      const samePortOrigins = new Set([
        `http://127.0.0.1:${req.socket.localPort}`,
        `http://localhost:${req.socket.localPort}`,
        `http://[::1]:${req.socket.localPort}`
      ]);
      if (origin) {
        if (!samePortOrigins.has(origin)) {
          throw failure(403, 'origin_denied', 'Hãy mở ứng dụng trên localhost.');
        }
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      const url = new URL(req.url, host.origin);
      const route = url.pathname;
      const api = route.startsWith('/api/');
      if (api) throw failure(404, 'not_found', 'Không tìm thấy chức năng này.');
      if (!['GET', 'HEAD'].includes(req.method)) throw failure(405, 'method_not_allowed', 'Phương thức không được hỗ trợ.');
      let relative;
      try { relative = decodeURIComponent(route).replace(/^\/+/, '') || 'index.html'; }
      catch { throw failure(400, 'invalid_path', 'Đường dẫn không hợp lệ.'); }
      const parts = relative.split('/');
      if (parts.some(part => !part || part.startsWith('.')) || relative.includes('\\') || relative.includes('\0') ||
          (!PUBLIC_FILES.has(relative) && !['vendor', 'models'].includes(parts[0]))) {
        throw failure(404, 'not_found', 'Không tìm thấy tệp.');
      }
      let file;
      try { file = await fsp.realpath(path.join(resolvedRoot, relative)); }
      catch { throw failure(404, 'not_found', 'Không tìm thấy tệp.'); }
      if (!file.startsWith(resolvedRoot + path.sep)) throw failure(404, 'not_found', 'Không tìm thấy tệp.');
      const stat = await fsp.stat(file);
      if (!stat.isFile()) throw failure(404, 'not_found', 'Không tìm thấy tệp.');
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        'Content-Length': stat.size, 'Cache-Control': 'no-cache'
      });
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = fs.createReadStream(file);
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
      json(res, status, { error: {
        code: error.code || 'internal_error',
        message: status === 500 ? 'Có lỗi khi xử lý yêu cầu. Hãy thử lại.' : error.message
      } });
    }
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 200000;
  return server;
}

if (require.main === module) {
  try {
    const envFile = path.join(__dirname, '.env');
    if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
    const port = Number(process.env.PORT || DEFAULT_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT phải là số từ 1 đến 65535.');
    const server = createApp();
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đang được dùng. Đổi PORT trong .env rồi chạy lại.` : error.message);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`Đèn Bàn: http://127.0.0.1:${port}/`);
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
      server.close(() => { process.exitCode = 0; });
      server.closeAllConnections();
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createApp, DEFAULT_PORT };
