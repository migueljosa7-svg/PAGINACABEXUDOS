#!/usr/bin/env node
/**
 * Verificacion del stream SSE del relay (`/api/stream/location`).
 *
 * Cubre el contrato que consumen tanto el visor publico como la pagina de
 * Recorridos en modo GPS Real (`useRelayPosition`): la conexion responde 200
 * con `text/event-stream`, el snapshot inicial trae las posiciones vigentes en
 * `live[]` y las tramas `gps` posteriores se difunden con los campos que la
 * pagina necesita (lat, lng, speed, accuracy, label).
 *
 * Sin esto, un cambio en el formato de la trama dejaria el mapa "conectado pero
 * congelado", que es el sintoma mas dificil de diagnosticar.
 *
 * Uso: node scripts/verify-sse.mjs
 */

import { spawn } from 'child_process';
import http from 'node:http';
import { createServer } from 'net';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocket } from 'ws';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO_TOKEN = 'cmp_prueba_barrio';

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

const PORT = await freePort();

const server = spawn(process.execPath, ['server.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    HOST: '127.0.0.1',
    LOG_LEVEL: 'error',
    CLEANUP_INTERVAL: '60000',
    AUTHORIZED_GPS_DEVICES: JSON.stringify({ [DEMO_TOKEN]: { name: 'Comparsa San Jose (demo)' } }),
    HEALTH_TOKEN: 'verify-sse-token',
    MAX_CONN_PER_IP: '50',
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let serverErr = '';
server.stderr.on('data', (d) => { serverErr += d.toString(); });

for (let i = 0; i < 40; i += 1) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break; } catch { await sleep(250); }
}

const URL_STREAM = `http://127.0.0.1:${PORT}/api/stream/location?token=${encodeURIComponent(DEMO_TOKEN)}`;

/** Peticion SSE cruda: lee `ms` milisegundos y devuelve status + tramas. */
function readSse(path, ms) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port: PORT, path, headers: { Accept: 'text/event-stream' } },
      (res) => {
        const frames = [];
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          buf += chunk;
          let i = buf.indexOf('\n\n');
          while (i !== -1) {
            const raw = buf.slice(0, i);
            buf = buf.slice(i + 2);
            for (const line of raw.split('\n')) {
              if (line.startsWith('data: ')) {
                try { frames.push(JSON.parse(line.slice(6))); } catch { /* keep-alive */ }
              }
            }
            i = buf.indexOf('\n\n');
          }
        });
        // Cierre explicito: el stream SSE no termina nunca por diseno.
        const t = setTimeout(() => { res.destroy(); req.destroy(); }, ms);
        res.on('close', () => clearTimeout(t));
        setTimeout(() => {
          res.destroy(); req.destroy();
          resolve({ status: res.statusCode, contentType: res.headers['content-type'], frames });
        }, ms + 120);
      }
    );
    req.on('error', () => resolve({ status: 0, contentType: null, frames: [] }));
  });
}
try {
  const path = `/api/stream/location?token=${encodeURIComponent(DEMO_TOKEN)}`;

  // 1) El stream abre y entrega el snapshot inicial.
  const first = await readSse(path, 900);
  check('El stream SSE responde 200 con text/event-stream',
    first.status === 200 && String(first.contentType).includes('text/event-stream'),
    `${first.status} ${first.contentType}`);
  // El snapshot de apertura lo etiqueta el relay como `room_info` y trae las
  // posiciones vigentes en `live[]`. Se busca `live` en vez de un `type` fijo.
  const snapshot = first.frames.find((f) => Array.isArray(f.live));
  check('El snapshot de apertura trae las posiciones vigentes en `live[]`',
    Boolean(snapshot) && Array.isArray(snapshot.live),
    first.frames.map((f) => f.type).join(',') || 'sin tramas');

  // 2) Con un emisor conectado, su posicion se difunde por el mismo stream.
  const streaming = readSse(path, 3000);
  await sleep(300);

  const tx = new WebSocket(`ws://127.0.0.1:${PORT}/?role=sender&token=${encodeURIComponent(DEMO_TOKEN)}`);
  const authed = await new Promise((resolve) => {
    tx.on('message', (raw) => {
      try { if (JSON.parse(raw.toString()).type === 'gps_authorized') resolve(true); } catch { /* ignore */ }
    });
    tx.on('error', () => resolve(false));
    setTimeout(() => resolve(false), 3000);
  });
  check('El emisor de demo se autoriza contra el relay', authed);

  // Precision de interiores (95 m): valida tambien el umbral de first fix.
  tx.send(JSON.stringify({
    type: 'gps', lat: 41.6563, lng: -0.8789,
    accuracy: 95, speed: 1.4, heading: 0, timestamp: Date.now(),
  }));

  const second = await streaming;
  const gps = second.frames.find((f) => f.type === 'gps');
  check('La trama gps se difunde al visor', Boolean(gps),
    second.frames.map((f) => f.type).join(',') || 'sin tramas');
  check('La trama trae lat/lng numericos',
    Boolean(gps) && Number.isFinite(gps.lat) && Number.isFinite(gps.lng),
    gps ? `${gps.lat},${gps.lng}` : '');
  check('La trama trae label y precision (los que usa la UI de Recorridos)',
    Boolean(gps) && typeof gps.label === 'string' && Number.isFinite(gps.accuracy),
    gps ? `label=${gps.label} acc=${gps.accuracy}` : '');

  // 3) Token con formato INVALIDO: el relay no debe abrir stream (401).
  //    Ojo: un token con formato VALIDO pero no registrado SI abre stream, porque
  //    el visor es publico por diseno y la sala simplemente nace vacia. Es
  //    comportamiento previo y deliberado del endpoint, no de este cambio.
  const malformed = await readSse('/api/stream/location?token=@@', 600);
  check('Un token con formato invalido NO abre stream (401)', 
    malformed.status === 401, `status=${malformed.status}`);
  tx.close();
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
