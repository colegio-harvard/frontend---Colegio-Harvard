const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.pdf':  'application/pdf',
  '.webm': 'video/webm',
  '.mp4':  'video/mp4',
};

function serve(filePath, res) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime + (ext === '.html' ? '; charset=utf-8' : '') });
    res.end(data);
  } catch {
    return false;
  }
  return true;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  // "/" → landing page
  if (pathname === '/') {
    return serve(path.join(DIST, 'landing.html'), res);
  }

  // "/landing" → landing page
  if (pathname === '/landing') {
    return serve(path.join(DIST, 'landing.html'), res);
  }

  // Try exact file (assets, images, etc.)
  const exact = path.join(DIST, pathname);
  if (fs.existsSync(exact) && fs.statSync(exact).isFile()) {
    return serve(exact, res);
  }

  // SPA fallback: everything else → index.html
  serve(path.join(DIST, 'index.html'), res);
});

server.listen(PORT, () => {
  console.log(`Frontend serving on port ${PORT}`);
});
