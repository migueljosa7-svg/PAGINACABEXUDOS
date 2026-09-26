/**
 * Subarbol de mapa de la pagina Recorridos (chunk lazy).
 *
 * Se carga con `React.lazy` para que `leaflet` (~150 kB) no entre en el bundle
 * de la pagina: los controles, la ficha del recorrido y las metricas pintan
 * antes de descargar el motor de mapas. Beneficio directo en 4G/5G, donde estos
 * 150 kB son segundos de pantalla en blanco.
 *
 * El comportamiento del mapa es identico al que estaba embebido en
 * `Recorridos.tsx`; los iconos se crean aqui (memoizados) en lugar de en la
 * pagina, que es lo que permite que la pagina no importe Leaflet.
 */

import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { createComparsaIcon, comparsaLogoUrl, MapZoomWatcher } from '../mapIcons';
import '../../styles/comparsaMarker.css';

interface MapEventsProps {
  onDragStart: () => void;
}

const MapEventsHandler: React.FC<MapEventsProps> = ({ onDragStart }) => {
  useMapEvents({ dragstart: onDragStart });
  return null;
};

interface AutoFitBoundsProps {
  waypoints: { lat: number; lng: number }[];
  enabled: boolean;
}

const AutoFitBounds: React.FC<AutoFitBoundsProps> = ({ waypoints, enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (!waypoints || waypoints.length < 2) return;
    if (!map || !map.getCenter) return;

    // Defer to next frame to ensure map container is fully rendered
    const frameId = requestAnimationFrame(() => {
      if (!map || !map.getCenter) return;
      const bounds = L.latLngBounds(waypoints.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17, animate: true });
    });

    return () => cancelAnimationFrame(frameId);
  }, [enabled, map, waypoints]);

  return null;
};

const FollowMarker: React.FC<{
  position: [number, number];
  enabled: boolean;
}> = ({ position, enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !position) return;
    if (!map || !map.getCenter) return;

    // Defer to next frame to ensure map container is fully rendered
    const frameId = requestAnimationFrame(() => {
      if (!map || !map.getCenter) return;
      const currentZoom = map.getZoom();
      if (typeof currentZoom !== 'number' || !Number.isFinite(currentZoom)) return;
      map.setView(position, currentZoom, { animate: true });
    });

    return () => cancelAnimationFrame(frameId);
  }, [enabled, map, position]);

  return null;
};

/** Icono de parada oficial (estatico: se crea una sola vez por chunk). */
const STOP_ICON = L.divIcon({
  className: 'custom-map-icon',
  html: `<div class="marker-pin" style="background: hsl(var(--brand-garnet))"><div class="marker-inner-content" style="color: white; font-weight:700; font-size:10px">St</div></div>`,
  iconSize: [24, 34],
  iconAnchor: [12, 34],
});


export interface RecorridosMapProps {
  routeColor: string;
  routeGeometry: { lat: number; lng: number }[];
  stops: { lat: number; lng: number; calle: string; isStop?: boolean }[];
  fitWaypoints: { lat: number; lng: number }[];
  fitBoundsEnabled: boolean;
  comparsaPosition: [number, number] | null;
  comparsaName: string;
  comparsaEmoji: string;
  comparsaZoom: number;
  followCameraEnabled: boolean;
  statusLine: string;
  onDragStart: () => void;
  onFollowMode: () => void;
  onZoomChange: (zoom: number) => void;
}

const RecorridosMap: React.FC<RecorridosMapProps> = ({
  routeColor,
  routeGeometry,
  stops,
  fitWaypoints,
  fitBoundsEnabled,
  comparsaPosition,
  comparsaName,
  comparsaEmoji,
  comparsaZoom,
  followCameraEnabled,
  statusLine,
  onDragStart,
  onFollowMode,
  onZoomChange,
}) => {
  // Icono de la comparsa: memoizado por (nombre, color, zoom) para que el
  // DivIcon no se reconstruya en cada render de la pagina.
  const comparsaIcon = useMemo(
    () => createComparsaIcon(comparsaLogoUrl(comparsaName), {
      zoom: comparsaZoom,
      color: routeColor,
      label: comparsaName,
      fallbackText: comparsaEmoji,
      pulse: true,
    }),
    [comparsaName, comparsaEmoji, routeColor, comparsaZoom]
  );

  return (
    <MapContainer
      center={[41.6568, -0.8783]}
      zoom={15}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <MapEventsHandler onDragStart={onDragStart} />
      <MapZoomWatcher onZoomChange={onZoomChange} />
      {/* Mirror oficial de OpenStreetMap (Alemania): sin marcas de agua
          ni bloqueos 403 por cuota. Gratuito, sin API key. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {/* Follow-mode camera tracking - enabled for both simulation and GPS */}
      {comparsaPosition && <FollowMarker position={comparsaPosition} enabled={followCameraEnabled} />}

      {/* Auto-centering on route change */}
      <AutoFitBounds waypoints={fitWaypoints} enabled={fitBoundsEnabled} />

      {/* Draw Parade Polyline */}
      <Polyline
        positions={routeGeometry.map((p) => [p.lat, p.lng] as [number, number])}
        pathOptions={{ color: routeColor, weight: 6, opacity: 0.8 }}
      />

      {/* Draw Parade Stops */}
      {stops.filter((p) => p.isStop).map((stop, index) => (
        <Marker
          key={index}
          position={[stop.lat, stop.lng]}
          icon={STOP_ICON}
        >
          <Popup>
            <div style={{ fontWeight: 800 }}>📌 Parada Oficial</div>
            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--color-text-primary))' }}>
              {stop.calle}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-secondary))', marginTop: '4px' }}>
              La comparsa realiza un baile especial aquí.
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Draw Animated Comparsa/Cabezudo Marker */}
      {comparsaPosition && (
        <Marker
          key="comparsa-marker-posicion"
          position={comparsaPosition}
          icon={comparsaIcon}
          eventHandlers={{ click: onFollowMode }}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{comparsaEmoji}</div>
              <div style={{ fontWeight: 800, color: 'hsl(var(--color-primary))' }}>
                {comparsaName}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{statusLine}</div>
              <button
                className="btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.7rem', marginTop: '8px', borderRadius: '4px' }}
                onClick={onFollowMode}
              >
                Centrar Cámara
              </button>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default RecorridosMap;
