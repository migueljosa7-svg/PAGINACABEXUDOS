import { create } from 'zustand';

/**
 * Avisos de proximidad: el usuario activa "avísame cuando la comparsa esté cerca".
 * Es opt-in y local: la posición del visitante nunca sale de su móvil; solo se
 * compara en el propio dispositivo con la posición pública de la comparsa.
 */
const KEY = 'pcx_proximity_alerts';

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export type ProximityPermission = 'unknown' | 'granted' | 'denied' | 'unsupported';

interface ProximityState {
  enabled: boolean;
  permission: ProximityPermission;
  setEnabled: (value: boolean) => void;
  setPermission: (value: ProximityPermission) => void;
}

export const useProximityAlerts = create<ProximityState>((set) => ({
  enabled: typeof window !== 'undefined' ? readEnabled() : false,
  permission: 'unknown',
  setEnabled: (value) => {
    try {
      window.localStorage.setItem(KEY, value ? '1' : '0');
    } catch {
      // modo privado: el aviso funciona solo durante esta sesión
    }
    set({ enabled: value });
  },
  setPermission: (permission) => set({ permission }),
}));

/** Distancia en metros entre dos coordenadas (Haversine). */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}
