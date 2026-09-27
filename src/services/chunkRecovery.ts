/**
 * Recuperacion de chunks rotos tras un despliegue (PWA + code splitting).
 *
 * El sintoma clasico, y el que motivo este modulo:
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "text/html"
 *   Uncaught TypeError: Failed to fetch dynamically imported module:
 *   https://.../assets/Recorridos-<hash>.js
 *
 * Que ocurre: la PWA tiene un `index.html` de un despliegue ANTERIOR precacheado
 * por Workbox (o cacheado por el navegador). Ese HTML apunta a chunks cuyo hash
 * ya no existe en el servidor. Al navegar, `React.lazy` pide ese chunk, el
 * servidor devuelve 404 y el `import()` falla. Como no hay error boundary, React
 * desmonta el arbol y la pagina queda en BLANCO hasta que el usuario hace un
 * hard refresh a mano.
 *
 * Este modulo hace que la app se repare sola, sin intervencion del usuario: al
 * detectar el fallo borra la precache obsoleta, da de baja el service worker que
 * la servia y recarga una sola vez. La recarga es imprescindible: sin ella el
 * `index.html` viejo sigue cacheado y volveria a pedir el mismo chunk muerto.
 *
 * Dos guardas evitan el bucle de recarga infinita:
 *   1. Un flag en `sessionStorage` limita la recuperacion a UNA recarga por
 *      pestana. Si tras recargar el chunk sigue roto, no se reintenta.
 *   2. El flag se borra en cuanto un chunk carga bien, de modo que un
 *      despliegue posterior si puede recuperarse en esa misma pestana.
 *
 * El HTML cacheado ya no es la causa principal: `server.js` responde 404 real a
 * los archivos inexistentes y sirve el HTML de la SPA con `no-cache`. Esto es la
 * red de seguridad para lo que ya quedara instalado (PWA abierta, pestanas
 * largas en segundo plano, service workers de despliegues previos).
 *
 * Modulo sin dependencias de React mas alla de `lazy`, para que `App.tsx` solo
 * tenga que sustituir `lazy(` por `lazyWithRecovery(`.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** Clave del flag anti-bucle. Vive en sessionStorage: sobrevive a recargas. */
const RECOVERY_FLAG_KEY = 'pcx:chunk-recovery';

/**
 * Caches de runtime que se conservan al purgar.
 *
 * `osm-tiles` son los teselas del mapa en CacheFirst (ver vite.config.ts):
 * borrarlas costaria al usuario la descarga completa del mapa en su siguiente
 * visita sin ganar nada, porque no contienen HTML ni codigo obsoleto.
 */
const PRESERVED_CACHES = new Set(['osm-tiles']);

/**
 * Mensajes que los navegadores usan al fallar un `import()` dinamico.
 * Se cubren los tres motores (Chromium, Firefox, Safari) y el caso de Vite en
 * desarrollo. `error.message` es la unica pista fiable: la promesa falla sin
 * codigo de error propio.
 */
const CHUNK_ERROR_PATTERNS: RegExp[] = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /loading chunk \d+ failed/i,
  /chunkloaderror/i,
];

/** ¿Este error es un fallo de carga de chunk (y no un error real del modulo)? */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/** Lectura segura: sessionStorage lanza en iframes sandbox y en modo privado. */
function readRecoveryFlag(): string | null {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG_KEY);
  } catch {
    return null;
  }
}

function writeRecoveryFlag(): void {
  try {
    sessionStorage.setItem(RECOVERY_FLAG_KEY, 'done');
  } catch {
    /* sin persistencia: la recarga se limita a esta pestana de todas formas */
  }
}

/** Un chunk cargo bien: la sesion es sana y vuelve a poder autorepararse. */
function clearRecoveryFlag(): void {
  try {
    sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch {
    /* idem */
  }
}

/** Borra las caches de la app (precache obsoleta) y conserva los teselas. */
async function purgeStaleAppCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => !PRESERVED_CACHES.has(name))
        .map((name) => caches.delete(name)),
    );
  } catch {
    /* best effort: la recarga sigue valiendo la pena aunque falle la purga */
  }
}

/**
 * Da de baja los service workers, que son los que siguen sirviendo la precache
 * vieja. Sin esto la recarga volveria a caer en el `index.html` obsoleto.
 */
async function unregisterServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    /* best effort */
  }
}

/**
 * Punto de entrada de la recuperacion: purga y recarga, como mucho una vez por
 * pestana. Es fire-and-forget; si la recarga ocurre, el `throw` del llamante
 * nunca llega a pintarse.
 */
function recoverFromStaleChunk(): void {
  if (readRecoveryFlag()) return;
  writeRecoveryFlag();

  void (async () => {
    await purgeStaleAppCaches();
    await unregisterServiceWorkers();
    location.reload();
  })();
}

/**
 * `React.lazy` con autoreparacion ante chunks rotos.
 *
 * Sustituto directo de `lazy(...)`: misma firma (misma inferencia de tipos que
 * `React.lazy`, para no tocar ninguna declaracion de `App.tsx`), mismo
 * componente. Si el `import()` falla por un chunk obsoleto, limpia el estado
 * cacheado y recarga. Cualquier otro error (datos invalidos, bug real) se
 * propaga sin tocar nada, para no ocultar fallos de desarrollo bajo una recarga
 * automatica.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRecovery<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await factory();
      clearRecoveryFlag();
      return module;
    } catch (error) {
      if (isChunkLoadError(error)) {
        recoverFromStaleChunk();
      }
      throw error;
    }
  });
}
