/**
 * Prueba de extremo a extremo del panel B2G contra el relay real.
 *
 * Levanta `server.js` con una credencial de panel y un emisor GPS autorizado,
 * conecta un emisor WebSocket de verdad, le manda tramas por el Casco Histórico
 * (incluida una parada) y consulta `/api/municipal/*`. Comprueba el cadena
 * COMPLETO: WS -> auditoría GPS -> analítica -> API -> respuesta JSON.
 *
 * Es la única prueba que demuestra que el panel no está leyendo un dataset de
 * juguete: si alguien rompe el enganche en `server.js`, esto falla.
 *
 * Uso: node scripts/verify-panel-e2e.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocket } from 'ws';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3987;
const BASE = `http://127.0.0.1:${PORT}`;
const PANEL_TOKEN = 'e2e-token-panel-987654';
const GPS_TOKEN = 'e2e_comparsa_panel';
const ORIGEN = [41.6563, -0.8789];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, headers, reintentar = true) {
  const limite = Date.now() + 8000;
  while (true) {
    try {
      const res = await fetch(url, headers ? { headers } : undefined);
      return { status: res.status, body: await res.json() };
    } catch (err) {
      if (!reintentar || Date.now() > limite) throw err;
      await esperar(300);
    }
  }
}

console.log('── ARRANQUE DEL SERVIDOR ────────────────────────────────');
const server = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT: String(PORT),
    HOST: '127.0.0.1',
    LOG_LEVEL: 'error',
    MUNICIPAL_PANEL_TOKEN: PANEL_TOKEN,
    AUTHORIZED_GPS_DEVICES: JSON.stringify({ [GPS_TOKEN]: { name: 'E2E Panel' } }),
  },
  stdio: 'ignore',
});

const parar = () => {
  try {
    server.kill();
  } catch {
    /* ignore */
  }
};
process.on('exit', parar);
process.on('SIGINT', () => {
  parar();
  process.exit(130);
});

