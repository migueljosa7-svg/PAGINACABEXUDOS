#!/usr/bin/env node
/**
 * Verificacion del servicio estatico de `server.js` (frontend + relay unificados).
 *
 * Cubre el contrato que provoca el error de produccion:
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "text/html"
 *   Uncaught TypeError: Failed to fetch dynamically imported module:
 *   https://.../assets/Recorridos-<hash>.js
 *
 * La causa era que `STATIC_CACHE.get(urlPath) || STATIC_CACHE.get('/index.html')`
 * respondia `200 text/html` + `nosniff` a CUALQUIER ruta no cacheada, incluido un
 * chunk inexistente. El navegador rechazaba ese HTML como module script, el
 * `import()` dinamico de `React.lazy` fallaba y la ruta se quedaba en blanco.
 *
 * Contrato verificado aqui:
 *   1. Un archivo que NO existe responde 404 y `no-store`; JAMAS `text/html`.
 *      (regresion directa del error reportado)
 *   2. Un asset existente responde con un MIME de JavaScript, no con HTML.
 *   3. Una RUTA de la SPA responde 200 `text/html`, pero con `no-cache`: el
 *      HTML lleva los hashes de los chunks, cachearlo dejaba al navegador
 *      pidiendo chunks de despliegues ya retirado -> pantalla en blanco.
 *   4. Una ruta de la API que no es un endpoint real responde 404 EN JSON:
 *      el fallback de la SPA NUNCA debe atrapar `/api/*`, porque el cliente
 *      hace `res.json()` sobre la respuesta y un `200 text/html` lo revienta
 *      con `SyntaxError: Unexpected token '<'` (regresion del bug del panel).
 *   5. Los tipos MIME de PWA/SEO (manifest, robots) no son `octet-stream`.
 *   6. Guardas de cliente y de build que evitan que el fallo reaparezca:
 *      `lazyWithRecovery` en todas las rutas, `cleanupOutdatedCaches` y la
 *      deteccion de HTML en el cliente del panel municipal.
 *
 * Requiere `dist/` construido (`npm run build`).
 *
 * Uso: node scripts/verify-static-serving.mjs
 */

import { spawn } from 'child_process';
import http from 'node:http';
import { createServer } from 'net';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

/** Peticion simple con la respuesta completa (status + cabeceras + cuerpo). */
function get(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          contentType: String(res.headers['content-type'] || ''),
          cacheControl: String(res.headers['cache-control'] || ''),
          body: Buffer.concat(chunks).toString('utf8'),
        })
      );
    });
    req.on('error', () =>
      resolve({ status: 0, contentType: '', cacheControl: '', body: '' })
    );
  });
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('Falta dist/index.html. Ejecuta `npm run build` antes de verificar.');
  process.exit(1);
}

/** Primer chunk de una page real del build actual, para probar un 200 de asset. */
const assetJs = readdirSync(join(DIST, 'assets')).find(
  (f) => f.startsWith('Recorridos-') && f.endsWith('.js')
);

const PORT = await freePort();

const server = spawn(process.execPath, ['server.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    HOST: '127.0.0.1',
    LOG_LEVEL: 'error',
    AUTHORIZED_GPS_DEVICES: '{}',
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let serverErr = '';
server.stderr.on('data', (d) => { serverErr += d.toString(); });

for (let i = 0; i < 40; i += 1) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break; } catch { await sleep(250); }
}

