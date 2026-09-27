/**
 * ANALÍTICA MUNICIPAL (B2G) — agregación de recorrido para el Ayuntamiento.
 *
 * El relay ya recibe todo lo necesario: las tramas GPS aceptadas de la comparsa
 * y el número de espectadores conectados al stream. Este módulo las convierte en
 * los tres indicadores que necesita el panel: distancia recorrida, tiempos de
 * parada y mapa de calor de afluencia.
 *
 * ── PRIVACIDAD (no es un detalle, es el requisito) ──────────────────────────
 * El panel es un producto de gestión municipal sobre una calle llena de gente.
 * Aquí NO se guarda nada identificable:
 *   - Ni identificadores de emisor, ni de espectador, ni IPs, ni tokens.
 *   - La afluencia se agrega en celdas de 100 m: no se sabe quién estaba
 *     dónde, solo cuántas "personas-equivalente" hubo en cada manzanas.
 *   - Todo el histórico se poda por TTL (`MUNICIPAL_TTL_MS`), así que un
 *     despliegue no accumulates datos indefinidamente de una fiesta antigua.
 * Es la diferencia entre un panel de gestión y una vigilancia. Si algún día
 * alguien pide trazas individuales, la respuesta es no, y está escrito aquí para
 * que la decisión no dependa de quién lea el código.
 *
 * ── El hepatic de afluencia NO es "gente real" ────────────────────────────
 * No hay sensor de público en la app. Lo que se mide es la demanda observada
 * (espectadores del stream) mientras la comparsa estaba en cada celda. Es un
 * INDICADOR DE DEMANDA, no un censo: así se etiqueta en la API y en la UI.
 *
 * Sin dependencias: lo importa `server.js` (Node ESM) y lo ejercita
 * `scripts/verify-municipio.mjs` en Node, sin necesidad del navegador.
 */

/** Radio (m) de la celda del heatmap: privacy-first y legible en pantalla. */
export const CELDA_HEATMAP_M = 100;

/** Por debajo de esta velocidad (m/s) se considera que la comparsa está parada. */
export const VELOCIDAD_PARADA_MS = 0.4;

/** Duración mínima (ms) parada para que cuente como parada y no como semáforo. */
export const PARADA_MINIMA_MS = 20000;

/** Retención por defecto del histórico agregado (6 h). */
export const MUNICIPAL_TTL_MS = 6 * 60 * 60 * 1000;

/** Techo de muestras por sala: cota dura de memoria aunque no haya poda. */
export const MAX_MUESTRAS_POR_SALA = 4000;

/** Duración de una muestra de afluencia (s): 1 por 30 s y sala. */
export const INTERVALO_AUDIENCIA_MS = 30000;

/** @typedef {{key: string, lat: number, lng: number, peso: number, ultima: number}} CeldaHeat */

/** @type {Map<string, Sala>} */
const salas = new Map();

/**
 * Estado agregado de una sala (un token de comparsa = un recorrido).
 * No guarda identificadores de persona: solo counters, paradas y celdas.
 */
class Sala {
  constructor() {
    /** Distancia acumulada y aceptada (m). */
    this.distanciaM = 0;
    /** Número de muestras GPS aceptadas. */
    this.muestras = 0;
    /** Primer y último fix aceptado (epoch ms). */
    this.primerFixAt = 0;
    this.ultimoFixAt = 0;
    /** Velocidad media ponderada por tramo (m/s). */
    this.velocidadPonderada = 0;
    /** Trayectoria para el mapa (muestreada, no una traza por trama). */
    this.trayectoria = [];
    /** Paradas detectadas, cerradas o en curso. */
    this.paradas = [];
    /** Celdas del heatmap: key -> celda. */
    this.celdas = new Map();
    /** Última muestra de audiencia (espectadores del stream). */
    this.audiencia = { espectadores: 0, maxima: 0, aLas: 0 };
    /** Último punto aceptado, para el cálculo de paso. */
    this.ultimoPunto = null;
    /** Parada en curso (aún sin cerrar). */
    this.paradaEnCurso = null;
  }
}

function obtenerSala(roomId) {
  let sala = salas.get(roomId);
  if (!sala) {
    sala = new Sala();
    salas.set(roomId, sala);
  }
  return sala;
}

