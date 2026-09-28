/**
 * Subárbol de mapa del módulo de patrocinio (chunk lazy, como `GpsLiveMap`).
 *
 * Se descarga con `React.lazy` DESPUÉS de que la página haya pintado la ficha de
 * alta, el aviso de datos y los filtros. Es la misma técnica que ya usa el
 * visor: la página no arrastra los ~150 kB de `map-vendor` en el primer pintado.
 *
 * Dibuja el trazado del recorrido de referencia y un marcador por patrocinador.
 * Los que la comparsa tiene encima (o muy cerca) se dibujan con anillo rojo y
 * etiqueta visible: ese contraste en el mapa es la mitad del valor del módulo.
 */

import React, { memo, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import { getMapLayer, MAP_MAX_ZOOM_HIGH } from './mapLayers';
import type { MapLayerKey } from './mapLayers';
import {
  PATROCINIO_CATEGORIA_COLOR,
  PATROCINIO_CATEGORIA_GLYPH,
  PATROCINIO_CATEGORIA_LABEL,
  PATROCINIO_NIVEL_LABEL,
} from '../../data/patrocinadores';
import type { PatrocinadorConDistancia } from '../../services/patrocinio';
import { PATROCINIO_RADIO_CERCA_M } from '../../services/patrocinio';
import '../../styles/patrocinio.css';

const MAP_MIN_ZOOM = 3;
const MAP_ZOOM_SNAP = 1;
const MAP_ZOOM_DELTA = 1;

/** Escapa texto para interpolarlo en el HTML del divIcon (evita XSS). */
function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PAT_ICON_SIZE = 30;
const PAT_ICON_SIZE_DESTACADO = 40;

/** divIcon del patrocinador: círculo de categoría, anillo oro y realce si destaca. */
function createPatrocinioIcon(
  patrocinador: PatrocinadorConDistancia,
  destacado: boolean,
): L.DivIcon {
  const px = destacado ? PAT_ICON_SIZE_DESTACADO : PAT_ICON_SIZE;
  const color = PATROCINIO_CATEGORIA_COLOR[patrocinador.categoria];
  const clases = [
    'patrocinio-marker',
    patrocinador.nivel === 'oro' ? 'is-oro' : '',
    destacado ? 'is-destacado' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const html = `
    <div style="--pat-color:${escapeHtml(color)};--pat-size:${px}px;text-align:center">
      <div class="${clases}">${escapeHtml(PATROCINIO_CATEGORIA_GLYPH[patrocinador.categoria])}</div>
      <div class="patrocinio-marker-label">${escapeHtml(patrocinador.nombre)}</div>
    </div>
  `;
  return L.divIcon({
    className: 'patrocinio-icon-wrapper',
    html,
    iconSize: [px, px + 14],
    iconAnchor: [px / 2, px],
    popupAnchor: [0, -(px + 4)],
  });
}

interface PatrocinioMarkerProps {
  patrocinador: PatrocinadorConDistancia;
  destacado: boolean;
}

const PatrocinioMarker = memo(function PatrocinioMarker({
  patrocinador,
  destacado,
}: PatrocinioMarkerProps) {
  const icon = useMemo(
    () => createPatrocinioIcon(patrocinador, destacado),
    [patrocinador, destacado],
  );
  return (
    <Marker position={[patrocinador.lat, patrocinador.lng]} icon={icon} keyboard={false}>
      <Popup>
        <div style={{ minWidth: 170, maxWidth: 240 }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{patrocinador.nombre}</div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: PATROCINIO_CATEGORIA_COLOR[patrocinador.categoria],
            }}
          >
            {PATROCINIO_CATEGORIA_LABEL[patrocinador.categoria]} ·{' '}
            {PATROCINIO_NIVEL_LABEL[patrocinador.nivel]}
          </div>
          <div style={{ fontSize: '0.72rem', marginTop: 4 }}>{patrocinador.gancho}</div>
          <div style={{ fontSize: '0.7rem', marginTop: 4, color: '#555' }}>
            {patrocinador.distanciaM} m · {patrocinador.direccion}
          </div>
          {destacado && (
            <div style={{ fontSize: '0.7rem', marginTop: 6, fontWeight: 800, color: '#D1121F' }}>
              La comparsa está en la puerta ahora mismo
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
});

export interface PatrocinioMapProps {
  /** Trazado del recorrido de referencia (waypoints en formato Leaflet). */
  recorrido: [number, number][];
  /** Catálogo ya enriquecido con distancia y proximidad. */
  locais: PatrocinadorConDistancia[];
  /** Posición de la comparsa, si hay emisor GPS en marcha. */
  posicion?: [number, number] | null;
  /** ids de los locales destacados (los que ya se conocen sin recalcular). */
  destacados?: string[];
  layer: MapLayerKey;
  center: [number, number];
}

const PatrocinioMap: React.FC<PatrocinioMapProps> = ({
  recorrido,
  locais,
  posicion = null,
  destacados = [],
  layer,
  center,
}) => {
  const base = getMapLayer(layer);
  const destacadosSet = useMemo(() => new Set(destacados), [destacados]);

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM_HIGH}
      zoomSnap={MAP_ZOOM_SNAP}
      zoomDelta={MAP_ZOOM_DELTA}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        key={base.key}
        attribution={base.attribution}
        url={base.url}
        maxZoom={base.maxZoom}
      />

      {/* Trazado del recorrido: el catálogo se ordena respecto a esta línea. */}
      {recorrido.length > 1 && (
        <Polyline
          positions={recorrido}
          pathOptions={{ color: '#D1121F', weight: 4, opacity: 0.65, dashArray: '8, 8' }}
        />
      )}

      {/* Radio de captura: a partir de aquí un local sale en el panel del visor. */}
      {posicion && (
        <Circle
          center={posicion}
          radius={PATROCINIO_RADIO_CERCA_M}
          pathOptions={{ color: '#D1121F', weight: 1, opacity: 0.35, fillOpacity: 0.05 }}
        />
      )}

      {posicion && (
        <Marker
          position={posicion}
          icon={L.divIcon({
            className: 'patrocinio-icon-wrapper',
            html: '<div style="width:18px;height:18px;border-radius:50%;background:#D1121F;border:3px solid #fff;box-shadow:0 0 0 6px rgba(209,18,31,.25)"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          })}
          keyboard={false}
        />
      )}

      {locais.map((p) => (
        <PatrocinioMarker key={p.id} patrocinador={p} destacado={destacadosSet.has(p.id)} />
      ))}
    </MapContainer>
  );
};

// memo: la pagina de patrocinio re-renderiza al filtrar categorias; el mapa no
// debe repintar los marcadores si no cambian sus props.
export default memo(PatrocinioMap);

