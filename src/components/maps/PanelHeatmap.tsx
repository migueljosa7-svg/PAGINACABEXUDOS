/**
 * Mapa de calor municipal (subárbol lazy).
 *
 * Dibuja dos capas sobre el mismo mapa:
 *   1. La TRAYECTORIA real que ha seguido el emisor (no la ruta prevista): es la
 *      diferencia entre "donde debía ir" y "donde fue", que es justo lo que
 *      necesita el ayuntamiento para planning de calles y tiempo de parada.
 *   2. Las CELDAS de afluencia, como círculos coloreados por intensidad.
 *
 * Sin `leaflet.heat`: se usan `Circle` de react-leaflet, que ya están en el
 * bundle del mapa. Añadir un plugin por un heatmap de 200 celdas sería meter
 * ~10 kB en el chunk del visor a cambio de nada.
 *
 * Las celdas son agregados de 100 m: no identifican a nadie (ver cabecera de
 * `server/municipalAnalytics.js`).
 */

import React, { memo, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, CircleMarker } from 'react-leaflet';
import { getMapLayer, MAP_MAX_ZOOM_HIGH } from './mapLayers';
import type { MapLayerKey } from './mapLayers';
import type { PanelCelda } from '../../services/municipalPanel';

const MAP_MIN_ZOOM = 3;

/**
 * Rampa de color para la intensidad 0..1 (azul frío -> rojo caliente).
 * No se exporta: el archivo solo debe exportar componentes para no romper el
 * Fast Refresh (regla `react-refresh/only-export-components`).
 */
function colorIntensidad(intensidad: number): string {
  const t = Math.max(0, Math.min(1, intensidad));
  // Rampa de 5 paradas; entre ellas se interpola en RGB (suficiente y legible).
  const paradas: Array<[number, number, number]> = [
    [44, 123, 182],
    [0, 166, 202],
    [127, 205, 187],
    [253, 174, 97],
    [215, 25, 28],
  ];
  const escala = (t * (paradas.length - 1));
  const i = Math.min(paradas.length - 2, Math.floor(escala));
  const f = escala - i;
  const a = paradas[i];
  const b = paradas[i + 1];
  const rgb = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

const HeatCell = memo(function HeatCell({ celda, radio }: { celda: PanelCelda; radio: number }) {
  const pathOptions = useMemo(
    () => ({
      color: colorIntensidad(celda.intensidad),
      weight: 1,
      opacity: 0.5,
      fillColor: colorIntensidad(celda.intensidad),
      fillOpacity: 0.25 + 0.4 * celda.intensidad,
    }),
    [celda.intensidad],
  );
  return <Circle center={[celda.lat, celda.lng]} radius={radio} pathOptions={pathOptions} />;
});

export interface PanelHeatmapProps {
  celdas: PanelCelda[];
  /** Trayectoria real recorrida por el emisor. */
  trayectoria: Array<{ lat: number; lng: number }>;
  /** Lado de la celda en metros, para el radio del círculo. */
  celdaM: number;
  center: [number, number];
  layer: MapLayerKey;
}

const PanelHeatmap: React.FC<PanelHeatmapProps> = ({
  celdas,
  trayectoria,
  celdaM,
  center,
  layer,
}) => {
  const base = getMapLayer(layer);
  const radio = celdaM * 0.85;
  const puntos = useMemo<[number, number][]>(
    () => trayectoria.map((p) => [p.lat, p.lng] as [number, number]),
    [trayectoria],
  );

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM_HIGH}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        key={base.key}
        attribution={base.attribution}
        url={base.url}
        maxZoom={base.maxZoom}
      />

      {puntos.length > 1 && (
        <Polyline
          positions={puntos}
          pathOptions={{ color: '#111827', weight: 3, opacity: 0.75 }}
        />
      )}

      {celdas.map((c) => (
        <HeatCell key={c.key} celda={c} radio={radio} />
      ))}

      {puntos.length > 0 && (
        <CircleMarker
          center={puntos[puntos.length - 1]}
          radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#D1121F', fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
};

// memo: el panel municipal refresca cada 15 s con datos nuevos; entre refrescos
// el re-render (por cambio de KPIs, sala o selecciones) no debe re-dibujar el
// arbol de Leaflet ni revalidar celdas.
export default memo(PanelHeatmap);
