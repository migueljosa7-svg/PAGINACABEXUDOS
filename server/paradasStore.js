/**
 * GESTOR DE PARADAS DEL RECORRIDO (B2G).
 *
 * Existe para que el Ayuntamiento NO tenga que tocar el codigo: el panel
 * municipal escribe aqui con un clic y el mapa publico lo lee en la siguiente
 * carga, sin redesplegar.
 *
 * ── Por que un modulo aparte ───────────────────────────────────────────────
 * Igual que `municipalAuth.js`: `server.js` arranca un servidor al importarse,
 * asi que su logica no se puede ejercitar desde `scripts/verify-municipio.mjs`.
 * Aqui vive la regla (validar, normalizar, persistir) y las pruebas usan
 * EXACTAMENTE la misma funcion que el servidor.
 *
 * ── Modelo ─────────────────────────────────────────────────────────────────
 *   {
 *     "version": 1,
 *     "actualizadoAt": 1699999999999,
 *     "paradas": {
 *       "<rutaId>": [
 *         { "id": "pilar-1", "nombre": "Plaza del Pilar", "lat": 41.6564,
 *           "lng": -0.8788, "comercioId": "pat-bar-pilar", "activa": true }
 *       ]
 *     }
 *   }
 *
 * El store guarda SOLO lo que el panel ha anadido o modificado encima de la
 * fuente de verdad del bundle (`src/data/singleSource.ts`). Un recorrido sin
 * entrada aqui usa sus paradas estaticas, intactas: asi una entrada corrupta o
 * vacia no puede dejar el mapa entero sin paradas.
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Fichero de datos. `MUNICIPAL_PARADAS_FILE` permite apuntar a otro sitio. */
export const RUTA_PARADAS =
  process.env.MUNICIPAL_PARADAS_FILE || join(__dirname, '..', 'data', 'paradas.json');

/** Version del formato. Si el fichero tiene otra, se descarta y se regenera. */
export const VERSION_PARADAS = 1;

/**
 * Caja de coordenadas de Zaragoza con margen.
 *
 * No es "el concejo de Zaragoza": es un filtro de errores. Fuera de esta caja
 * no hay ninguna parada posible, asi que un `lat: 0` o una cadena pegada se
 * rechazan en vez de mandar el marcador al golfo de Guinea.
 *
 * Coincide a proposito con el `GEOFENCE` del relay (`server.js`): una parada no
 * puede estar fuera del termino donde el propio servidor ya rechaza el GPS. Si
 * estas dos cajas se separaran, el emisor seria rechazado en una parada que el
 * panel si muestra, y el tecnico no tendria donde mirar.
 */
export const CAJA_ZARAGOZA = {
  latMin: 41.4,
  latMax: 41.8,
  lngMin: -1.1,
  lngMax: -0.7,
};

/** Tope de paradas por recorrido: cota de seguridad ante un envio en bucle. */
export const MAX_PARADAS_POR_RUTA = 60;

/** Longitudes maximas: acotan el payload antes de tocar el disco. */
export const MAX_NOMBRE = 80;
export const MAX_ID = 48;

/** Caracteres de control (incluye \r\n y \t) que no deben acabar en un texto. */
const CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g;

/** `id`/`comercioId` admiten un conjunto estrecho: son claves, no texto libre. */
const ID_SEGURA = /^[A-Za-z0-9_-]+$/;

/**
 * Normaliza un identificador, o devuelve '' si no es utilizable.
 *
 * Recortar y filtrar por `ID_SEGURA` en vez de "escapar lo que sea" es
 * deliberado: un id es una clave que se usa para indexar y para comparar en el
 * cliente. Aceptar espacios o acentos como clave garantiza colisiones
 * silenciosas mas adelante.
 */
export function normalizarId(valor, max = MAX_ID) {
  if (valor === undefined || valor === null) return '';
  const v = String(valor).replace(CONTROL, '').trim();
  if (!v || v.length > max || !ID_SEGURA.test(v)) return '';
  return v;
}


