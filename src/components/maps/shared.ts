/**
 * Datos visuales compartidos entre la pagina del visor y su subarbol de mapa.
 *
 * Este modulo NO importa Leaflet en tiempo de ejecucion (solo tipos). Es
 * justamente lo que permite que `GpsLive.tsx` se cargue y pinte su panel de
 * estado sin arrastrar todavia los ~150 kB de `map-vendor`: los componentes de
 * mapa se descargan despues, con `React.lazy`.
 *
 * Si se anadiera aqui un `import L from 'leaflet'` (sin `import type`), el
 * chunk de leaflet volveria a ser estatico de la pagina y se perderia el
 * code-splitting.
 */

/** Posicion vigente de un emisor, tal y como la entrega el relay. */
export interface SenderPosition {
  senderId: string;
  label: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
  lastSeen: number;
}

/** Un emisor sin tramas durante este margen se considera perdido. */
export const GPS_TIMEOUT_MS = 15000; // Consider sender lost after 15s no data

/** Paleta maxima de emisores simultaneos (se recicla por indice). */
export const SENDER_COLORS = [
  '#D1121F', '#0288D1', '#2E7D32', '#F57C00',
  '#7B1FA2', '#00838F', '#C62828', '#1565C0',
  '#558B2F', '#E65100', '#4527A0', '#00695C',
];

/** Color estable del emisor por indice. */
export function getSenderColor(index: number): string {
  return SENDER_COLORS[index % SENDER_COLORS.length];
}

// Formato numerico es-ES (instanciados una sola vez; tabular-nums en CSS)
export const fmtEsInt = new Intl.NumberFormat('es-ES');
export const fmtEsDecimal = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