try {
  const salud = await pedir(`${BASE}/health`);
  check('El servidor arranca y responde /health', salud.status === 200, `status=${salud.status}`);

  // ── Seguridad del endpoint ──────────────────────────────────────────────
  console.log('\n── SEGURIDAD DEL ENDPOINT ─────────────────────────────');
  const sinToken = await pedir(`${BASE}/api/municipal/resumen`);
  check('Sin cabecera de token responde 401', sinToken.status === 401, `status=${sinToken.status}`);

  const tokenMalo = await pedir(`${BASE}/api/municipal/resumen`, { 'x-panel-token': 'token-incorrecto' });
  check('Con token incorrecto responde 401', tokenMalo.status === 401, `status=${tokenMalo.status}`);

  // ── El 503 que se veía en producción ──────────────────────────────────────
  // En Render el valor se pega a mano y llegaba con comillas o espacios. Con
  // el `process.env.X || ''` a lepas eso se traducía en 503 aunque la variable
  // estuviera puesta: el operador veía la variable en el panel y el panel
  // respondía "no configurado" sin explicación. Estas dos peticiones DEBEN dar
  // 200, y no 503, porque el token del servidor es correcto.
  console.log('\n── CREDENCIAL PEGADA A MANO (el 503 de produccion) ───');
  const tokenEnComillas = await pedir(`${BASE}/api/municipal/salas`, { 'x-panel-token': `"${PANEL_TOKEN}"` });
  check('Un token entre comillas se acepta (no 503)', tokenEnComillas.status === 200, `status=${tokenEnComillas.status}`);

  const tokenConEspacios = await pedir(`${BASE}/api/municipal/salas`, { 'x-panel-token': `  ${PANEL_TOKEN}  ` });
  check('Un token con espacios sobrantes se acepta', tokenConEspacios.status === 200, `status=${tokenConEspacios.status}`);

  const soloEspacios = await pedir(`${BASE}/api/municipal/salas`, { 'x-panel-token': '   ' });
  check('Un token que solo son espacios responde 401 (no 503)', soloEspacios.status === 401, `status=${soloEspacios.status}`);

  const conBearer = await pedir(`${BASE}/api/municipal/salas`, { authorization: `Bearer ${PANEL_TOKEN}` });
  check('La cabecera Authorization: Bearer tambien vale', conBearer.status === 200, `status=${conBearer.status}`);

  const soloLectura = await fetch(`${BASE}/api/municipal/resumen`, { method: 'POST' });
  check('POST responde 405 (solo lectura)', soloLectura.status === 405, `status=${soloLectura.status}`);

  const cabeceras = await fetch(`${BASE}/api/municipal/resumen`, {
    headers: { 'x-panel-token': PANEL_TOKEN },
  });
  check(
    'La respuesta del panel no se cachea',
    cabeceras.headers.get('cache-control') === 'no-store',
    cabeceras.headers.get('cache-control'),
  );

  const auth = { 'x-panel-token': PANEL_TOKEN };

  // ── Emisor GPS real ────────────────────────────────────────────────────
  console.log('\n── EMISOR GPS → ANALÍTICA ─────────────────────────────');
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}?role=sender&token=${GPS_TOKEN}`);
  const autorizado = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), 8000);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (['gps_authorized', 'room_info', 'gps'].includes(msg.type)) {
        clearTimeout(t);
        resolve(msg.type);
      }
    });
    ws.on('error', () => {
      clearTimeout(t);
      resolve(false);
    });
  });
  check('El emisor GPS es autorizado por el relay', Boolean(autorizado), String(autorizado));

  // 40 tramas avanzando y después 25 tramas parado en la plaza.
  //
  // El paso importa: el relay tiene anti-teleport (>30 km/h o >100 m en <3 s) y
  // este test pasa por ESA auditoría. Un comparsa real va a paso (~4-5 km/h), así
  // que se simula eso: 0,00004° por segundo ≈ 4,4 m/s. Con 0,00022°/s las tramas
  // se hubiesen descartado y el panel no vería nada, que es lo correcto.
  const PASO_POR_TRAMA = 0.00004;
  const enviar = (lat, lng, speed) =>
    ws.send(JSON.stringify({ type: 'gps', lat, lng, speed, accuracy: 8, timestamp: Date.now() }));

  for (let i = 0; i < 40; i++) {
    enviar(ORIGEN[0] + i * PASO_POR_TRAMA, ORIGEN[1] + i * (PASO_POR_TRAMA / 2), 1.1);
    await esperar(1010); // el relay limita a 1 paquete por emisor y segundo
  }
  const latParada = ORIGEN[0] + 40 * PASO_POR_TRAMA;
  const lngParada = ORIGEN[1] + 40 * (PASO_POR_TRAMA / 2);
  for (let i = 0; i < 25; i++) {
    enviar(latParada, lngParada, 0);
    await esperar(1010);
  }
  await esperar(1500);

  // ── Consulta al panel ──────────────────────────────────────────────────
  console.log('\n── CONSULTA AL PANEL ──────────────────────────────────');
  const salas = await pedir(`${BASE}/api/municipal/salas`, auth);
  check('El panel lista la sala con datos', salas.body.salas?.length === 1, JSON.stringify(salas.body));
  const hash = salas.body.salas?.[0]?.hash;
  check('La sala se expone solo por huella', typeof hash === 'string' && /^[0-9a-f]{8}$/.test(hash), String(hash));
  check('La lista NO filtra el token del emisor', !JSON.stringify(salas.body).includes(GPS_TOKEN));

  const resumen = await pedir(`${BASE}/api/municipal/resumen?sala=${hash}`, auth);
  const d = resumen.body;
  check('El resumen llega con datos', d.vacio === false, `vacio=${d.vacio}`);
  check('Se registran las 65 muestras GPS', d.muestras === 65, `muestras=${d.muestras}`);
  // 40 tramos de 0,00004° de lat ≈ 4,45 m cada uno ≈ 178 m recorridos.
  check('Calcula la distancia recorrida', d.recorrido.distanciaM > 120, `${d.recorrido.distanciaM} m`);
  check('Detecta la parada de ~25 s', d.paradas.total === 1, `paradas=${d.paradas.total}`);
  check(
    'La parada tiene duración >= 20 s',
    (d.paradas.lista[0]?.duracionSeg ?? 0) >= 20,
    `${d.paradas.lista[0]?.duracionSeg} s`,
  );
  check('El heatmap trae celdas', d.celdas.length > 0, `${d.celdas.length} celdas`);
  check('La trayectoria real está registrada', d.trayectoria.length > 5, `${d.trayectoria.length} puntos`);
  check('El resumen NO filtra el token', !JSON.stringify(d).includes(GPS_TOKEN));

  // El agregado (sin `sala`) debe devolver la MISMA forma que la ficha.
  const agregado = await pedir(`${BASE}/api/municipal/resumen`, auth);
  check('El agregado responde 200 con datos', agregado.status === 200 && agregado.body.vacio === false);
  check(
    'El agregado tiene la misma forma que la ficha',
    Boolean(agregado.body.recorrido && agregado.body.paradas && agregado.body.audiencia && Array.isArray(agregado.body.celdas)),
  );
  check('El agregado suma las mismas muestras', agregado.body.muestras === d.muestras, `${agregado.body.muestras}`);

  // Sala por huella desconocida: debe devolver la forma completa, no reventar.
  const desconocida = await pedir(`${BASE}/api/municipal/resumen?sala=00000000`, auth);
  check(
    'Una huella desconocida responde 200 con `vacio`',
    desconocida.status === 200 && desconocida.body.vacio === true,
  );
  check(
    'La respuesta vacía trae TODOS los campos',
    Boolean(desconocida.body.recorrido && desconocida.body.paradas && desconocida.body.audiencia),
  );

  ws.close();
} catch (err) {
  check('La prueba de extremo a extremo se ejecuta sin excepciones', false, err?.message || String(err));
} finally {
  parar();
}

// ── La variable de Render llega sucia ───────────────────────────────────────
// Arranca un segundo servidor con la credencial tal y como se pega en el panel
// de Render: con comillas, espacios y un salto de línea. Es la única prueba
// que reproduce el 503 de producción de principio a fin, y comprueba las dos
// mitades del arreglo: que el token saneado FUNCIONA (200) y que el 503 queda
// reservado al caso en que no hay credencial ninguna.
console.log('\n── MUNICIPAL_PANEL_TOKEN PEGADO A MANO EN RENDER ───────');

async function arrancarConToken(valor, puerto) {
  // Se parte de un entorno limpio: si el shell del desarrollador ya tiene
  // MUNICIPAL_PANEL_TOKEN, `...process.env` lo heredaría y el caso "sin
  // credencial" no probaría nada.
  const env = {
    ...process.env,
    PORT: String(puerto),
    HOST: '127.0.0.1',
    LOG_LEVEL: 'error',
    AUTHORIZED_GPS_DEVICES: JSON.stringify({ [GPS_TOKEN]: { name: 'E2E Panel' } }),
  };
  delete env.MUNICIPAL_PANEL_TOKEN;
  if (valor !== null) env.MUNICIPAL_PANEL_TOKEN = valor;

  const hijo = spawn('node', ['server.js'], {
    cwd: ROOT,
    env,
    stdio: 'ignore',
  });
  const detener = () => {
    try {
      hijo.kill();
    } catch {
      /* ignore */
    }
  };
  try {
    const base = `http://127.0.0.1:${puerto}`;
    await pedir(`${base}/health`);
    return { base, detener };
  } catch (err) {
    detener();
    throw err;
  }
}