try {
  // --- 1) REGRESION DEL ERROR REPORTADO -------------------------------------
  // Un chunk con el hash de un despliegue ANTERIOR: es exactamente la peticion
  // que hacia fallar al navegador con el error de MIME type.
  const stale = await get('/assets/Recorridos-CXKgi0I_.js');
  check('Un chunk inexistente responde 404 (no 200)',
    stale.status === 404, `status=${stale.status}`);
  check('Un chunk inexistente NO se sirve como text/html',
    !stale.contentType.includes('text/html'), stale.contentType);
  check('Un chunk inexistente NO devuelve el HTML de la SPA',
    !stale.body.includes('<!doctype html>'), `${stale.body.length} bytes`);
  check('El 404 de un chunk no se cachea (no-store)',
    stale.cacheControl.includes('no-store'), stale.cacheControl);

  // Cualquier archivo con extension inexistente, fuera de /assets/.
  const missingFile = await get('/no-existe-este-archivo.js');
  check('Un archivo .js inexistente fuera de /assets/ responde 404',
    missingFile.status === 404 && !missingFile.contentType.includes('text/html'),
    `${missingFile.status} ${missingFile.contentType}`);

  // Un asset sin extension bajo un prefijo de archivo tambien es 404, no HTML.
  const missingNoExt = await get('/assets/chunk-sin-extension');
  check('Un asset sin extension inexistente responde 404',
    missingNoExt.status === 404, `status=${missingNoExt.status}`);

  // --- 2) Assets reales -------------------------------------------------------
  if (assetJs) {
    const asset = await get(`/assets/${assetJs}`);
    check('Un chunk existente responde 200 con MIME de JavaScript',
      asset.status === 200 && /javascript/.test(asset.contentType),
      `${asset.status} ${asset.contentType}`);
    check('Un chunk existente no se sirve como text/html',
      !asset.contentType.includes('text/html'), asset.contentType);
    check('Los chunks con hash son immutable (cache 1 ano)',
      asset.cacheControl.includes('immutable'), asset.cacheControl);
  } else {
    check('Se encuentra un chunk Recorridos-*.js en dist/assets', false, 'build incompleto');
  }

  // --- 3) Rutas de la SPA -----------------------------------------------------
  for (const route of ['/', '/recorridos', '/gps-live', '/personaje/rosendo']) {
    const page = await get(route);
    check(`La ruta SPA ${route} responde 200 text/html`,
      page.status === 200 && page.contentType.includes('text/html'),
      `${page.status} ${page.contentType}`);
    // El HTML lleva los hashes de los chunks: cachearlo es lo que los rompe.
    check(`La ruta SPA ${route} se sirve con no-cache (hashes siempre frescos)`,
      page.cacheControl.includes('no-cache'), page.cacheControl);
  }

  // --- 4) La API NUNCA devuelve el HTML de la SPA ----------------------------
  // Regresión del bug reportado: el panel pedía /api/municipal/resumen y el
  // servidor contestaba `200 text/html` con el index.html entero, así que el
  // `res.json()` del cliente moría con `SyntaxError: Unexpected token '<'`.
  // Cualquier ruta de la API que no sea un endpoint real debe ser 404 EN JSON.
  for (const ruta of ['/api/inexistente', '/api', '/api/panel/resumen']) {
    const r = await get(ruta);
    check(`${ruta} responde 404 JSON y NO el index.html`,
      r.status === 404 && r.contentType.includes('application/json') && !r.body.includes('<!doctype html>'),
      `${r.status} ${r.contentType}`);
  }

  // Una ruta DENTRO del espacio de nombres municipal la resuelve el bloque de
  // autenticación (`startsWith('/api/municipal')`): sin credencial es 503, con
  // una incorrecta 401. Lo que no puede ser es HTML, tampoco con una barra
  // final, que es justo lo que antes caía en el fallback de la SPA.
  const municipalRaiz = await get('/api/municipal/');
  check('/api/municipal/ responde JSON (nunca el index.html)',
    municipalRaiz.contentType.includes('application/json') && !municipalRaiz.body.includes('<!doctype html>'),
    `${municipalRaiz.status} ${municipalRaiz.contentType}`);

  // Sin MUNICIPAL_PANEL_TOKEN el endpoint municipal es 503 (fail-secure), pero
  // sigue siendo JSON: nunca HTML.
  const municipal = await get('/api/municipal/resumen');
  check('Un endpoint municipal responde JSON aunque no haya credencial',
    municipal.contentType.includes('application/json') && !municipal.body.includes('<!doctype html>'),
    `${municipal.status} ${municipal.contentType}`);

  // Los JSON de `public/api/` son ARCHIVOS legítimos de dist/: el guard de la
  // API no puede romperlos. Este es el motivo de comprobar la estática primero.
  const estatico = await get('/api/comparsas.json');
  check('Un JSON estático de public/api/ se sigue sirviendo con 200',
    estatico.status === 200 && !estatico.contentType.includes('text/html'),
    `${estatico.status} ${estatico.contentType}`);

  // --- 5) Tipos MIME de PWA y SEO --------------------------------------------
  const manifest = await get('/manifest.webmanifest');
  check('El manifest se sirve como application/manifest+json',
    manifest.status === 200 && manifest.contentType.includes('manifest+json'),
    `${manifest.status} ${manifest.contentType}`);

  const robots = await get('/robots.txt');
  check('robots.txt se sirve como text/plain (no octet-stream)',
    robots.status === 200 && robots.contentType.includes('text/plain'),
    `${robots.status} ${robots.contentType}`);

  // --- 6) Guardas de cliente y de build --------------------------------------
  const serverSrc = readFileSync(join(ROOT, 'server.js'), 'utf8');
  check('server.js NO vuelve a caer en index.html para rutas no cacheadas',
    !/STATIC_CACHE\.get\(urlPath\)\s*\|\|/.test(serverSrc),
    'fallback de index.html reintroducido');
  check('server.js distingue archivo (404) de ruta SPA',
    /looksLikeFileRequest/.test(serverSrc));

  // El ORDEN es la corrección: el guard de la API tiene que ejecutarse ANTES
  // del fallback de la SPA. `lastIndexOf` en el fallback a propósito: la
  // definición de `serveSpaFallback` aparece antes que su única llamada.
  const posGuard = serverSrc.indexOf('isApiRequest(urlPath)');
  const posFallback = serverSrc.lastIndexOf('serveSpaFallback(req, res)');
  check('server.js resuelve /api/ ANTES del fallback SPA (orden de middlewares)',
    posGuard > -1 && posFallback > -1 && posGuard < posFallback,
    `guard=${posGuard} fallback=${posFallback}`);

  const appSrc = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
  const lazyCalls = (appSrc.match(/= lazy\(/g) || []).length;
  const recoveryCalls = (appSrc.match(/= lazyWithRecovery\(/g) || []).length;
  check('App.tsx usa lazyWithRecovery en todas las rutas con lazy',
    lazyCalls === 0 && recoveryCalls > 0,
    `lazy=${lazyCalls} lazyWithRecovery=${recoveryCalls}`);

  const recoverySrc = readFileSync(join(ROOT, 'src', 'services', 'chunkRecovery.ts'), 'utf8');
  check('chunkRecovery limita la recarga a una vez por pestana (anti-bucle)',
    /RECOVERY_FLAG_KEY/.test(recoverySrc) && /sessionStorage/.test(recoverySrc));
  check('chunkRecovery conserva la cache de teselas del mapa',
    /PRESERVED_CACHES/.test(recoverySrc) && /osm-tiles/.test(recoverySrc));

  const viteSrc = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
  check('vite.config purga las precaches de despliegues anteriores',
    /cleanupOutdatedCaches:\s*true/.test(viteSrc));

  const panelSrc = readFileSync(join(ROOT, 'src', 'services', 'municipalPanel.ts'), 'utf8');
  check('El cliente del panel detecta el HTML ANTES de llamar a res.json()',
    /text\/html/.test(panelSrc) && /content-type/i.test(panelSrc),
    'sin guardia: un HTML volvería a ser SyntaxError: Unexpected token <');
} catch (err) {
  check('Ejecucion de la verificacion sin excepciones', false, err?.message || String(err));
} finally {
  server.kill('SIGTERM');
  await sleep(300);
  server.kill('SIGKILL');
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
if (failed.length) {
  console.log('FALLOS:');
  for (const f of failed) console.log(` - ${f.name}`);
}
if (serverErr.trim()) {
  console.log(`\n[stderr del servidor]\n${serverErr.trim().split('\n').slice(-6).join('\n')}`);
}
process.exit(failed.length ? 1 : 0);
