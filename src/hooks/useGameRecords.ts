/**
 * Récords locales de los minijuegos (localStorage, sin cuentas ni datos personales).
 *
 *  - memory:     menos movimientos es mejor.
 *  - wordsearch: menos segundos es mejor.
 *  - atrapa:     más segundos sobrantes es mejor.
 *
 * Mismo patrón que `useGamesProgress`: caché en módulo + useSyncExternalStore,
 * y escritura defensiva por si el navegador bloquea el almacenamiento.
 */

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pcx_juegos_records_v1';

export type RecordGame = 'memory' | 'wordsearch' | 'atrapa';

export interface GameRecord {
  /** Mejor marca (movimientos, segundos o segundos sobrantes según el juego). */
  best: number;
  /** Veces que se ha superado el juego. */
  wins: number;
}

export type GameRecords = Partial<Record<RecordGame, GameRecord>>;

const LOWER_IS_BETTER: Record<RecordGame, boolean> = { memory: true, wordsearch: true, atrapa: false };

const EMPTY: GameRecords = {};
let cache: GameRecords = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): GameRecords {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as GameRecords;
    const clean: GameRecords = {};
    (Object.keys(LOWER_IS_BETTER) as RecordGame[]).forEach((g) => {
      const r = parsed?.[g];
      if (r && Number.isFinite(r.best) && Number.isFinite(r.wins)) clean[g] = { best: r.best, wins: r.wins };
    });
    return clean;
  } catch {
    return EMPTY;
  }
}

function snapshot(): GameRecords {
  if (!loaded) {
    cache = read();
    loaded = true;
  }
  return cache;
}

function commit(next: GameRecords): void {
  cache = next;
  loaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento: el récord dura lo que dure la sesión.
  }
  listeners.forEach((l) => l());
}

/** Registra una partida ganada. Devuelve `true` si ha batido el récord anterior. */
export function reportRecord(game: RecordGame, value: number): boolean {
  if (!Number.isFinite(value) || value < 0) return false;
  const current = snapshot();
  const previous = current[game];
  const better = !previous || (LOWER_IS_BETTER[game] ? value < previous.best : value > previous.best);
  commit({
    ...current,
    [game]: { best: better ? value : previous!.best, wins: (previous?.wins ?? 0) + 1 },
  });
  // El primer resultado no se celebra como "récord": no hay nada que superar.
  return better && !!previous;
}

export function useGameRecords() {
  const records = useSyncExternalStore(
    useCallback((l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    }, []),
    snapshot,
    () => EMPTY,
  );
  return { records, report: reportRecord };
}