/**
 * Valida y normaliza UNA parada.
 *
 * Devuelve `null` si no es utilizable, que es distinto de "sin cambios": un id
 * vacio o unas coordenadas fuera de Zaragoza hacen que la parada se descarte
 * entera, sin escritura parcial. Los campos opcionales (nombre, comercioId,
 * activa) si tienen valor por defecto sensato.
 *
 * @param {unknown} crudo
 * @param {{ catalogo?: Set<string> }} [opciones]
 *   `catalogo` = ids de comercio validos. Si se pasa y el `comercioId` no esta,
 *   la parada se conserva pero SIN comercio: es preferible perder la
 *   asociacion a perder la parada, y asi el tecnico ve el fallo en la UI en
 *   lugar de un hueco en el mapa.
 */
export function normalizarParada(crudo, opciones = {}) {
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return null;

  const id = normalizarId(crudo.id);
  if (!id) return null;

  const lat = acotarNumero(crudo.lat, CAJA_ZARAGOZA.latMin, CAJA_ZARAGOZA.latMax);
  const lng = acotarNumero(crudo.lng, CAJA_ZARAGOZA.lngMin, CAJA_ZARAGOZA.lngMax);
  if (lat === null || lng === null) return null;

  const catalogo = opciones.catalogo;
  let comercioId = normalizarId(crudo.comercioId);
  if (comercioId && catalogo instanceof Set && !catalogo.has(comercioId)) comercioId = '';

  return {
    id,
    nombre: normalizarTexto(crudo.nombre) || id,
    lat,
    lng,
    comercioId,
    activa: crudo.activa === undefined ? true : Boolean(crudo.activa),
  };
}

/** Estructura vacia valida. */
export function storeVacio() {
  return { version: VERSION_PARADAS, actualizadoAt: 0, paradas: {} };
}

/** Un id por parada: la ultima gana (es la que acaba de mover el tecnico). */
function dedupePorId(lista) {
  const porId = new Map();
  for (const p of lista) porId.set(p.id, p);
  return [...porId.values()];
}

/**
 * Lee el store del disco.
 *
 * Devuelve el store vacio ante CUALQUIER problema (no existe, JSON roto,
 * version distinta, forma inesperada). Un fichero ilegible no puede impedir
 * que el mapa publico cargue: el recorrido cae a las paradas estaticas del
 * bundle y el panel muestra la lista vacia para poder reescribirla.
 */
export function leerParadas(ruta = RUTA_PARADAS) {
  try {
    if (!existsSync(ruta)) return storeVacio();
    const crudo = JSON.parse(readFileSync(ruta, 'utf8'));
    if (!crudo || typeof crudo !== 'object') return storeVacio();
    if (crudo.version !== VERSION_PARADAS) return storeVacio();

    const paradas = {};
    for (const [rutaId, lista] of Object.entries(crudo.paradas ?? {})) {
      const limpio = normalizarId(rutaId);
      if (!limpio || !Array.isArray(lista)) continue;
      const validas = lista.map((p) => normalizarParada(p)).filter(Boolean);
      if (validas.length) paradas[limpio] = dedupePorId(validas).slice(0, MAX_PARADAS_POR_RUTA);
    }
    return {
      version: VERSION_PARADAS,
      actualizadoAt: Number.isFinite(crudo.actualizadoAt) ? crudo.actualizadoAt : 0,
      paradas,
    };
  } catch (err) {
    console.warn('[paradas] store ilegible, se usa el vacio:', err.message);
    return storeVacio();
  }
}

/**
 * Escribe el store de forma ATOMICA.
 *
 * Se escribe a `paradas.json.tmp` y se renombra: un corte de luz o un reinicio
 * a mitad de escritura deja el `.tmp` huerfano, pero nunca un `paradas.json`
 * truncado que dejara al mapa sin paradas. `renameSync` es atomico en el mismo
 * sistema de ficheros, que es justo lo que queremos (el fichero esta junto al
 * servidor, no en un volumen compartido).
 */
