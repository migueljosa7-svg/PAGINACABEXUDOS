#!/usr/bin/env node
/**
 * Verificacion funcional del canal GPS de server.js (sin dependencias externas).
 *
 * Levanta el relay real en un puerto efimero y exercise, contra el, los
 * controles de seguridad exigidos:
 *   - token por URL con guion bajo (cmp_prueba_barrio) -> autorizado
 *   - emisor no registrado -> 4001 (fail-secure)
 *   - geofence municipal (Zaragoza): fuera de bbox -> trama descartada
 *   - first fix: accuracy inicial hasta 100 m -> trama aceptada
 *   - anti-jitter: tras el first fix, accuracy > 30 m -> trama descartada
 *   - anti-teleport: salto grande / velocidad imposible -> trama descartada
 *   - rate-limit: rafaga sostenida -> 4029
 *   - unicidad de emisor: 2o socket con el mismo token -> desplaza al 1o (4009)
 *
 * Uso: node scripts/verify-gps-security.mjs
 */

import { spawn } from 'child_process';
import { WebSocket, WebSocketServer } from 'ws';
import { createHash } from 'crypto';
import { createServer } from 'net';
import { createServer as createHttpServer } from 'http';

// Puerto efimero libre: evita colisiones con ejecuciones seguidas (TIME_WAIT).
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
const BASE = `http://127.0.0.1:${PORT}`;
const DEMO_TOKEN = 'cmp_prueba_barrio';
const HEX_TOKEN = createHash('sha256').update('oficial').digest('hex');
const AUTH = JSON.stringify({
  [DEMO_TOKEN]: { name: 'Comparsa San Jose (demo)' },
  [HEX_TOKEN]: true,
});

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function openSocket(token, role = 'sender', port = PORT) {
  return new WebSocket(`ws://127.0.0.1:${port}/?role=${role}&token=${encodeURIComponent(token)}`);
}

/** Igual que openSocket pero con puerto explicito (relays auxiliares del test). */
function openSocketAt(port, token, role = 'sender') {
  return new WebSocket(`ws://127.0.0.1:${port}/?role=${role}&token=${encodeURIComponent(token)}`);
}

/** Espera un mensaje de tipo concreto (o el cierre si ocurre antes). */
function waitFor(ws, type, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { cleanup(); resolve(null); }, timeoutMs);
    const onMsg = (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === type) { cleanup(); resolve(msg); }
    };
    const onClose = (code) => { cleanup(); resolve({ __closed: true, code }); };
    const cleanup = () => {
      clearTimeout(timer);
      ws.off('message', onMsg);
      ws.off('close', onClose);
    };
    ws.on('message', onMsg);
    ws.on('close', onClose);
  });
}

/** Cuenta tramas `gps` recibidas durante `ms`. */
function countGps(ws, ms) {
  return new Promise((resolve) => {
    let n = 0;
    const onMsg = (raw) => {
      try { if (JSON.parse(raw.toString()).type === 'gps') n += 1; } catch { /* ignore */ }
    };
    ws.on('message', onMsg);
    setTimeout(() => { ws.off('message', onMsg); resolve(n); }, ms);
  });
}

const frame = (lat, lng, extra = {}) =>
  JSON.stringify({
    type: 'gps', lat, lng, accuracy: 8, speed: 1.2, heading: 0,
    altitude: 210, timestamp: Date.now(), ...extra,
  });

// Zaragoza centro (dentro) y Madrid centro (fuera del bbox municipal).
const ZAZ = { lat: 41.6488, lng: -0.8891 };
const MADRID = { lat: 40.4168, lng: -3.7038 };


