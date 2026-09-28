/**
 * PARADAS DEL RECORRIDO — cliente del gestor B2G.
 *
 * Dos direcciones, un mismo contrato:
 *
 *   - `GET  /api/paradas`          PÚBLICO, sin credencial. Lo usa el mapa de
 *                                  /recorridos: las paradas del desfile ya son
 *                                  información pública (las imprime el programa
 *                                  de fiestas), así que el ciudadano no tiene
 *                                  por qué autenticarse para verlas.
 *   - `POST /api/municipal/paradas` PRIVADO, cabecera `x-panel-token`. Lo usa el
 *                                  panel del Ayuntamiento.
 *
 * ── Por qué las paradas se superponen a las del bundle ─────────────────────
 * `src/data/singleSource.ts` es la fuente de verdad y trae las paradas de serie.
 * El store del servidor solo guarda lo que el técnico ha EDITADO. Por eso
 * `fusionarParadas` no sustituye: si el servidor devuelve una lista, esa lista
 * es la nueva versión de las paradas de ese recorrido; si devuelve vacío (no
 * hay ediciones, o el servidor no está), se quedan las del bundle. Un fallo de
 * red deja el mapa intacto en vez de dejarlo sin paradas.
 */

import { normalizarTokenPanel, PanelError } from './municipalPanel';
import type { Waypoint } from '../data/singleSource';

/** Una parada tal y como la guarda el servidor. */
export interface ParadaGestion {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  /** Comercio asociado (bar, pastelería...). Vacío si no tiene. */
  comercioId: string;
  activa: boolean;
}

/** Respuesta de `GET /api/paradas`. */
export interface RespuestaParadas {
  paradas: Record<string, ParadaGestion[]>;
  actualizadoAt: number;
}

/** Operaciones que acepta el endpoint de escritura. */
export type OperacionParadas =
  | { rutaId: string; tipo: 'upsert'; parada: ParadaGestion }
  | { rutaId: string; tipo: 'delete'; id: string }
  | { rutaId: string; tipo: 'replace'; paradas: ParadaGestion[] };

/**
 * Convierte una parada del servidor en un waypoint del mapa.
 *
 * Se reutiliza el `Waypoint` del bundle (no un tipo nuevo) para que la parada
 * se pueda pintar en `RecorridosMap` sin adaptadores: `calle` es lo que se
 * muestra en el popup y `isStop` la marca como parada oficial frente a un
 * simple punto de paso.
 */
export function paradaAWaypoint(p: ParadaGestion): Waypoint {
  return { lat: p.lat, lng: p.lng, calle: p.nombre, isStop: true };
}

/**
 * Devuelve las paradas EFECTIVAS de un recorrido.
 *
 * Con ediciones del servidor, esas. Sin ediciones (o si la petición falla), las
 * del bundle. Nunca una mezcla implícita: si el técnico ha redefinido la lista,
 * se usa la suya entera, que es lo que espera al ver "su" recorrido.
 */
export function fusionarParadas(
  rutaId: string,
  base: Waypoint[],
  servidor: Record<string, ParadaGestion[]> | null,
): Waypoint[] {
  const editadas = servidor?.[rutaId];
  if (Array.isArray(editadas) && editadas.length > 0) {
    return editadas.filter((p) => p.activa).map(paradaAWaypoint);
  }
  return base.filter((p) => p.isStop);
}

/**
 * Lee las paradas del servidor.
 *
 * Nunca lanza: si el servidor no está, responde 503 (panel sin configurar) o
 * falla la red, devuelve `null`. El llamante lo interpreta como "usa el
 * bundle". Un mapa que no puede cargar las ediciones debe seguir mostrando el
 * recorrido, no una pantalla en blanco.
 */
export async function cargarParadas(
  sinal?: AbortSignal,
): Promise<Record<string, ParadaGestion[]> | null> {
  try {
    const res = await fetch('/api/paradas', { cache: 'no-store', signal: sinal });
    if (!res.ok) return null;
    const tipo = (res.headers.get('content-type') || '').toLowerCase();
    // Una ruta de API nunca debe contestar HTML: si lo hace (proxy delante,
    // service worker viejo), `json()` revienta con `Unexpected token '<'`.
    if (tipo.includes('text/html')) return null;
    const data = (await res.json()) as RespuestaParadas;
    return data && typeof data.paradas === 'object' && data.paradas !== null
      ? data.paradas
      : null;
  } catch {
    return null;
  }
}

/**
 * Aplica una edición desde el panel municipal.
 *
 * A diferencia de `cargarParadas`, aquí SÍ propaga el error: el técnico acaba
 * de mover una parada y necesita saber si se ha guardado, no verse un mapa que
 * parece actualizado y no lo está. Los errores se traducen a los mismos
 * `PanelError` que el resto del panel para que la puerta de acceso y el gestor
 * hablen el mismo idioma.
 */
export async function editarParadas(
  token: string,
  operacion: OperacionParadas,
): Promise<ParadaGestion[]> {
  const cabecera = normalizarTokenPanel(token);
  if (!cabecera) {
    throw new PanelError('no_autorizado', 'Falta la credencial del panel municipal.');
  }

  let res: Response;
  try {
    res = await fetch('/api/municipal/paradas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-panel-token': cabecera },
      body: JSON.stringify(operacion),
      cache: 'no-store',
    });
  } catch {
    throw new PanelError('red', 'No se pudo contactar con el servidor para guardar el cambio.');
  }

  if (res.status === 401 || res.status === 403) {
    throw new PanelError('no_autorizado', 'Credencial incorrecta para el panel municipal.');
  }
  if (res.status === 503) {
    throw new PanelError(
      'no_configurado',
      'El servidor no tiene configurada la credencial del panel (MUNICIPAL_PANEL_TOKEN).',
    );
  }
  if (res.status === 413) {
    throw new PanelError('desconocido', 'El cambio es demasiado grande para guardarlo de una vez.');
  }
  if (!res.ok) {
    // El servidor responde el motivo (`parada_invalida`, `demasiadas_paradas`…)
    // y es mucho más útil que un "error desconocido" para quien lo va a arreglar.
    const cuerpo = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new PanelError('desconocido', `El servidor rechazó el cambio: ${cuerpo?.error ?? res.status}.`);
  }

  const data = (await res.json()) as { paradas?: ParadaGestion[] };
  return Array.isArray(data?.paradas) ? data.paradas : [];
}