export function guardarParadas(store, ruta = RUTA_PARADAS) {
  const limpio = {
    version: VERSION_PARADAS,
    actualizadoAt: Date.now(),
    paradas: store?.paradas ?? {},
  };
  mkdirSync(dirname(ruta), { recursive: true });
  const tmp = `${ruta}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(limpio, null, 2)}\n`, 'utf8');
  renameSync(tmp, ruta);
  return limpio;
}

/**
 * Aplica una edicion sobre un recorrido y devuelve el store resultante.
 *
 * Operaciones soportadas (son las que necesita el panel, no un CRUD generico):
 *   - `upsert`  : crea o reemplaza la parada con ese `id`.
 *   - `delete`  : borra la parada con ese `id`.
 *   - `replace` : sustituye la lista completa del recorrido (reordenar).
 *
 * Se opera SIEMPRE sobre una copia y se persiste el resultado entero: las
 * escrituras son de un tecnico a la vez y asi no se puede dejar el store a
 * medias entre un `leer` y un `guardar`.
 *
 * @returns {{ok: boolean, store: object, motivo?: string}}
 */
export function aplicarOperacion(store, operacion) {
  const actual = store?.paradas ?? {};
  const copia = { paradas: { ...actual } };
  const rutaId = normalizarId(operacion?.rutaId);

  if (!rutaId) return { ok: false, store, motivo: 'ruta_invalida' };

  const tipo = String(operacion?.tipo ?? '');

  if (tipo === 'replace') {
    const entrada = operacion.paradas;
    if (!Array.isArray(entrada)) return { ok: false, store, motivo: 'paradas_invalidas' };
    if (entrada.length > MAX_PARADAS_POR_RUTA) {
      return { ok: false, store, motivo: 'demasiadas_paradas' };
    }
    // `replace` exige que TODAS sean validas: es una sustitucion completa de la
    // lista y aceptarla a medias borraria paradas validas sin avisar.
    const validas = entrada.map((p) => normalizarParada(p, operacion.opciones));
    if (validas.some((p) => p === null)) {
      return { ok: false, store, motivo: 'parada_invalida' };
    }
    const lista = dedupePorId(validas);
    if (lista.length) copia.paradas[rutaId] = lista;
    else delete copia.paradas[rutaId];
    return { ok: true, store: copia };
  }

  if (tipo === 'delete') {
    const id = normalizarId(operacion?.id);
    if (!id) return { ok: false, store, motivo: 'id_invalido' };
    const lista = copia.paradas[rutaId];
    if (Array.isArray(lista)) {
      const resto = lista.filter((p) => p.id !== id);
      if (resto.length) copia.paradas[rutaId] = resto;
      else delete copia.paradas[rutaId];
    }
    return { ok: true, store: copia };
  }

  if (tipo === 'upsert') {
    const parada = normalizarParada(operacion?.parada, operacion.opciones);
    if (!parada) return { ok: false, store, motivo: 'parada_invalida' };
    const lista = copia.paradas[rutaId] ?? [];
    const resto = lista.filter((p) => p.id !== parada.id);
    if (resto.length >= MAX_PARADAS_POR_RUTA) {
      return { ok: false, store, motivo: 'demasiadas_paradas' };
    }
    copia.paradas[rutaId] = [...resto, parada];
    return { ok: true, store: copia };
  }

  return { ok: false, store, motivo: 'operacion_desconocida' };
}

/** Vista publica: solo las paradas activas de un recorrido. */
export function paradasActivas(store, rutaId) {
  const id = normalizarId(rutaId);
  if (!id) return [];
  const lista = store?.paradas?.[id];
  if (!Array.isArray(lista)) return [];
  return lista.filter((p) => p.activa);
}


/** Texto legible de una parada: sin controles, sin saltos, longitud acotada. */
export function normalizarTexto(valor, max = MAX_NOMBRE) {
  if (valor === undefined || valor === null) return '';
  return String(valor).replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Numero finito dentro de [min, max]; fuera de rango (o NaN) devuelve null. */
function acotarNumero(valor, min, max) {
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}
