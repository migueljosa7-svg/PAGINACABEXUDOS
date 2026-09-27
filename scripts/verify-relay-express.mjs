/**
 * Comprobación del SERVIDOR EXPRESS (gps-relay-server/server.js), que es el que
 * está DESPLEGADO en Render. Reproduce el fallo de producción: este servidor no
 * tenía /api/municipal/* y la ruta caía en app.get('*') devolviendo el index.html
 * con un 200.
 *
 * Uso: node scripts/verify-relay-express.mjs
 */
import { spawn } from 'child_process';
import { createServer } from 'net';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocket } from 'ws';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RELAY_DIR = join(ROOT, 'gps-relay-server');
const PANEL_TOKEN = 'express-token-panel-123456';
const GPS_TOKEN = 'express_comparsa_panel';
const ORIGEN = [41.6563, -0.8789];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

async function arrancar(valor, puerto) {
  const env = {
    ...process.env,
    PORT: String(puerto),
    HOST: '127.0.0.1',
    LOG_LEVEL: 'error',
    AUTHORIZED_GPS_DEVICES: JSON.stringify({ [GPS_TOKEN]: { name: 'Express E2E' } }),
  };
  delete env.MUNICIPAL_PANEL_TOKEN;
  if (valor !== null) env.MUNICIPAL_PANEL_TOKEN = valor;
  const hijo = spawn('node', ['server.js'], { cwd: RELAY_DIR, env, stdio: 'ignore' });
  const base = `http://127.0.0.1:${puerto}`;
  const limite = Date.now() + 15000;
  while (Date.now() < limite) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return { base, hijo };
    } catch { /* aún arrancando */ }
    await esperar(250);
  }
  hijo.kill();
  throw new Error(`el servidor Express no arrancó en ${puerto}`);
}

const auth = { 'x-panel-token': PANEL_TOKEN };
const pedir = async (url, headers) => {
  const r = await fetch(url, headers ? { headers } : undefined);
  const texto = await r.text();
  let body = null;
  try { body = JSON.parse(texto); } catch { body = texto; }
  return { status: r.status, ct: r.headers.get('content-type') || '', body, texto };
};

// ── 1) Sin credencial: 503, y NUNCA HTML ────────────────────────────────────
const puertoA = await freePort();
const a = await arrancar(null, puertoA);
try {
  console.log('── SIN CREDENCIAL (fail-secure) ──────────────────────────');
  const sinToken = await pedir(`${a.base}/api/municipal/resumen`);
  check('Sin MUNICIPAL_PANEL_TOKEN responde 503', sinToken.status === 503, `status=${sinToken.status}`);
  check('El 503 es JSON (NO el index.html)',
    sinToken.ct.includes('application/json') && !sinToken.texto.includes('<!doctype html>'), sinToken.ct);
  check('El cuerpo identifica la causa', sinToken.body?.error === 'panel_no_configurado', JSON.stringify(sinToken.body));
} finally {
  a.hijo.kill();
}

// ── 2) Con credencial: el panel funciona de verdad ──────────────────────────
const puertoB = await freePort();
const b = await arrancar(PANEL_TOKEN, puertoB);
try {
  console.log('\n── CON CREDENCIAL ───────────────────────────────────────');
  const sinCabecera = await pedir(`${b.base}/api/municipal/resumen`);
  check('Sin cabecera de token responde 401', sinCabecera.status === 401, `status=${sinCabecera.status}`);
  check('El 401 es JSON (NO el index.html)',
    sinCabecera.ct.includes('application/json') && !sinCabecera.texto.includes('<!doctype html>'), sinCabecera.ct);

  const tokenMalo = await pedir(`${b.base}/api/municipal/resumen`, { 'x-panel-token': 'incorrecto' });
  check('Con token incorrecto responde 401', tokenMalo.status === 401, `status=${tokenMalo.status}`);

  const post = await fetch(`${b.base}/api/municipal/resumen`, { method: 'POST' });
  check('POST responde 405 (solo lectura)', post.status === 405, `status=${post.status}`);

  // El fallo exacto reportado: una ruta de API que no existe.
  const inexistente = await pedir(`${b.base}/api/inexistente`);
  check('Una API inexistente responde 404 JSON, no el index.html',
    inexistente.status === 404 && inexistente.ct.includes('application/json') && !inexistente.texto.includes('<!doctype html>'),
    `${inexistente.status} ${inexistente.ct}`);

  // ── 3) Cadena COMPLETA: WS -> auditoría GPS -> analítica -> API ──────────
  console.log('\n── EMISOR GPS → ANALÍTICA → API ─────────────────────────');
  const ws = new WebSocket(`ws://127.0.0.1:${puertoB}?role=sender&token=${GPS_TOKEN}`);
  const autorizado = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), 8000);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (['gps_authorized', 'room_info', 'gps'].includes(msg.type)) { clearTimeout(t); resolve(msg.type); }
    });
    ws.on('error', () => { clearTimeout(t); resolve(false); });
  });
  check('El emisor GPS se autoriza', Boolean(autorizado), String(autorizado));

  const enviar = (lat, lng, speed) =>
    ws.send(JSON.stringify({ type: 'gps', lat, lng, speed, accuracy: 8, timestamp: Date.now() }));

  const PASO = 0.00004;
  for (let i = 0; i < 12; i++) {
    enviar(ORIGEN[0] + i * PASO, ORIGEN[1] + i * (PASO / 2), 1.1);
    await esperar(1010);
  }
  await esperar(1200);

  const salas = await pedir(`${b.base}/api/municipal/salas`, auth);
  check('El panel lista la sala con datos', salas.body?.salas?.length === 1, JSON.stringify(salas.body));
  const hash = salas.body?.salas?.[0]?.hash;
  check('La sala se expone solo por huella', typeof hash === 'string' && /^[0-9a-f]{8}$/.test(hash), String(hash));
  check('La lista NO filtra el token del emisor', !JSON.stringify(salas.body).includes(GPS_TOKEN));

  const resumen = await pedir(`${b.base}/api/municipal/resumen?sala=${hash}`, auth);
  const d = resumen.body;
  check('El resumen llega con datos reales del emisor', d?.vacio === false, `vacio=${d?.vacio}`);
  check('Se registran las 12 muestras GPS', d?.muestras === 12, `muestras=${d?.muestras}`);
  check('Calcula la distancia recorrida', d?.recorrido?.distanciaM > 30, `${d?.recorrido?.distanciaM} m`);
  check('El resumen NO filtra el token', !JSON.stringify(d).includes(GPS_TOKEN));

  const noCache = await fetch(`${b.base}/api/municipal/resumen`, { headers: auth });
  check('El resumen no se cachea', noCache.headers.get('cache-control') === 'no-store', noCache.headers.get('cache-control'));

  ws.close();
} finally {
  b.hijo.kill();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
if (failed.length) {
  console.log('FALLOS:');
  for (const f of failed) console.log(` - ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
