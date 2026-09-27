/**
 * Cliente del panel municipal (B2G).
 *
 * Contrato con `server.js` (`/api/municipal/*`):
 *   - El token va en la cabecera `x-panel-token`, NUNCA en la query: una query
 *     acaba en los logs de acceso y en el `Referer` de la siguiente petición.
 *   - `sala` viaja como HUELLA de 8 hex (`hash`), no como token de comparsa: el
 *     navegador nunca ve la credencial del emisor.
 *   - Sin `MUNICIPAL_PANEL_TOKEN` en el servidor, la API responde 503 y este
 *     módulo lo traduce a un mensaje accionable, no a un error genérico.
 *
 * El token vive en `sessionStorage` (se pierde al cerrar la pestaña) y
 * en memoria durante la sesión. Nunca en `localStorage`: un panel de gestión
 * municipal no debe sobrevivir a que cierre el portátil la ETS.
 */

const TOKEN_KEY = 'paginacabexudos.panel.token';

export type PanelErrorCode =
  | 'no_configurado'
  | 'no_autorizado'
  | 'sin_datos'
  | 'red'
  | 'desconocido';

export class PanelError extends Error {
  readonly code: PanelErrorCode;
  constructor(code: PanelErrorCode, message: string) {
    super(message);
    this.name = 'PanelError';
    this.code = code;
  }
}

export interface PanelCelda {
  key: string;
  lat: number;
  lng: number;
  peso: number;
  intensidad: number;
}

export interface PanelParada {
  lat: number;
  lng: number;
  inicioAt: number;
  finAt: number | null;
  duracionSeg: number | null;
  enCurso: boolean;
}

export interface PanelResumen {
  hash: string;
  vacio: boolean;
  muestras: number;
  recorrido: {
    distanciaM: number;
    duracionMs: number;
    velocidadMediaMs: number;
    primerFixAt: number | null;
    ultimoFixAt: number | null;
  };
  paradas: {
    total: number;
    segundosParados: number;
    lista: PanelParada[];
  };
  audiencia: {
    espectadores: number;
    maximo: number;
    aLas: number | null;
  };
  trayectoria: Array<{ lat: number; lng: number; at: number }>;
  celdas: PanelCelda[];
  generadoAt: number;
}

export interface PanelSala {
  hash: string;
  muestras: number;
  ultimoFixAt: number;
  espectadores: number;
}

/** Lee el token de la sesión. */
export function leerTokenPanel(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Guarda el token SOLO en la sesión actual. */
export function guardarTokenPanel(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Almacenamiento no disponible (modo privado): el token queda solo en RAM.
  }
}

/** Valida el formato del token: alfanumérico, guiones y guiones bajos. */
export function tokenPanelValido(token: string): boolean {
  return /^[A-Za-z0-9_-]{8,128}$/.test((token || '').trim());
}

/** GET JSON con el token del panel, mapeando los errores a `PanelError`. */
async function pedir<T>(ruta: string, token: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(ruta, window.location.origin);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'x-panel-token': token },
      cache: 'no-store',
    });
  } catch {
    throw new PanelError('red', 'No se pudo contactar con el servidor de analítica.');
  }

  if (res.status === 401) {
    throw new PanelError('no_autorizado', 'Credencial incorrecta para el panel municipal.');
  }
  if (res.status === 503) {
    throw new PanelError(
      'no_configurado',
      'El panel no está configurado en el servidor (falta MUNICIPAL_PANEL_TOKEN).',
    );
  }
  if (!res.ok) {
    throw new PanelError('desconocido', `El servidor respondió ${res.status}.`);
  }
  return (await res.json()) as T;
}

/** Resumen de una sala concreta (por huella). */
export function obtenerResumen(token: string, hash?: string): Promise<PanelResumen> {
  return pedir<PanelResumen>('/api/municipal/resumen', token, hash ? { sala: hash } : {});
}

/** Listado de salas con datos, para el selector del panel. */
export async function obtenerSalas(token: string): Promise<PanelSala[]> {
  const data = await pedir<{ salas: PanelSala[] }>('/api/municipal/salas', token);
  return data.salas ?? [];
}
