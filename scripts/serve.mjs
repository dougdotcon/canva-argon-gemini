import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const host = '127.0.0.1';
const port = 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function isPublic(relative) {
  const parts = relative.split(/[\\/]/);
  if (parts.some(part => !part || part.startsWith('.'))) return false;
  return relative === 'index.html' || relative === 'styles.css' ||
    ['src', 'vendor', 'assets'].includes(parts[0]);
}

function reply(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(message);
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    reply(response, 405, 'Método não permitido.');
    return;
  }

  let relative;
  try {
    // Decode before resolving so encoded separators and traversal are checked too.
    const pathname = decodeURIComponent((request.url || '/').split(/[?#]/, 1)[0]);
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0')) {
      reply(response, 400, 'Caminho inválido.');
      return;
    }
    relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!isPublic(relative)) {
      reply(response, 404, 'Arquivo não encontrado.');
      return;
    }
  } catch {
    reply(response, 400, 'Caminho inválido.');
    return;
  }

  try {
    const filename = await realpath(path.resolve(root, relative));
    const resolvedRelative = path.relative(root, filename);
    if (path.isAbsolute(resolvedRelative) || !isPublic(resolvedRelative)) {
      reply(response, 404, 'Arquivo não encontrado.');
      return;
    }
    const metadata = await stat(filename);
    const contentType = types[path.extname(filename).toLowerCase()];
    if (!metadata.isFile() || !contentType) {
      reply(response, 404, 'Arquivo não encontrado.');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': metadata.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    const stream = createReadStream(filename);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch (error) {
    reply(response, error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500,
      error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 'Arquivo não encontrado.' : 'Erro ao ler arquivo.');
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `A porta ${port} está em uso. Encerre o outro servidor e tente novamente.`
    : `Não foi possível iniciar o servidor: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Tamesis Nexus: http://${host}:${port}`);
  console.log('Servidor local. Para encerrar, pressione Ctrl+C.');
});
