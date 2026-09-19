/**
 * Puntos de Interes (POIs) estaticos de asistencia en calle.
 *
 * Datos configurables por evento: cada POI es un punto fisico de ayuda
 * (agua, socorro, punto violeta, banos, PMR). Coordenadas aproximadas del
 * centro de Zaragoza (WGS84).
 */

export type PoiCategory = 'agua' | 'socorro' | 'violeta' | 'banos' | 'pmr';

export interface StaticPOI {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  description?: string;
}

export const POI_CATEGORY_LABEL: Record<PoiCategory, string> = {
  agua: 'Agua',
  socorro: 'Socorro',
  violeta: 'Punto violeta',
  banos: 'Banos',
  pmr: 'PMR',
};

export const POI_CATEGORY_COLOR: Record<PoiCategory, string> = {
  agua: '#0288d1',
  socorro: '#d32f2f',
  violeta: '#7b1fa2',
  banos: '#00796b',
  pmr: '#ef6c00',
};

/** Glifo simple por categoria (emoji, sin assets extra). */
export const POI_CATEGORY_GLYPH: Record<PoiCategory, string> = {
  agua: '\uD83D\uDCA7',
  socorro: '\u2795',
  violeta: '\u2640',
  banos: 'WC',
  pmr: '\u267F',
};

export const POI_CATEGORIES: PoiCategory[] = ['agua', 'socorro', 'violeta', 'banos', 'pmr'];

/**
 * Muestra inicial: 10 puntos alrededor del eje
 * Plaza del Pilar - Don Jaime I - Plaza Espana.
 */
export const STATIC_POIS: StaticPOI[] = [
  {
    id: 'agua-pilar-norte',
    name: 'Fuente Plaza del Pilar (norte)',
    category: 'agua',
    lat: 41.6569,
    lng: -0.8781,
    description: 'Punto de agua potable junto a la Basilica.',
  },
  {
    id: 'agua-don-jaime',
    name: 'Fuente C/ Don Jaime I',
    category: 'agua',
    lat: 41.6539,
    lng: -0.8773,
    description: 'Fuente a mitad de la calle Don Jaime I.',
  },
  {
    id: 'socorro-pilar',
    name: 'Cruz Roja - Plaza del Pilar',
    category: 'socorro',
    lat: 41.6562,
    lng: -0.8786,
    description: 'Puesto de primeros auxilios.',
  },
  {
    id: 'socorro-espana',
    name: 'Socorro - Plaza de Espana',
    category: 'socorro',
    lat: 41.6508,
    lng: -0.8787,
    description: 'Puesto sanitario en Plaza de Espana.',
  },
  {
    id: 'violeta-pilar',
    name: 'Punto Violeta - Plaza del Pilar',
    category: 'violeta',
    lat: 41.656,
    lng: -0.8779,
    description: 'Punto de informacion y atencion.',
  },
  {
    id: 'violeta-san-felipe',
    name: 'Punto Violeta - Plaza San Felipe',
    category: 'violeta',
    lat: 41.6553,
    lng: -0.8808,
    description: 'Punto de informacion y atencion.',
  },
  {
    id: 'banos-pilar',
    name: 'Banos - Plaza del Pilar',
    category: 'banos',
    lat: 41.6572,
    lng: -0.879,
    description: 'Banos publicos junto al aparcamiento.',
  },
  {
    id: 'banos-alfonso',
    name: 'Banos - C/ Alfonso I',
    category: 'banos',
    lat: 41.6549,
    lng: -0.8799,
    description: 'Banos publicos en Calle Alfonso I.',
  },
  {
    id: 'pmr-pilar',
    name: 'Zona PMR - Plaza del Pilar',
    category: 'pmr',
    lat: 41.6565,
    lng: -0.8775,
    description: 'Zona reservada con visibilidad para movilidad reducida.',
  },
  {
    id: 'pmr-don-jaime',
    name: 'Zona PMR - Don Jaime I',
    category: 'pmr',
    lat: 41.6545,
    lng: -0.8777,
    description: 'Zona reservada al inicio de Don Jaime I.',
  },
];
