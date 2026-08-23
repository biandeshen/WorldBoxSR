#!/usr/bin/env node
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(new URL('..', import.meta.url))));
const port = Number(process.env.PORT || 8080);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relative = pathname === '/' ? 'client/index.html' : pathname.replace(/^\/+/, '');
  const candidate = normalize(join(root, relative));
  if (!candidate.startsWith(root)) return respond(res, 403, 'Forbidden');
  try {
    if (!statSync(candidate).isFile()) return respond(res, 404, 'Not found');
    res.writeHead(200, { 'content-type': types[extname(candidate)] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(candidate).pipe(res);
  } catch {
    respond(res, 404, 'Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`worldboxSR prototype: http://127.0.0.1:${port}`);
});

function respond(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
}
