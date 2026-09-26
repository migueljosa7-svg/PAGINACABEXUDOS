/**
 * Subarbol de mapa del visor GPS en vivo (chunk lazy).
 *
 * Se descarga con `React.lazy` DESPUES de que la pagina haya pintado su panel
 * de estado. Es el unico consumidor de `leaflet` del visor, de modo que los
 * ~150 kB de `map-vendor` ya no bloquean el primer pintado en redes moviles
 * (4G/5G): el usuario ve estado, telemetria y participantes de inmediato, y el
 * mapa se monta despues.
 *
 * Comportamiento identico al que estaba embebido en `GpsLive.tsx`: la
 * extraccion es reorganizacion de codigo, sin cambios de renderizado.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap, Popup, Polyline, Circle } from 'react-leaflet';
import { createComparsaIcon, comparsaLogoUrl, MapZoomWatcher } from '../mapIcons';
import MapLayerSwitch from './MapLayerSwitch';
import { getMapLayer, MAP_MAX_ZOOM_HIGH } from './mapLayers';
import type { MapLayerKey } from './mapLayers';
import '../../styles/comparsaMarker.css';
import { POI_CATEGORY_COLOR, POI_CATEGORY_GLYPH, POI_CATEGORY_LABEL } from '../../data/pois';
import type { StaticPOI, PoiCategory } from '../../data/pois';
import { senderPulseActive } from '../../hooks/useGpsLiveStatus';
import { isMarkerPulseActive } from '../../services/gpsStatus';
import type { GpsLiveStatusContext } from '../../services/gpsStatus';
import { GPS_TIMEOUT_MS, getSenderColor } from './shared';
import type { SenderPosition } from './shared';

const SMOOTH_FACTOR = 0.15; // Lerp factor for smooth animation (lower = smoother)
// v3.1: umbrales de convergencia del RAF (mismos que los snaps originales)
const POSITION_EPSILON_DEG = 0.000001; // ~0.11 m en latitud
const HEADING_EPSILON_DEG = 1;
// Map zoom configuration - similar to Google Maps
const MAP_MIN_ZOOM = 3;
const MAP_MAX_ZOOM = MAP_MAX_ZOOM_HIGH;
const MAP_ZOOM_SNAP = 1;
const MAP_ZOOM_DELTA = 1;
/** Zoom del reencuadre automatico: calle a detalle, sin perder el contexto. */
const FRAME_ZOOM = 17;


// =============================================================================
// Smooth Marker Component
// =============================================================================

interface SmoothMarkerProps {
  position: [number, number];
  icon: L.DivIcon;
  heading: number;
  onClick?: () => void;
  enabled?: boolean;
}

