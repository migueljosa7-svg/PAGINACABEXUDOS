/**
 * Capas base del mapa: cartografia de calle y vista satelital.
 *
 * - ESTANDAR: espejo oficial de OpenStreetMap (Alemania), sin marcas de agua ni
 *   bloqueos 403 por cuota. Es la vista por defecto porque las calles y los
 *   nombres de calle son lo que ayuda a orientarse en una comparsa.
 * - SATELITE: Esri World Imagery. Util para reconocer el entorno real del
 *   Ayuntamiento y leer el trazado sobre el tejido urbano.
 *
 * Ambas son de uso gratuito y sin API key. Se exportan aqui (y no dentro del
 * componente de mapa) para que la pagina pueda rotar entre ellas sin importar
 * Leaflet: siesser, el mapa dejaria de ser lazy.
 */

export type MapLayerKey = 'estandar' | 'satelit';

export interface MapLayerDef {
  key: MapLayerKey;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

/** Zoom maximo util: 19 es donde ambos proveedores aun sirven tile nativo. */
export const MAP_MAX_ZOOM_HIGH = 19;

export const MAP_LAYERS: Record<MapLayerKey, MapLayerDef> = {
  estandar: {
    key: 'estandar',
    label: 'Estándar',
    url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: MAP_MAX_ZOOM_HIGH,
  },
  satelit: {
    key: 'satelit',
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Imágenes &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: MAP_MAX_ZOOM_HIGH,
  },
};

export const MAP_LAYER_ORDER: MapLayerKey[] = ['estandar', 'satelit'];

/** Elige la definicion de capa; ante un valor inesperado devuelve la estándar. */
export function getMapLayer(key: MapLayerKey): MapLayerDef {
  return MAP_LAYERS[key] ?? MAP_LAYERS.estandar;
}
