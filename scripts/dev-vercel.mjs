// Servidor local que imita Vercel: sirve dist/ (con fallback SPA) y ejecuta las
// funciones de api/*. Uso:  npm run build && npm run dev:vercel
// Variables: PORT (3000), y las mismas que en Vercel (AUTHORIZED_GPS_DEVICES, ...).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain',
};

async function runApi(pathname, url, req, res) {
  const file = join(ROOT, `${pathname}.js`);
  if (!normalize(file).startsWith(join(ROOT, 'api')) || pathname.includes('/_lib') || !existsSync(file)) return false;
  req.query = Object.fromEntries(url.searchParams);
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  await mod.default(req, res);
  return true;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      if (await runApi(url.pathname.replace(/\/$/, ''), url, req, res)) return;
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end('{"error":"not_found"}');
    }
    let file = join(DIST, normalize(url.pathname));
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(readFileSync(file));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('error');
  }
}).listen(PORT, () => console.log(`Vercel-like server en http://localhost:${PORT}`));