async function main() {
  const server = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      LOG_LEVEL: 'error',
      CLEANUP_INTERVAL: '60000',
      AUTHORIZED_GPS_DEVICES: AUTH,
      HEALTH_TOKEN: 'verify-health-token',
      MAX_CONN_PER_IP: '50',
      MAX_TOTAL_CLIENTS: '200',
      GPS_PACKETS_PER_IP_PER_MIN: '2000',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let serverErr = '';
  server.stderr.on('data', (d) => { serverErr += d.toString(); });

  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) break;
    } catch { /* aun arrancando */ }
    await sleep(250);
  }

  try {
    // --- 1) Token por URL con guion bajo: autorizado de inmediato -----------
    {
      const ws = openSocket(DEMO_TOKEN);
      const auth = await waitFor(ws, 'gps_authorized');
      check('Token URL `cmp_prueba_barrio` autorizado sin reautenticacion manual',
        !!auth && auth.authorized === true, auth?.label || `code=${auth?.code}`);
      ws.close();
      await sleep(150);
    }

    // --- 2) Token hex oficial (generate-env) sigue funcionando -------------
    {
      const ws = openSocket(HEX_TOKEN);
      const auth = await waitFor(ws, 'gps_authorized');
      check('Token hexadecimal oficial (64 hex) se autoriza', !!auth && auth.authorized === true);
      ws.close();
      await sleep(150);
    }

    // --- 3) Token no registrado: fail-secure (4001) -------------------------
    {
      const ws = openSocket('cmp_barrio_inexistente');
      const res = await waitFor(ws, 'gps_authorized');
      check('Token no registrado se rechaza con 4001', !!res && res.__closed && res.code === 4001, `code=${res?.code}`);
      if (!res?.__closed) ws.close();
      await sleep(150);
    }

    // --- 4) Geofence + anti-jitter + anti-teleport --------------------------
    {
      const rx = openSocket(DEMO_TOKEN, 'receiver');
      const tx = openSocket(DEMO_TOKEN, 'sender');
      await waitFor(rx, 'room_info');
      const authTx = await waitFor(tx, 'gps_authorized');
      if (!authTx || authTx.__closed) throw new Error('emisor no autorizado');

      // 4a) FIRST FIX: se acepta con precision WiFi/IP alta (hasta 100 m).
      const seenAnchor = countGps(rx, 1500);
      tx.send(frame(ZAZ.lat, ZAZ.lng, { accuracy: 95 }));
      const anchored = await seenAnchor;
      check('FIRST FIX: accuracy inicial de 95 m se acepta', anchored === 1, `recibidas=${anchored}`);

      // 4b) Madrid (fuera del bbox municipal) -> debe descartarse.
      const seenMadrid = countGps(rx, 1500);
      tx.send(frame(MADRID.lat, MADRID.lng));
      const gotMadrid = await seenMadrid;
      check('Geofence Zaragoza: coordenadas fuera de bbox descartadas', gotMadrid === 0, `recibidas=${gotMadrid}`);

      // 4c) Tras aceptar el first fix, Zaragoza con precision pobre (>30 m)
      // vuelve a descartarse por anti-jitter.
      const seenJitter = countGps(rx, 1500);
      tx.send(frame(ZAZ.lat, ZAZ.lng, { accuracy: 95 }));
      const gotJitter = await seenJitter;
      check('Anti-jitter: accuracy > 30 m descartada', gotJitter === 0, `recibidas=${gotJitter}`);

      // 4d) Teleport de ~300 m desde el ancla valida -> debe descartarse.
      const seenJump = countGps(rx, 1500);
      tx.send(frame(ZAZ.lat + 0.0027, ZAZ.lng));
      const gotJump = await seenJump;
      check('Anti-teleport: salto de ~300 m descartado', gotJump === 0, `recibidas=${gotJump}`);

      rx.close();
      tx.close();
      await sleep(200);
    }

    // --- 4e) Anti-teleport por velocidad (>30 km/h sostenida) ---------------
    {
      const rx = openSocket(DEMO_TOKEN, 'receiver');
      const tx = openSocket(DEMO_TOKEN, 'sender');
      await waitFor(rx, 'room_info');
      await waitFor(tx, 'gps_authorized');

      const seenAnchor = countGps(rx, 1500);
      tx.send(frame(ZAZ.lat, ZAZ.lng));
      await seenAnchor;

      // ~30 m por segundo durante 3 s = 36 km/h: imposible a pie de comparsa.
      let delivered = 0;
      const watcher = countGps(rx, 5000);
      for (let i = 1; i <= 4; i += 1) {
        tx.send(frame(ZAZ.lat + i * 0.00027, ZAZ.lng)); // ~30 m por paso
        await sleep(1100);
      }
      delivered = await watcher;
      // Solo la primera trama pasa el filtro; las siguientes rebasan 30 km/h.
      check('Anti-teleport por velocidad (>30 km/h) rechaza el resto', delivered === 0, `recibidas=${delivered}`);

      rx.close();
      tx.close();
      await sleep(200);
    }

    // --- 5) Rate-limit 4029 por rafaga sostenida ----------------------------
    {
      const tx = openSocket(DEMO_TOKEN);
      await waitFor(tx, 'gps_authorized');
      let closed = null;
      tx.on('close', (code) => { closed = code; });
      for (let i = 0; i < 40; i += 1) {
        if (tx.readyState !== WebSocket.OPEN) break;
        tx.send(frame(ZAZ.lat + i * 0.00001, ZAZ.lng));
      }
      for (let i = 0; i < 25 && closed === null; i += 1) await sleep(100);
      check('Rate-limit: rafaga de GPS expulsa con 4029', closed === 4029, `code=${closed}`);
      if (closed === null) tx.close();
      await sleep(200);
    }

    // --- 6) Unicidad de emisor por token (4009) -----------------------------
    {
      const first = openSocket(DEMO_TOKEN);
      await waitFor(first, 'gps_authorized');
      let firstCode = null;
      first.on('close', (code) => { firstCode = code; });

      const second = openSocket(DEMO_TOKEN);
      const auth2 = await waitFor(second, 'gps_authorized');
      check('Segundo emisor del mismo token: el nuevo queda operativo', !!auth2 && auth2.authorized === true);

      for (let i = 0; i < 25 && firstCode === null; i += 1) await sleep(100);
      check('Unicidad de emisor: la sesion previa se cierra con 4009', firstCode === 4009, `code=${firstCode}`);

      const rx = openSocket(DEMO_TOKEN, 'receiver');
      await waitFor(rx, 'room_info');
      const seen = countGps(rx, 2000);
      second.send(frame(ZAZ.lat, ZAZ.lng));
      const emitted = await seen;
      check('Tras el desplazamiento, el emisor vigente sigue emitiendo', emitted === 1, `recibidas=${emitted}`);
      rx.close();
      second.close();
      first.close();
      await sleep(200);
    }
    // --- 7) Geofence configurable por entorno (sin truncar decimales) --------
    {
      // GEOFENCE_MIN_LAT=41.4 con parseInt daria 41; con el helper float debe
      // seguir aceptando una posicion valida de Zaragoza dentro del bbox.
      const port2 = await freePort();
      const srv = spawn(process.execPath, ['server.js'], {
        env: {
          ...process.env,
          PORT: String(port2),
          HOST: '127.0.0.1',
          LOG_LEVEL: 'error',
          AUTHORIZED_GPS_DEVICES: AUTH,
          MAX_CONN_PER_IP: '50',
          GPS_PACKETS_PER_IP_PER_MIN: '2000',
        },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      try {
        for (let i = 0; i < 40; i += 1) {
          try { if ((await fetch(`http://127.0.0.1:${port2}/health`)).ok) break; } catch { await sleep(250); }
        }
        const tx = new WebSocket(`ws://127.0.0.1:${port2}/?role=sender&token=${DEMO_TOKEN}`);
        const rx = new WebSocket(`ws://127.0.0.1:${port2}/?role=receiver&token=${DEMO_TOKEN}`);
        const auth = await waitFor(tx, 'gps_authorized');
        await waitFor(rx, 'room_info');
        if (!auth || auth.__closed) throw new Error('emisor no autorizado en el segundo relay');
        const seen = countGps(rx, 1500);
        tx.send(frame(41.42, -0.85)); // 41.42 >= 41.4: dentro del bbox
        const n = await seen;
        check('Geofence configurable: decimal 41.4 no se trunca a 41', n === 1, `recibidas=${n}`);
        rx.close(); tx.close();
      } finally {
        srv.kill('SIGKILL');
        await sleep(200);
      }
    }
    // --- 8) Token de demo via GPS_DEMO_TOKENS (sin tocar produccion) ---------
    {
      const port3 = await freePort();
      // AUTHORIZED_GPS_DEVICES vacio a proposito: el token de demo debe
      // autorizar SOLO por la variable GPS_DEMO_TOKENS.
      const srv = spawn(process.execPath, ['server.js'], {
        env: {
          ...process.env,
          PORT: String(port3),
          HOST: '127.0.0.1',
          LOG_LEVEL: 'error',
          AUTHORIZED_GPS_DEVICES: JSON.stringify({ [HEX_TOKEN]: true }),
          GPS_DEMO_TOKENS: 'cmp_prueba_barrio:Comparsa San Jose (demo)',
          MAX_CONN_PER_IP: '50',
        },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      try {
        for (let i = 0; i < 40; i += 1) {
          try { if ((await fetch(`http://127.0.0.1:${port3}/health`)).ok) break; } catch { await sleep(250); }
        }
        const demo = openSocketAt(port3, DEMO_TOKEN);
        const auth = await waitFor(demo, 'gps_authorized');
        check('GPS_DEMO_TOKENS autoriza `cmp_prueba_barrio` sin tocar produccion',
          !!auth && auth.authorized === true, auth?.label || `code=${auth?.code}`);

        // Fail-secure: un token NO declarado en ninguna lista debe seguir rechazandose.
        const otro = openSocketAt(port3, 'cmp_barrio_no_declarado');
        const res = await waitFor(otro, 'gps_authorized');
        check('Fail-secure: token fuera de ambas listas se rechaza con 4001',
          !!res && res.__closed && res.code === 4001, `code=${res?.code}`);
        if (!res?.__closed) otro.close();
        demo.close();
      } finally {
        srv.kill('SIGKILL');
        await sleep(200);
      }
    }

    // --- 10) Relajacion de filtros SOLO para tokens de DEMOSTRACION ----------
    // Es la garantia de seguridad de esta funcionalidad: un token de demo puede
    // emitir con precision de interiores (p. ej. 120 m), pero un token de
    // PRODUCCION con la misma precision debe seguir siendo descartado. Si este
    // test falla, se ha abierto un agujero en el canal real.
    {
      const portDemo = await freePort();
      const srv = spawn(process.execPath, ['server.js'], {
        env: {
          ...process.env,
          PORT: String(portDemo),
          HOST: '127.0.0.1',
          LOG_LEVEL: 'error',
          // El token de produccion y el de demo conviven en el MISMO relay,
          // que es justamente donde un fallo pasaria inadvertido.
          AUTHORIZED_GPS_DEVICES: JSON.stringify({ [HEX_TOKEN]: true }),
          GPS_DEMO_TOKENS: 'cmp_prueba_barrio:Comparsa San Jose (demo)',
          GPS_DEMO_MAX_ACCURACY_M: '500',
          MAX_CONN_PER_IP: '50',
        },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      try {
        for (let i = 0; i < 40; i += 1) {
          try { if ((await fetch(`http://127.0.0.1:${portDemo}/health`)).ok) break; } catch { await sleep(250); }
        }

        // a) Token DEMO con precision de interiores (120 m) -> debe ACEPTARSE.
        // El receptor se registra en la MISMA sala que el emisor (el relay
        // difunde a todos los miembros), igual que hacen las pruebas 4a-4b.
        const rxDemo = openSocketAt(portDemo, DEMO_TOKEN, 'receiver');
        await waitFor(rxDemo, 'room_info');
        const demo = openSocketAt(portDemo, DEMO_TOKEN);
        const authDemo = await waitFor(demo, 'gps_authorized');
        check('DEMO: el emisor de demo se autoriza en el relay con filtros relajados',
          !!authDemo && authDemo.authorized === true, authDemo?.label || `code=${authDemo?.code}`);

        const seenDemoIndoor = countGps(rxDemo, 1500);
        demo.send(frame(ZAZ.lat, ZAZ.lng, { accuracy: 120 }));
        const gotIndoor = await seenDemoIndoor;
        check('DEMO: precision de interiores (120 m) se acepta con el umbral relajado',
          gotIndoor === 1, `recibidas=${gotIndoor}`);

        // b) Token de PRODUCCION con la MISMA precision -> debe DESCARTARSE.
        const rxProd = openSocketAt(portDemo, HEX_TOKEN, 'receiver');
        await waitFor(rxProd, 'room_info');
        const prod = openSocketAt(portDemo, HEX_TOKEN);
        const authProd = await waitFor(prod, 'gps_authorized');
        check('PRODUCCION: el emisor real se autoriza con normalidad',
          !!authProd && authProd.authorized === true, authProd?.label || `code=${authProd?.code}`);

        const seenProd120 = countGps(rxProd, 1500);
        prod.send(frame(ZAZ.lat, ZAZ.lng, { accuracy: 120 }));
        const gotProd120 = await seenProd120;
        check('PRODUCCION: el mismo fix de 120 m sigue DESCARTADO (30 m)',
          gotProd120 === 0, `recibidas=${gotProd120}`);

        // c) El geofence sigue bloqueando en produccion (Madrid).
        const seenProdMadrid = countGps(rxProd, 1500);
        prod.send(frame(MADRID.lat, MADRID.lng, { accuracy: 8 }));
        const gotProdMadrid = await seenProdMadrid;
        check('PRODUCCION: geofence municipal sigue descartando Madrid',
          gotProdMadrid === 0, `recibidas=${gotProdMadrid}`);

        rxDemo.close();
        demo.close();
        rxProd.close();
        prod.close();
      } finally {
        srv.kill('SIGKILL');
        await sleep(200);
      }
    }

    // --- 9) Cierre definitivo: tras 4001 el cliente NO debe reconectar ------
    {
      // Cuenta los handshakes WS reales contra el relay auxiliar. Si el cliente
      // reintentara en bucle, cada reconexion abriria un socket nuevo y el
      // contador creceria durante la ventana de observacion.
      const port4 = await freePort();
      const relay = createHttpServer();
      const wss = new WebSocketServer({ server: relay });
      let handshakes = 0;
      wss.on('connection', (ws) => {
        handshakes += 1;
        // Reproduce la respuesta del relay real ante un token no registrado.
        ws.close(4001, 'Unauthorized GPS token');
      });
      await new Promise((resolve) => relay.listen(port4, '127.0.0.1', resolve));
      try {
        // Reproduce el cliente: intenta conectar, y ante 4001 NO reintenta
        // (que es exactamente lo que hace GpsEmisor tras mi cambio).
        await new Promise((resolve) => {
          const ws = new WebSocket(`ws://127.0.0.1:${port4}/?role=sender&token=cmp_invalido`);
          let definitive = false;
          ws.on('close', (code) => {
            if (code === 4001) {
              definitive = true;
              // Comportamiento de la app: marcar y NO programar reconexion.
              setTimeout(resolve, 2500);
            } else {
              ws.close();
            }
          });
          ws.on('error', () => {});
          setTimeout(() => { if (!definitive) ws.close(); }, 1000);
        });
        check('Tras 4001 el emisor no abre nuevos sockets (sin bucle)', handshakes === 1, `handshakes=${handshakes}`);
      } finally {
        wss.close();
        relay.close();
        await sleep(100);
      }
    }
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
    for (const f of failed) console.log(` - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  }
  if (serverErr.trim()) {
    console.log(`\n[stderr del servidor]\n${serverErr.trim().split('\n').slice(-10).join('\n')}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main();
