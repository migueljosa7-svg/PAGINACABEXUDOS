/**
 * Encuadre automatico de la camara sobre la posicion REAL de la comparsa.
 *
 * Va DENTRO del mapa a proposito. Si el `flyTo` se lanzara desde la pagina, la
 * trama SSE suele llegar antes de que el chunk del mapa este montado (el mapa es
 * lazy): `mapRef.current` estaria a null, el reencuadre se perderia para
 * siempre y el mapa se quedaria clavado en el centro por defecto. Aqui el
 * componente vive en el mapa, asi que vuela tanto si la trama llega antes como
 * si llega despues del montaje.
 *
 * `nonce` distingue "llego una posicion nueva" de "sigue la misma posicion":
 * sin el, un array nuevo en cada render provocaria un vuelo continuo.
 *
 * Lo comparten GpsLiveMap (visor en vivo) y RecorridosMap (modo GPS Real).
 */

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

export interface MapAutoFrameProps {
  /** Posicion a la que encuadrar; null = no hacer nada. */
  target: [number, number] | null;
  /** Se vuela una sola vez por valor distinto de nonce. */
  nonce: number;
  /** Zoom del encuadre. */
  zoom: number;
}

const MapAutoFrame: React.FC<MapAutoFrameProps> = ({ target, nonce, zoom }) => {
  const map = useMap();
  const lastNonceRef = useRef(-1);

  useEffect(() => {
    if (!target) return;
    if (lastNonceRef.current === nonce) return;
    lastNonceRef.current = nonce;
    try {
      map.flyTo(target, zoom, { animate: true, duration: 1.2 });
    } catch {
      // En modo reducido o si el navegador no anima, se coloca sin volar.
      map.setView(target, zoom, { animate: false });
    }
  }, [map, target, nonce, zoom]);

  return null;
};

/**
 * Recalcula el tamano del lienzo cuando cambia la capa base.
 *
 * Al sustituir la capa (p. ej. calle -> satelite) Leaflet puede quedarse con las
 * dimensiones antiguas: los tiles no se piden bien y el marcador aparece
 * desplazado respecto a lo que se ve. `invalidateSize` obliga a releer el
 * contenedor. Se hace con un pequeño retardo porque el cambio de `<TileLayer>`
 * ocurre en el mismo commit.
 */
export const MapLayerSizer: React.FC<{ layerKey: string }> = ({ layerKey }) => {
  const map = useMap();
  useEffect(() => {
    const timers = [0, 120, 360].map((delay) =>
      setTimeout(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch {
          /* ignore */
        }
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [map, layerKey]);
  return null;
};

export default MapAutoFrame;