const SUCIO = `  "${PANEL_TOKEN}"  \n`;
const servidorSucio = await arrancarConToken(SUCIO, 3988).catch(() => null);
if (!servidorSucio) {
  check('Arranca un servidor con la credencial sucia', false, 'no arrancó en el puerto 3988');
} else {
  check('Arranca un servidor con la credencial sucia (comillas, espacios y \\n)', true);
  const base = servidorSucio.base;
  try {
    // El caso que fallaba en producción: la variable está puesta, es correcta,
    // y aun así el panel respondía 503 `panel_no_configurado`.
    const correcto = await pedir(`${base}/api/municipal/salas`, { 'x-panel-token': PANEL_TOKEN });
    check(
      'Con la variable entre comillas el panel responde 200 (ya no 503)',
      correcto.status === 200,
      `status=${correcto.status}`,
    );
    check('La respuesta ya no dice `panel_no_configurado`', correcto.body.error === undefined);

    const malToken = await pedir(`${base}/api/municipal/salas`, { 'x-panel-token': 'otro-token' });
    check(
      'Con la variable puesta, un token erróneo es 401 (no 503)',
      malToken.status === 401,
      `status=${malToken.status}`,
    );
  } finally {
    servidorSucio.detener();
  }
}

// El otro lado de la moneda: sin variable, 503 y SOLO 503. El fail-secure del
// panel no puede relajarse para "arreglar" el 503 anterior.
const sinToken = await arrancarConToken(null, 3989).catch(() => null);
if (!sinToken) {
  check('Arranca un servidor sin credencial de panel', false, 'no arrancó en el puerto 3989');
} else {
  check('Arranca un servidor sin credencial de panel', true);
  try {
    const conToken = await pedir(`${sinToken.base}/api/municipal/salas`, {
      'x-panel-token': PANEL_TOKEN,
    });
    check('Sin MUNICIPAL_PANEL_TOKEN responde 503 aunque el token sea correcto', conToken.status === 503, `status=${conToken.status}`);
    check('El cuerpo del 503 identifica la causa', conToken.body.error === 'panel_no_configurado', JSON.stringify(conToken.body));
    const resumen503 = await pedir(`${sinToken.base}/api/municipal/resumen`, { 'x-panel-token': PANEL_TOKEN });
    check('El 503 se aplica a todos los endpoints municipales', resumen503.status === 503, `status=${resumen503.status}`);
  } finally {
    sinToken.detener();
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
if (failed.length) {
  console.log('FALLOS:');
  for (const f of failed) console.log(` - ${f.name}`);
  process.exit(1);
}
process.exit(0);

