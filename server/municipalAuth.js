/**
 * CREDENCIAL DEL PANEL MUNICIPAL (B2G) — saneamiento y comparación.
 *
 * Existe como módulo aparte, y no como tres líneas dentro de `server.js`, por
 * una razón práctica: `server.js` arranca un servidor al importarse, así que
 * su lógica de autenticación no se puede ejercitar en las pruebas
 * (`scripts/verify-municipio.mjs`). Aquí vive la regla, y tanto el servidor
 * como las pruebas usan EXACTAMENTE la misma función. Si el servidor sanea y el
 * test sanea distinto, el test no prueba nada.
 *
 * ── Por qué el saneamiento ──────────────────────────────────────────────────
 * `MUNICIPAL_PANEL_TOKEN` se escribe a mano en el panel de Render y se pega
 * desde documentación, correo o terminal. Lo que llega de verdad es, con
 * mucha frecuencia:
 *
 *   MUNICIPAL_PANEL_TOKEN="a1b2c3"      comillas literales
 *   '  a1b2c3  '                        espacios
 *   a1b2c3\n                            salto de línea final
 *   MUNICIPAL_PANEL_TOKEN=a1b2c3        la asignación pegada con el valor
 *   a1b2c3\u200b                        zero-width de un copiado de PDF/chat
 *
 * El fallo que producían era el peor posible: el operador veía la variable
 * "puesta" en el panel de Render, el panel pedía la credencial y el servidor
 * respondía 503 (`panel_no_configurado`) sin una sola línea en el log que
 * explicara por qué. Aquí la credencial se normaliza en AMBAS puntas —la que
 * viene de `process.env` y la que viene de la cabecera— y `server.js` distingue
 * con claridad "no configurada" (503) de "configurada pero incorrecta" (401).
 *
 * Sin dependencias: lo importa `server.js` (Node ESM) y lo ejercita
 * `scripts/verify-municipio.mjs`, sin necesidad del navegador ni del servidor.
 */

import { createHash, timingSafeEqual } from 'crypto';

/**
 * Caracteres que NO deben formar parte de una credencial pero se cuelan al
 * copiar y pegar: controles (incluye \r\n y \t), espacios no separables,
 * zero-width, marcas de dirección (pegar desde un doc de Word las mete) y el
 * BOM. Todos son invisibles: por eso el 503 era tan difícil de diagnosticar.
 */
const INVISIBLES = /[\u0000-\u001F\u007F-\u009F\u00A0\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060\uFEFF]/g;

/** `MUNICIPAL_PANEL_TOKEN=valor` o `export MUNICIPAL_PANEL_TOKEN="valor"`. */
const ASIGNACION = /^(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*([\s\S]*)$/;

/**
 * Normaliza una credencial a su forma canónica.
 *
 * Quita invisibles, recorta espacios, resuelve el `CLAVE=valor` pegado por
 * error y desenvuelve comillas. Idempotente: sanear(sanear(x)) === sanear(x),
 * que es lo que permite aplicarlo en la variable de entorno y en la cabecera
 * sin miedo a "limpiar dos veces".
 *
 * Devuelve `''` si no queda nada utilizable: ese `''` es lo que permite
 * distinguir "no configurado" (503) de "configurado" (401).
 */
export function saneaToken(valor) {
  if (valor === undefined || valor === null) return '';
  let v = String(valor).replace(INVISIBLES, '').trim();

  // `MUNICIPAL_PANEL_TOKEN=abc` pegado en el campo de valor de Render.
  const asignacion = ASIGNACION.exec(v);
  if (asignacion) v = asignacion[1].replace(INVISIBLES, '').trim();

  // Comillas envolventes. Dos pasadas: `""abc""` aparece al copiar de un
  // documento que ya traía las comillas y añadirlas otra vez al pegarlas.
  for (let i = 0; i < 2; i++) {
    const comillas = COMILLAS.exec(v);
    if (!comillas) break;
    v = comillas[2].replace(INVISIBLES, '').trim();
  }

  return v.replace(INVISIBLES, '').trim();
}

/**
 * Lee la credencial del servidor distinguiendo los tres estados que antes se
 * confundían en un único `|| ''`:
 *
 *   - `presente: true`  → hay credencial utilizable: el 401 es la respuesta
 *     correcta para cualquier token que no coincida.
 *   - `presente: false, motivo: 'ausente'` → la variable NO existe: 503.
 *   - `presente: false, motivo: 'vacia'`   → existe pero solo tiene basura
 *     (comillas, espacios, un `=`): 503, y el aviso del log dice cuál es.
 *
 * Se lee en CADA petición, no al cargar el módulo: es una lectura de un objeto
 * ya materializado, y así un cambio de variable se nota en el log de arranque
 * y en las pruebas sin depender del orden de arranque del módulo.
 */
export function leerTokenConfigurado(env = process.env) {
  const bruto = env ? env.MUNICIPAL_PANEL_TOKEN : undefined;
  if (bruto === undefined || bruto === null) {
    return { presente: false, token: '', motivo: 'ausente' };
  }
  const token = saneaToken(bruto);
  if (!token) return { presente: false, token: '', motivo: 'vacia' };
  return { presente: true, token, motivo: 'ok' };
}

/** Primer valor si la cabecera llegó repetida (`headers[k]` puede ser array). */
function primero(valor) {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Extrae la credencial de la petición, aceptando las cabeceras que un panel
 * municipal puede usar de verdad. La canónica sigue siendo `x-panel-token`;
 * `x-municipal-token` y `Authorization: Bearer` se aceptan como alias para que
 * un cliente curl/Postman no tenga que conocer un nombre interno del proyecto.
 */
export function extraerTokenCabecera(headers = {}) {
  const h = headers || {};
  const directo = primero(h['x-panel-token']) ?? primero(h['x-municipal-token']);
  if (directo !== undefined && directo !== null && String(directo) !== '') {
    return saneaToken(directo);
  }
  const autorizacion = primero(h['authorization']);
  if (autorizacion !== undefined && autorizacion !== null && String(autorizacion) !== '') {
    const bearer = /^Bearer\s+([\s\S]*)$/i.exec(String(autorizacion).trim());
    return saneaToken(bearer ? bearer[1] : autorizacion);
  }
  return '';
}

/**
 * Comparación en tiempo constante, a través de SHA-256.
 *
 * `timingSafeEqual` exige buffers del MISMO tamaño: comparar longitudes antes
 * filtra la longitud por temporización, y si se le pasan dos longitudes
 * distintas lanza. Hashear ambos lados devuelve siempre 32 bytes, así que la
 * comparación no puede fallar ni delatar nada, y una credencial vacía nunca
 * autoriza a nadie aunque la del servidor fuera vacía.
 *
 * Sanea AMBOS lados aquí, aunque quien llame ya lo haya hecho: es la última
 * barrera y garantiza la invariante "se compara siempre el valor canónico"
 * aunque mañana aparezca un tercer punto de entrada que se olvide de hacerlo.
 */
export function compararTokens(a, b) {
  const pa = saneaToken(a);
  const pb = saneaToken(b);
  if (!pa || !pb) return false;
  const da = createHash('sha256').update(pa, 'utf8').digest();
  const db = createHash('sha256').update(pb, 'utf8').digest();
  return timingSafeEqual(da, db);
}

/** Un par de comillas que envuelve TODO el valor: `"abc"` o `'abc'`. */
const COMILLAS = /^(['"])([\s\S]*)\1$/;