const SmoothMarker: React.FC<SmoothMarkerProps> = ({ position, icon, heading, onClick, enabled = true }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const currentPos = useRef<[number, number]>(position);
  const targetPos = useRef<[number, number]>(position);
  const animFrameRef = useRef<number | null>(null);
  const currentHeading = useRef<number>(heading);
  const targetHeading = useRef<number>(heading);
  // Ultima version de `animate`, para que el ciclo de RAF se auto-reeinvocable
  // sin capturar un closure obsoleto (el callback depende de `enabled`).
  const animateRef = useRef<() => void>(() => {});

  // Animate smoothly towards target
  const animate = useCallback(() => {
    const [curLat, curLng] = currentPos.current;
    const [targetLat, targetLng] = targetPos.current;

    const newLat = curLat + (targetLat - curLat) * SMOOTH_FACTOR;
    const newLng = curLng + (targetLng - curLng) * SMOOTH_FACTOR;

    // Smooth heading rotation
    let newHeading = currentHeading.current + (targetHeading.current - currentHeading.current) * SMOOTH_FACTOR;

    // Normalize heading to 0-360
    while (newHeading < 0) newHeading += 360;
    while (newHeading >= 360) newHeading -= 360;

    // If close enough, snap to target (v3.1: deteccion explicita de convergencia)
    const reachedPosition = Math.abs(newLat - targetLat) < POSITION_EPSILON_DEG
      && Math.abs(newLng - targetLng) < POSITION_EPSILON_DEG;
    if (reachedPosition) {
      currentPos.current = [targetLat, targetLng];
    } else {
      currentPos.current = [newLat, newLng];
    }

    // Snap heading if close enough
    const reachedHeading = Math.abs(newHeading - targetHeading.current) < HEADING_EPSILON_DEG;
    if (reachedHeading) {
      currentHeading.current = targetHeading.current;
    } else {
      currentHeading.current = newHeading;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng(currentPos.current);
      // Apply rotation to the marker element
      const element = markerRef.current.getElement();
      if (element) {
        const iconElement = element.querySelector('.comparsa-marker-ring') as HTMLElement;
        if (iconElement) {
          iconElement.style.transform = `rotate(${currentHeading.current}deg)`;
        }
      }
    }

    // v3.1: si el marcador quedo fuera de viewport, no sigo interpolando.
    // El efecto de nueva posicion o de habilitacion lo volvera a arrancar.
    if (!enabled) {
      animFrameRef.current = null;
      return;
    }

    // v3.1: convergencia -> detiene el ciclo RAF (0 trabajo en reposo). El effect
    // de nueva posicion lo relanza al llegar otro target (animFrameRef null).
    if (reachedPosition && reachedHeading) {
      animFrameRef.current = null;
      return;
    }
    // Se reenvia a traves de una ref: la funcion se referencia a si misma para
    // encadenar el siguiente frame, y acceder a `animate` dentro de su propio
    // inicializador lo capturaria obsoleto en cuanto cambiara `enabled`.
    animFrameRef.current = requestAnimationFrame(() => animateRef.current());
  }, [enabled]);

  // Se sincroniza antes que el efecto que agenda el primer frame (los efectos se
  // ejecutan en orden de declaracion), de modo que nunca hay un RAF con null.
  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);


  // Update target when position changes.
  // Si el marcador esta fuera del viewport (enabled=false) no se interpola:
  // se posiciona en el target de forma inmediata y el loop se detiene.
  useEffect(() => {
    targetPos.current = position;
    targetHeading.current = heading;

    if (!enabled) {
      if (markerRef.current) {
        markerRef.current.setLatLng(position);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [position, heading, enabled, animate]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={currentPos.current}
      icon={icon}
      eventHandlers={onClick ? { click: onClick } : undefined}
    >
      <Popup>
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>
            Última posición recibida
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Lat: {position[0].toFixed(6)}<br />
            Lng: {position[1].toFixed(6)}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// =============================================================================
// Map Controller Component - handles mobile rendering and follow mode
// =============================================================================

/**
 * Encuadre automatico sobre la posicion REAL emitida por el movil.
 *
 * Va DENTRO del mapa a proposito. Si el `flyTo` se lanzara desde la pagina, la
 * trama SSE suele llegar antes de que el chunk del mapa este montado (el visor
 * conecta al montar y el mapa es lazy): `mapRef.current` estaria a null, el
 * reencuadre se perderia para siempre y el mapa se quedaria clavado en el
 * centro por defecto. Aqui, en cambio, el componente vive en el mapa: si llega
 * tarde lo hace al montarse, y si llega antes lo hace en cuanto existe.
 *
 * `nonce` fuerza el reencuadre: es lo que distingue "llego una posicion nueva"
 * de "sigue la misma posicion", ya que un array nuevo en cada render dispararia
 * un vuelo continuo.
 */
interface MapAutoFrameProps {
  target: [number, number] | null;
  nonce: number;
  zoom: number;
}

const MapAutoFrame: React.FC<MapAutoFrameProps> = ({ target, nonce, zoom }) => {
  const map = useMap();
  const lastNonceRef = useRef(-1);

  useEffect(() => {
    if (!target) return;
    // nonce 0 = "nunca se ha reencuadrado": se vuela una sola vez por peticion.
    if (lastNonceRef.current === nonce) return;
    lastNonceRef.current = nonce;
    try {
      map.flyTo(target, zoom, { animate: true, duration: 1.2 });
    } catch {
      // En modo reducido o sin animacion, se coloca sin volar.
      map.setView(target, zoom, { animate: false });
    }
  }, [map, target, nonce, zoom]);

  return null;
};

interface MapControllerProps {
  followMode: boolean;
  followPosition: [number, number] | null;
  mapRef: React.RefObject<L.Map | null>;
}

const MapController: React.FC<MapControllerProps> = ({ followMode, followPosition, mapRef }) => {
  const map = useMap();

  // Store map reference
  useEffect(() => {
    if (mapRef) {
      (mapRef as React.MutableRefObject<L.Map | null>).current = map;
    }
  }, [map]);

  // Handle mobile rendering - invalidateSize on mount and when container resizes
  useEffect(() => {
    // Initial invalidate size after map is ready
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Handle visibility change (when user switches tabs and returns)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => map.invalidateSize(), 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Use ResizeObserver to detect container size changes (mobile orientation, etc.)
    const mapContainer = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainer);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
    };
  }, [map]);

  // Follow mode with smooth panTo
  useEffect(() => {
    if (followMode && followPosition && mapRef.current) {
      const mapInstance = mapRef.current;
      const currentCenter = mapInstance.getCenter();
      const newCenter = L.latLng(followPosition[0], followPosition[1]);

      // Only pan if moved more than ~10 meters to avoid micro-adjustments
      const distance = currentCenter.distanceTo(newCenter);
      if (distance > 10) {
        mapInstance.panTo(followPosition, { animate: true, duration: 0.5 });
      }
    }
  }, [followMode, followPosition, mapRef]);

  return null;
};

// =============================================================================
// Icon factories (DivIcon)
// =============================================================================

function createSenderIcon(
  label: string,
  color: string = '#D1121F',
  _senderId?: string,
  zoom?: number,
  pulsing = false,
): L.DivIcon {
  const initial = label.charAt(0).toUpperCase();
  // Convencion de assets: /icons/comparsas/<slug-del-nombre>.png (con
  // fallback automatico a default.svg y a la inicial si no existe el logo).
  // _senderId se mantiene en la firma por compatibilidad con llamadas previas.
  return createComparsaIcon(comparsaLogoUrl(label), {
    zoom,
    size: undefined,
    color,
    label,
    fallbackText: initial,
    pulse: pulsing,
  });
}

/** Escapa el glifo del POI para interpolarlo en el HTML del divIcon. */
function escapePoiGlyph(glyph: string): string {
  return glyph
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Icono POI: divIcon vectorial ligero por categoria (sin assets extra).
 * Memoizable por (categoria, sunMode). En modo sol usa fondo blanco y
 * borde grueso para exteriores.
 */
function createPoiIcon(category: PoiCategory, sunMode: boolean): L.DivIcon {
  const color = POI_CATEGORY_COLOR[category];
  const glyph = escapePoiGlyph(POI_CATEGORY_GLYPH[category]);
  const size = 30;
  const glyphSize = category === 'banos' ? 9 : 14;
  const html =
    '<div class="gps-poi-marker' + (sunMode ? ' is-sun' : '') + '"' +
    ' style="--poi-color:' + color + ';width:' + size + 'px;height:' + size + 'px">' +
    '<span class="gps-poi-glyph" style="font-size:' + glyphSize + 'px">' + glyph + '</span>' +
    '</div>';
  return L.divIcon({
    className: 'gps-poi-wrapper',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

interface PoiMarkerProps {
  lat: number;
  lng: number;
  name: string;
  description?: string;
  category: PoiCategory;
  sunMode: boolean;
}

const PoiMarker: React.FC<PoiMarkerProps> = ({ lat, lng, name, description, category, sunMode }) => {
  const icon = useMemo(() => createPoiIcon(category, sunMode), [category, sunMode]);
  return (
    <Marker position={[lat, lng]} icon={icon} keyboard={false}>
      <Popup>
        <div style={{ minWidth: 140, maxWidth: 220 }}>
          <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{name}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: POI_CATEGORY_COLOR[category] }}>
            {POI_CATEGORY_LABEL[category]}
          </div>
          {description ? (
            <div style={{ fontSize: '0.7rem', marginTop: 4 }}>{description}</div>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
};

// v3.1: marcador con ICONO MEMOIZADO por (label, senderId, color, zoom). Sin el,
// cada mensaje GPS recreaba el L.DivIcon y Leaflet reconstruia el DOM del
// marcador (~0,7 Hz por emisor). El icono solo cambia si cambia el zoom/label.
interface SenderMarkerProps {
  pos: SenderPosition;
  color: string;
  zoom: number;
  enabled?: boolean;
  pulsing?: boolean;
}

/**
 * Marcador de emisor.
 *
 * `memo` es lo que evita el parpadeo del lienzo: con el GPS a ~1 Hz, sin
 * memoización React recrearia el `Marker` y su `L.DivIcon` en CADA trama,
 * obligando a Leaflet a reconstruir el DOM del marcador. Aqui el componente
 * solo re-renderiza cuando cambia de verdad alguna de sus props (posicion,
 * color, zoom, pulso).
 */
const SenderMarker = memo(function SenderMarker({
  pos,
  color,
  zoom,
  enabled = true,
  pulsing = false,
}: SenderMarkerProps) {
  const icon = useMemo(
    () => createSenderIcon(pos.label, color, pos.senderId, zoom, pulsing),
    [pos.label, pos.senderId, color, zoom, pulsing]
  );
  return (
    <SmoothMarker
      position={[pos.lat, pos.lng]}
      icon={icon}
      heading={pos.heading}
      enabled={enabled}
    />
  );
});

// Circulo de precision: memoizado por (posicion, radio, color). Es el elemento
// mas numeroso del mapa (uno por emisor) y se actualiza en cada trama.
const AccuracyCircle = memo(function AccuracyCircle({
  lat,
  lng,
  radius,
  color,
}: {
  lat: number;
  lng: number;
  radius: number;
  color: string;
}) {
  const pathOptions = useMemo(
    () => ({ color, weight: 1, opacity: 0.55, fillOpacity: 0.12 }),
    [color]
  );
  return <Circle center={[lat, lng]} radius={radius} pathOptions={pathOptions} />;
});

/** Traza de recorrido de un emisor. */
const TrailLine = memo(function TrailLine({
  positions,
  color,
}: {
  positions: [number, number][];
  color: string;
}) {
  const pathOptions = useMemo(
    () => ({ color, weight: 3, opacity: 0.5, dashArray: '5, 8' }),
    [color]
  );
  return <Polyline positions={positions} pathOptions={pathOptions} />;
});


// =============================================================================
// Mapa (subarbol lazy)
// =============================================================================

export interface GpsLiveMapProps {
  center: [number, number];
  /** Capa base activa. La pagina la controla (estado) para rotar sin recargar. */
  layer: MapLayerKey;
  onLayerChange: (key: MapLayerKey) => void;
  /**
   * Peticion de reencuadre sobre la posicion real. `nonce` debe incrementarse
   * cada vez que se quiera volver a encuadrar; con 0 el mapa no vuela a ningun
   * sitio y se queda en `center` (comportamiento inicial).
   */
  frameRequest: { target: [number, number]; nonce: number } | null;
  followMode: boolean;
  followPosition: [number, number] | null;
  mapRef: React.RefObject<L.Map | null>;
  onZoomChange: (zoom: number) => void;
  pois: StaticPOI[];
  sunMode: boolean;
  trails: Map<string, [number, number][]>;
  /** Orden de emisores: fija el color por indice (mismo criterio que el panel). */
  senderOrder: string[];
  senderPositions: SenderPosition[];
  statusCtx: GpsLiveStatusContext;
  mapZoom: number;
}

const GpsLiveMap: React.FC<GpsLiveMapProps> = ({
  center,
  layer,
  onLayerChange,
  frameRequest,
  followMode,
  followPosition,
  mapRef,
  onZoomChange,
  pois,
  sunMode,
  trails,
  senderOrder,
  senderPositions,
  statusCtx,
  mapZoom,
}) => {
  const base = getMapLayer(layer);

  // Solo se repintan las trazas cuyo color ha cambiado: evita recorrerlas todas
  // en cada trama cuando el numero de emisores es alto.
  const trailEntries = useMemo(
    () => Array.from(trails.entries()),
    [trails]
  );

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={17}
        scrollWheelZoom={true}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        zoomSnap={MAP_ZOOM_SNAP}
        zoomDelta={MAP_ZOOM_DELTA}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Capa base conmutable: calle (OpenStreetMap) o satelite (Esri). */}
        <TileLayer
          key={base.key}
          attribution={base.attribution}
          url={base.url}
          maxZoom={base.maxZoom}
        />

        {/* Map Controller for mobile rendering and follow mode */}
        <MapController followMode={followMode} followPosition={followPosition} mapRef={mapRef} />
        <MapZoomWatcher onZoomChange={onZoomChange} />

        {/* Vuelo a la posicion real del emisor. Se renderiza siempre para que la
            trama llegue antes o despues del montaje del mapa. */}
        <MapAutoFrame
          target={frameRequest?.target ?? null}
          nonce={frameRequest?.nonce ?? 0}
          zoom={FRAME_ZOOM}
        />

        {/* POIs estaticos (agua/socorro/violeta/banos/PMR): iconos
            vectoriales ligeros, filtrables y respetan el Modo Sol. */}
        {pois.map((poi) => (
          <PoiMarker
            key={poi.id}
            lat={poi.lat}
            lng={poi.lng}
            name={poi.name}
            description={poi.description}
            category={poi.category}
            sunMode={sunMode}
          />
        ))}

        {/* Trails */}
        {trailEntries.map(([senderId, trail]) => (
          <TrailLine
            key={`trail-${senderId}`}
            positions={trail}
            color={getSenderColor(senderOrder.indexOf(senderId))}
          />
        ))}

        {/* Circulo de precision GPS + marcadores con animacion suave.
            El circulo transmite honestidad tecnica sobre el margen de
            error del dispositivo emisor. */}
        {senderPositions
          .filter((p) => Date.now() - p.lastSeen < GPS_TIMEOUT_MS)
          .map((pos, idx) => {
            const color = getSenderColor(idx);
            const inViewport =
              mapRef.current?.getBounds?.().contains?.(L.latLng(pos.lat, pos.lng)) ?? true;
            const pulse = senderPulseActive(pos.senderId, statusCtx)
              ? isMarkerPulseActive(statusCtx.status.kind)
              : false;
            const accuracyRadius = Number.isFinite(pos.accuracy) && pos.accuracy > 0
              ? Math.min(Math.max(pos.accuracy, 5), 120)
              : 12;
            return (
              <React.Fragment key={pos.senderId}>
                <AccuracyCircle
                  lat={pos.lat}
                  lng={pos.lng}
                  radius={accuracyRadius}
                  color={color}
                />
                <SenderMarker
                  pos={pos}
                  color={color}
                  zoom={mapZoom}
                  enabled={inViewport}
                  pulsing={pulse}
                />
              </React.Fragment>
            );
          })}
      </MapContainer>

      {/* Selector de capas, por encima del lienzo (no dentro: debe recibir clics). */}
      <MapLayerSwitch active={layer} onChange={onLayerChange} />
    </div>
  );
};

export default GpsLiveMap;

