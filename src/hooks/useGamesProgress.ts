/**
 * Progreso de la seccion de juegos: estrellas, racha diaria y logros.
 *
 * Se guarda en localStorage (no hay backend ni cuentas para el público infantil)
 * con dos cuidados:
 *   1. ESCRITURA DEFENSIVA: si el navegador bloquea localStorage (modo privado
 *      en algunos moviles, politicas de cookies), la app NO se rompe. simplesmente
 *      funciona en memoria durante la sesion.
 *   2. ESQUEMA VERSIONADO: si se anaden campos, la clave cambia de sufijo y no
 *      se intenta migrar datos viejos con forma distinta.
 *
 * `useSyncExternalStore` mantiene la racha y las estrellas al dia en la
 * cabecera sin tener que releer el almacenamiento.
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pcx_juegos_v1';

/** Estrellas por logro, para que el marcador tenga sentido. */
export const STARS = {
  riddle: 1,
  memory: 3,
  wordsearch: 2,
} as const;

export type GameId = keyof typeof STARS;

export interface GamesProgress {
  stars: number;
  /** Dia (AAAA-MM-DD) en el que se resolvio algo por ultima vez. */
  lastPlayedDay: string;
  /** Racha de dias consecutivos jugando. */
  streak: number;
  /** Ids de retos de adivinanza ya superados (uno por dia). */
  solvedRiddles: string[];
}

const EMPTY: GamesProgress = {
  stars: 0,
  lastPlayedDay: '',
  streak: 0,
  solvedRiddles: [],
};

function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

function readStorage(): GamesProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<GamesProgress>;
    return {
      stars: typeof parsed.stars === 'number' && parsed.stars >= 0 ? parsed.stars : 0,
      lastPlayedDay: typeof parsed.lastPlayedDay === 'string' ? parsed.lastPlayedDay : '',
      streak: typeof parsed.streak === 'number' && parsed.streak >= 0 ? parsed.streak : 0,
      solvedRiddles: Array.isArray(parsed.solvedRiddles) ? parsed.solvedRiddles : [],
    };
  } catch {
    return EMPTY;
  }
}

function writeStorage(value: GamesProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Almacenamiento no disponible: se pierde la persistencia, no la sesion.
  }
}

// Caché en modulo: evita releer/parsear el JSON en cada snapshot.
let cache: GamesProgress = EMPTY;
let cacheLoaded = false;
const listeners = new Set<() => void>();

function getSnapshot(): GamesProgress {
  if (!cacheLoaded) {
    cache = readStorage();
    cacheLoaded = true;
  }
  return cache;
}

function getServerSnapshot(): GamesProgress {
  return EMPTY;
}

function emit(): void {
  listeners.forEach((l) => l());
}

function setProgress(next: GamesProgress): void {
  cache = next;
  cacheLoaded = true;
  writeStorage(next);
  emit();
}

/**
 * Suma estrellas por jugar, actualizando la racha. Devuelve el progreso nuevo.
 * `reward` a 0 solo refresca la racha del día (visita sin reto superado).
 */
function award(current: GamesProgress, reward: number, day: string): GamesProgress {
  const last = current.lastPlayedDay;
  let streak = current.streak;

  if (last !== day) {
    // Racha: si el ultimo día fue ayer, continua; si no, se reinicia en 1.
    const gap = last ? daysBetween(last, day) : Infinity;
    streak = gap === 1 ? current.streak + 1 : 1;
  }

  return {
    stars: current.stars + reward,
    lastPlayedDay: last === day ? current.lastPlayedDay : day,
    streak,
    solvedRiddles: current.solvedRiddles,
  };
}

export interface GamesProgressApi {
  progress: GamesProgress;
  /** Registra un acierto y suma sus estrellas. */
  complete: (game: GameId, uniqueKey?: string) => void;
  /** Suma estrellas sin marcar un reto concreto (racha diaria). */
  touch: () => void;
  /** `true` si ese reto ya se supero (para no volver a pagar estrellas). */
  hasSolved: (uniqueKey: string) => boolean;
  reset: () => void;
}

export function useGamesProgress(): GamesProgressApi {
  const progress = useSyncExternalStore(
    useCallback((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }, []),
    getSnapshot,
    getServerSnapshot,
  );

  const complete = useCallback((game: GameId, uniqueKey?: string) => {
    const current = getSnapshot();
    const day = todayKey();

    // Un reto ya superado no vuelve a cobrar estrellas.
    if (uniqueKey) {
      if (current.solvedRiddles.includes(uniqueKey)) return;
      setProgress({
        ...award(current, STARS[game], day),
        solvedRiddles: [...current.solvedRiddles, uniqueKey],
      });
      return;
    }
    setProgress(award(current, STARS[game], day));
  }, []);

  const touch = useCallback(() => {
    setProgress(award(getSnapshot(), 0, todayKey()));
  }, []);

  const hasSolved = useCallback(
    (uniqueKey: string) => getSnapshot().solvedRiddles.includes(uniqueKey),
    [],
  );

  const reset = useCallback(() => {
    setProgress(EMPTY);
  }, []);

  return { progress, complete, touch, hasSolved, reset };
}

export { todayKey };