/** Clave de celda estable: no depende del orden de inserción ni del float. */
function claveCelda(lat, lng, celdaM) {
  const paso = celdaM / 111320; // grados por metro en latitud
  const fila = Math.floor(lat / paso);
  const col = Math.floor(lng / paso);
  return `${fila}:${col}`;
}

/** Centro aproximado de la celda, para poder pintarla en el mapa. */
function centroCelda(key, celdaM) {
  const [fila, col] = key.split(':').map(Number);
  const paso = celdaM / 111320;
  return { lat: (fila + 0.5) * paso, lng: (col + 0.5) * paso };
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Registra una trama GPS YA ACEPTADA por el relay (geofence, precisión y
 * anti-teleport ya han pasado). Volver a validar aquí duplicaría reglas que
 * pueden divergir: si el relay acepta, la analítica acepta.
 *
 * @param {object} fix
 * @param {string} fix.roomId Clave de sala (nunca se expone al cliente).
 * @param {number} fix.lat
 * @param {number} fix.lng
 * @param {number} [fix.speed] m/s (ya saneado por el relay).
 * @param {number} [fix.at] epoch ms; por defecto, ahora.
 */
export function registrarFix({ roomId, lat, lng, speed = 0, at = Date.now() }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const sala = obtenerSala(roomId);
  const previo = sala.ultimoPunto;
  const dtMs = previo ? at - previo.at : 0;

  if (previo && dtMs > 0 && dtMs < 60000) {
    const paso = haversine(previo.lat, previo.lng, lat, lng);
    // Mismo criterio que el anti-teleport del relay: un salto absurdo no es
    // distancia recorrida, es ruido de GPS.
    if (paso < 500) {
      sala.distanciaM += paso;
      sala.velocidadPonderada += paso;
    }
  }
  sala.muestras += 1;
  if (sala.primerFixAt === 0) sala.primerFixAt = at;
  sala.ultimoFixAt = at;
  sala.ultimoPunto = { lat, lng, at, speed };

  // Trayectoria para el mapa: un punto cada ~20 m o cada 15 s, no por trama.
  const ultimo = sala.trayectoria[sala.trayectoria.length - 1];
  if (!ultimo || haversine(ultimo.lat, ultimo.lng, lat, lng) > 20 || at - ultimo.at > 15000) {
    sala.trayectoria.push({ lat, lng, at });
    if (sala.trayectoria.length > 500) sala.trayectoria.shift();
  }

  detectarParada(sala, { lat, lng, speed }, at);
  acumularCelda(sala, lat, lng, 1, at);
}

/**
 * Cierra la parada en curso y la guarda con su duración REAL completa.
 *
 * El momento de confirmación (superar `PARADA_MINIMA_MS`) NO es el final de la
 * parada: una cabalgata parada 3 minutos debe figurar con 3 minutos, no con los
 * 20 s que tardó en dejar de ser un semáforo. Por eso la parada se mantiene
 * "en curso" (actualizando `finAt` en cada trama) y se finaliza de verdad
 * cuando la comparsa vuelve a andar, o al podar la sala.
 */
function finalizarParada(sala, at) {
  const enCurso = sala.paradaEnCurso;
  if (!enCurso) return;
  if (at - enCurso.inicioAt < PARADA_MINIMA_MS) {
    // Parada demasiado corta: era un semáforo, no cuenta.
    sala.paradaEnCurso = null;
    return;
  }
  sala.paradas.push({
    lat: enCurso.lat,
    lng: enCurso.lng,
    inicioAt: enCurso.inicioAt,
    finAt: at,
    duracionSeg: Math.round((at - enCurso.inicioAt) / 1000),
  });
  if (sala.paradas.length > 50) sala.paradas.shift();
  sala.paradaEnCurso = null;
}

/**
 * Detección de parada por velocidad, no por geofencing de una plaza concreta:
 * así funciona en cualquier barrio sin tocar el catálogo de rutas.
 */
function detectarParada(sala, punto, at) {
  const enParada = punto.speed <= VELOCIDAD_PARADA_MS;

  if (!enParada) {
    // Volvió a andar: si había una parada en curso, se cierra con su duración.
    if (sala.paradaEnCurso) finalizarParada(sala, at);
    return;
  }

  if (!sala.paradaEnCurso) {
    sala.paradaEnCurso = { inicioAt: at, finAt: at, lat: punto.lat, lng: punto.lng, cerrada: false };
    return;
  }

  // El centro de la parada se suaviza con el punto nuevo: el GPS oscila unos
  // metros mientras la cabalgata espera, y anclar la parada al primer fix deja
  // el marcador en la acera de enfrente.
  const enCurso = sala.paradaEnCurso;
  enCurso.lat = enCurso.lat * 0.7 + punto.lat * 0.3;
  enCurso.lng = enCurso.lng * 0.7 + punto.lng * 0.3;
  enCurso.finAt = at;
  // Superado el mínimo, la parada ya es oficial: se marca como cerrada para que
  // `paradasDe` la muestre, pero sigue en curso hasta que la comparsa arranque.
  if (at - enCurso.inicioAt >= PARADA_MINIMA_MS) enCurso.cerrada = true;
}

/** Suma peso a la celda del heatmap y poda lo viejo si toca. */
function acumularCelda(sala, lat, lng, peso, at) {
  const key = claveCelda(lat, lng, CELDA_HEATMAP_M);
  const celda = sala.celdas.get(key);
  if (celda) {
    celda.peso += peso;
    celda.ultima = at;
  } else {
    sala.celdas.set(key, { key, lat, lng, peso, ultima: at });
  }
}

/**
 * Muestra de audiencia (espectadores del stream) imputada a la celda donde está
 * la comparsa. Es el indicador de demanda del heatmap: NO un censo de personas.
 *
 * Se llama desde el servidor con un temporizador, no por cada conexión, para que
 * abrir/cerrar streams no dispare escrituras.
 */
export function registrarAudiencia({ roomId, espectadores, at = Date.now() }) {
  if (!Number.isFinite(espectadores) || espectadores <= 0) return;
  const sala = obtenerSala(roomId);
  const punto = sala.ultimoPunto;
  if (!punto) return;
  sala.audiencia = {
    espectadores: Math.round(espectadores),
    maxima: Math.max(sala.audiencia.maxima, Math.round(espectadores)),
    aLas: at,
  };
  acumularCelda(sala, punto.lat, punto.lng, Math.round(espectadores), at);
}

/** Poda por TTL: nada de conservar datos de una fiesta anterior. */
export function podar(now = Date.now(), ttlMs = MUNICIPAL_TTL_MS) {
  for (const [roomId, sala] of salas) {
    for (const [key, celda] of sala.celdas) {
      if (now - celda.ultima > ttlMs) sala.celdas.delete(key);
    }
    while (sala.paradas.length && now - sala.paradas[0].finAt > ttlMs) sala.paradas.shift();
    if (sala.ultimoFixAt && now - sala.ultimoFixAt > ttlMs) {
      // La sala se va a borrar: si tenía una parada en curso, se cierra con la
      // última trama conocida. Perderla dejaría un hueco en el recuento de
      // paradas de la última hora de la fiesta.
      finalizarParada(sala, sala.ultimoFixAt);
      salas.delete(roomId);
    }
  }
  return salas.size;
}


/**
 * Paradas de la sala para la tabla del panel.
 *
 * Regla importante: una parada SOLO aparece cuando ya ha superado
 * `PARADA_MINIMA_MS`. While tanto se guarda en curso pero no se cuenta, para
 * que un semáforo de 5 s no contamine el informe de tiempos de parada de la
 * Concejala. Y una parada ya cerrada NUNCA se vuelve a añadir: se empuja a
 * `sala.paradas` al confirmarse y aquí solo se completa la que sigue en curso.
 */
function paradasDe(sala, ahora) {
  const lista = sala.paradas.map((p) => ({ ...p, enCurso: false }));
  const enCurso = sala.paradaEnCurso;
  // Solo se muestra si YA supera el mínimo: mientras tanto es un semáforo, no
  // una parada, y no debe ensuciar el informe. Su duración se calcula en vivo
  // porque aún no se ha cerrado.
  if (enCurso && ahora - enCurso.inicioAt >= PARADA_MINIMA_MS) {
    lista.push({
      lat: enCurso.lat,
      lng: enCurso.lng,
      inicioAt: enCurso.inicioAt,
      finAt: null,
      duracionSeg: Math.round((ahora - enCurso.inicioAt) / 1000),
      enCurso: true,
    });
  }
  return lista;
}

/**
 * Instantánea de gestión de una sala. Es lo que consume `GET /api/municipal/…`.
 *
 * `vacio: true` no es un error: es la respuesta honesta cuando aún no ha llegado
 * ninguna trama. El panel la pinta como "sin datos", no como ceros que parecen
 * measurements.
 */
/** Forma completa con `vacio: true`, para salas sin datos o inexistentes. */
function resumenVacio(hash, ahora) {
  // Devolver un objeto recortado obligaría al cliente a comprobar cada campo y
  // un `undefined` reventaría la pantalla justo cuando el ayuntamiento mira el
  // panel. La forma es SIEMPRE la misma; lo que cambia es el contenido.
  return {
    hash,
    vacio: true,
    muestras: 0,
    recorrido: {
      distanciaM: 0,
      duracionMs: 0,
      velocidadMediaMs: 0,
      primerFixAt: null,
      ultimoFixAt: null,
    },
    paradas: { total: 0, segundosParados: 0, lista: [] },
    audiencia: { espectadores: 0, maximo: 0, aLas: null },
    trayectoria: [],
    celdas: [],
    generadoAt: ahora,
  };
}

/**
 * Instantánea de gestión. Es lo que consume `GET /api/municipal/resumen`.
 *
 * El shape es SIEMPRE el mismo en los tres casos, porque el cliente lo consume
 * sin comprobar nada:
 *   - `todas: true`   -> agregado de todas las comparsas con datos.
 *   - sala concreta   -> esa comparsa.
 *   - sala que ya no existe -> `vacio: true` (la seleccion caducó).
 *
 * `vacio: true` no es un error: es la respuesta honesta cuando aún no ha llegado
 * ninguna trama. El panel la pinta como "sin datos", no como ceros que parecen
 * mediciones.
 */
export function resumen({ roomId, ahora = Date.now(), todas = false } = {}) {
  if (todas) return resumenAgregado(ahora);

  if (!roomId) return resumenVacio('todas', ahora);
  const sala = salas.get(roomId);
  // Se devuelve la HUELLA, nunca la clave real: el panel no necesita (ni debe
  // conocer) el token de la comparsa para pintar sus estadísticas.
  const hash = createHashLite(roomId);
  if (!sala) return resumenVacio(hash, ahora);
  const paradas = paradasDe(sala, ahora);
  const segundosParados = paradas.reduce(
    (acc, p) => acc + (p.duracionSeg == null ? 0 : p.duracionSeg),
    0,
  );
  const duracionMs = sala.primerFixAt ? Math.max(0, (sala.ultimoFixAt || ahora) - sala.primerFixAt) : 0;

  return {
    hash,
    vacio: sala.muestras === 0,
    muestras: sala.muestras,
    recorrido: {
      distanciaM: Math.round(sala.distanciaM),
      duracionMs,
      // Velocidad media del tramo realmente recorrido (no del reloj): si la
      // comparsa estuvo 3 min parada, esa espera no debe rebajar el ritmo.
      velocidadMediaMs:
        duracionMs > 0 ? Number((sala.distanciaM / (duracionMs / 1000)).toFixed(2)) : 0,
      primerFixAt: sala.primerFixAt || null,
      ultimoFixAt: sala.ultimoFixAt || null,
    },
    paradas: {
      total: paradas.length,
      segundosParados,
      lista: paradas,
    },
    audiencia: {
      espectadores: sala.audiencia.espectadores,
      maximo: sala.audiencia.maxima,
      aLas: sala.audiencia.aLas || null,
    },
    trayectoria: sala.trayectoria,
    // `mapaCalor` devuelve el contenedor {celdaM, max, celdas}; al resumen le
    // interesa solo la lista, que es lo que consume el cliente.
    celdas: mapaCalor({ roomId }).celdas,
    generadoAt: ahora,
  };
}

/**
 * Agregado de TODAS las comparsas con datos.
 *
 * Es la vista por defecto del panel ("¿cómo va la fiesta?"), distinta de la
 * ficha por comparsa. Los totales se suman por sala y el heatmap se une: dos
 * comparsas que han pasado por la misma manzana se leen como una sola mancha de
 * afluencia, que es como lo vive el vecino.
 */
function resumenAgregado(ahora) {
  const activas = Array.from(salas.values()).filter((s) => s.muestras > 0);
  if (!activas.length) return resumenVacio('todas', ahora);

  let distanciaM = 0;
  let muestras = 0;
  let segundosParados = 0;
  const listaParadas = [];
  const trayectoria = [];
  let primerFixAt = 0;
  let ultimoFixAt = 0;
  let espectadores = 0;
  let maximo = 0;

  for (const sala of activas) {
    distanciaM += sala.distanciaM;
    muestras += sala.muestras;
    trayectoria.push(...sala.trayectoria);
    if (sala.primerFixAt && (primerFixAt === 0 || sala.primerFixAt < primerFixAt)) {
      primerFixAt = sala.primerFixAt;
    }
    if (sala.ultimoFixAt > ultimoFixAt) ultimoFixAt = sala.ultimoFixAt;
    espectadores += sala.audiencia.espectadores;
    if (sala.audiencia.maxima > maximo) maximo = sala.audiencia.maxima;
    for (const p of paradasDe(sala, ahora)) {
      listaParadas.push(p);
      segundosParados += p.duracionSeg ?? 0;
    }
  }

  listaParadas.sort((a, b) => a.inicioAt - b.inicioAt);
  trayectoria.sort((a, b) => a.at - b.at);
  const duracionMs = primerFixAt ? Math.max(0, (ultimoFixAt || ahora) - primerFixAt) : 0;

  return {
    hash: 'todas',
    vacio: false,
    muestras,
    recorrido: {
      distanciaM: Math.round(distanciaM),
      duracionMs,
      velocidadMediaMs:
        duracionMs > 0 ? Number((distanciaM / (duracionMs / 1000)).toFixed(2)) : 0,
      primerFixAt: primerFixAt || null,
      ultimoFixAt: ultimoFixAt || null,
    },
    paradas: { total: listaParadas.length, segundosParados, lista: listaParadas },
    audiencia: {
      espectadores,
      maximo,
      aLas: ahora,
    },
    trayectoria,
    celdas: mapaCalor({}).celdas,
    generadoAt: ahora,
  };
}

/**
 * Mapa de calor agregado en celdas de `CELDA_HEATMAP_M`, normalizado a 0..1.
 *
 * `peso` combina dos señales: recorrido de la comparsa (1 por fix) y demanda
 * observada (espectadores del stream en esa celda). Se normaliza para que el
 * panel pueda pintar una rampa de color sin conocer los valores crudos.
 */
export function mapaCalor({ roomId, celdaM = CELDA_HEATMAP_M } = {}) {
  const salasSel = roomId ? [salas.get(roomId)].filter(Boolean) : Array.from(salas.values());
  /** @type {Map<string, CeldaHeat>} */
  const agregadas = new Map();
  let max = 0;
  for (const sala of salasSel) {
    for (const celda of sala.celdas.values()) {
      const key = claveCelda(celda.lat, celda.lng, celdaM);
      const previa = agregadas.get(key);
      const peso = (previa?.peso ?? 0) + celda.peso;
      agregadas.set(key, { key, ...centroCelda(key, celdaM), peso, ultima: celda.ultima });
      if (peso > max) max = peso;
    }
  }
  const celdas = Array.from(agregadas.values())
    .map((c) => ({ ...c, peso: Math.round(c.peso), intensidad: max ? c.peso / max : 0 }))
    .sort((a, b) => b.peso - a.peso);
  return { celdaM, max, celdas };
}

/** Listado de salas con datos. Solo la HUELLA: el token nunca sale del relay. */
export function listarSalas() {
  return Array.from(salas.keys()).map((roomId) => {
    const sala = salas.get(roomId);
    return {
      hash: createHashLite(roomId),
      muestras: sala.muestras,
      ultimoFixAt: sala.ultimoFixAt,
      espectadores: sala.audiencia.espectadores,
    };
  });
}

/**
 * Resuelve una huella de sala a la sala real, DENTRO del servidor.
 *
 * Es lo que permite que el panel navegue por salas sin que el token de la
 * comparsa circule nunca hacia el cliente: el navegador solo conoce huellas.
 */
export function resolverPorHash(hash) {
  if (!hash) return null;
  for (const roomId of salas.keys()) {
    if (createHashLite(roomId) === hash) return roomId;
  }
  return null;
}

/** Hash estable y no reversible para etiquetar salas sin filtrar el token. */
function createHashLite(valor) {
  let h = 5381;
  const s = String(valor);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/** Reinicia el estado (tests y despliegues). */
export function reiniciar() {
  salas.clear();
}

/** Exposed para tests: nº de salas vivas. */
export function numSalas() {
  return salas.size;
}

