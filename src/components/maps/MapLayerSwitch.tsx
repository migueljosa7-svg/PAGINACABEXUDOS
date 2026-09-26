/**
 * Selector de capa del mapa (Estandar / Satelite).
 *
 * Se posiciona sobre el lienzo con CSS (no con `L.control.layers`) por dos
 * razones: hereda el tema claro/oscuro de la app y es accesible por teclado
 * como un grupo de botones, en lugar del menu nativo de Leaflet.
 *
 * Solo alterna la capa base: los marcadores, las trazas y los POIs viven por
 * encima y no se ven afectados.
 */

import { memo } from 'react';
import { FaMap, FaSatellite } from 'react-icons/fa';
import { MAP_LAYER_ORDER, MAP_LAYERS } from './mapLayers';
import type { MapLayerKey } from './mapLayers';
import '../../styles/recorridos.css';

export interface MapLayerSwitchProps {
  active: MapLayerKey;
  onChange: (key: MapLayerKey) => void;
}

// memo: solo re-renderiza cuando cambia la capa activa, no con cada trama GPS.
export const MapLayerSwitch = memo(function MapLayerSwitch({
  active,
  onChange,
}: MapLayerSwitchProps) {
  return (
    <div className="map-layer-switch" role="group" aria-label="Tipo de mapa">
      {MAP_LAYER_ORDER.map((key) => {
        const isActive = key === active;
        const Icon = key === 'satelit' ? FaSatellite : FaMap;
        return (
          <button
            key={key}
            type="button"
            className={`map-layer-btn ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
            title={`Ver mapa ${MAP_LAYERS[key].label.toLowerCase()}`}
            onClick={() => onChange(key)}
          >
            <Icon aria-hidden="true" />
            <span>{MAP_LAYERS[key].label}</span>
          </button>
        );
      })}
    </div>
  );
});

export default MapLayerSwitch;
