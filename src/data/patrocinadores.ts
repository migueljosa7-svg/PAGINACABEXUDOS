// ============================================================
// MÓDULO DE PATROCINIO — Hostelería y Comercio Local
// ============================================================
//
// Qué aporta frente al programa impreso: el programa de papel es fijo, así que
// solo puede listar los patrocinadores. Aquí el local se ENCUENDA en el mapa
// en el momento en que la comparsa pasa por su calle, y se ordena por
// cercanía real a la posición de la cabalgata. La proximity es el producto,
// no el listado.
//
// ⚠ ESTADO DE LOS DATOS
// Las fichas de este catálogo son EJEMPLOS de la ficha que rellenará cada
// comercio (todas llevan `demostracion: true`). No se afirma que exista ningún
// acuerdo de patrocinio: la UI lo dice de forma expresa con
// `PATROCINIO_AVISO_DEMO`, igual que hace la página de colaboraciones con sus
// marcadores de posición. Al firmar el convenio basta con poner
// `demostracion: false` y rellenar `contacto`.
//
// Convención de assets (igual que `mapIcons.tsx` para las comparsas):
//   public/icons/patrocinio/<slug-del-nombre>.png  -> cae en default.svg

/** Familias de comercio local que pueden patrocinar la salida. */
export type PatrocinioCategoria = 'bar' | 'restaurante' | 'panaderia' | 'pasteleria' | 'tienda';

/** Nivel de patrocinio: governa el destaque visual en el mapa y en la ficha. */
export type PatrocinioNivel = 'oro' | 'plata';

export interface Patrocinador {
  id: string;
  nombre: string;
  categoria: PatrocinioCategoria;
  nivel: PatrocinioNivel;
  /** Calle y número, para el texto legible bajo el mapa. */
  direccion: string;
  lat: number;
  lng: number;
  /** El gancho que se lee cuando la comparsa está encima. */
  gancho: string;
  /** Descripción de la colaboración (una línea, sin florituras). */
  descripcion: string;
  /** Teléfono o contacto publicado. Vacío hasta que el local lo facilite. */
  contacto?: string;
  /** Franja horaria en la que el local ofrece su servicio durante la salida. */
  franja?: string;
  /** true = ficha de ejemplo pendiente de convenio (ver cabecera). */
  demostracion: boolean;
}

export const PATROCINIO_CATEGORIA_LABEL: Record<PatrocinioCategoria, string> = {
  bar: 'Bar / Cafetería',
  restaurante: 'Restaurante',
  panaderia: 'Panadería',
  pasteleria: 'Pastelería',
  tienda: 'Comercio local',
};

/** Emoji de categoría: evita un atlas de iconos nuevo. */
export const PATROCINIO_CATEGORIA_GLYPH: Record<PatrocinioCategoria, string> = {
  bar: '🍺',
  restaurante: '🍽️',
  panaderia: '🥖',
  pasteleria: '🍰',
  tienda: '🛍️',
};

/** Color de la categoría. El nivel de pago se pinta aparte. */
export const PATROCINIO_CATEGORIA_COLOR: Record<PatrocinioCategoria, string> = {
  bar: '#B8860B',
  restaurante: '#8B4513',
  panaderia: '#C68642',
  pasteleria: '#D2691E',
  tienda: '#2E7D32',
};

export const PATROCINIO_NIVEL_LABEL: Record<PatrocinioNivel, string> = {
  oro: 'Patrocinio Oro',
  plata: 'Patrocinio Plata',
};

export const PATROCINIO_CATEGORIAS: PatrocinioCategoria[] = [
  'bar',
  'restaurante',
  'panaderia',
  'pasteleria',
  'tienda',
];

/**
 * Texto que acompaña a cualquier listado de patrocinadores mientras el
 * catálogo sea de demostración. No es un detalle: sin él, un mapa con
 * "Patrocinio Oro" junto a un bar real se lee como un acuerdo ya firmado.
 */
export const PATROCINIO_AVISO_DEMO =
  'Fichas de ejemplo: muestran el tipo de ficha que rellenará cada comercio local. ' +
  'No implican acuerdo de patrocinio firmado con ningún establecimiento.';

/**
 * Catálogo de alta.
 *
 * Las coordenadas están elegidas sobre el trazado real de `route-pilar-principal`
 * (Plaza del Pilar, Don Jaime I, Alfonso I, Plaza de España, El Coso) para que
 * el ejemplo sea fiel: si un local quedara lejos del trazado, la proximity lo
 * enseña como "fuera de la cabalgata" en lugar de maquillar la demo.
 */
export const PATROCINADORES: Patrocinador[] = [
  {
    id: 'pat-bar-pilar',
    nombre: 'Bar del Pilar',
    categoria: 'bar',
    nivel: 'oro',
    direccion: 'Plaza del Pilar, 8',
    lat: 41.6564,
    lng: -0.8788,
    gancho: 'Vermú y caña antes de la salida',
    descripcion: 'Bar histórico de la plaza, parada habitual antes de la misa.',
    demostracion: true,
  },
  {
    id: 'pat-taberna-don-jaime',
    nombre: 'Taberna Don Jaime',
    categoria: 'bar',
    nivel: 'plata',
    direccion: 'Calle Don Jaime I, 21',
    lat: 41.6545,
    lng: -0.8776,
    gancho: 'Terraza en la puerta de la Don Jaime',
    descripcion: 'Terraza de nueve mesas que da directamente a la calle del desfile.',
    franja: '12:00-16:00 y 18:00-22:00',
    demostracion: true,
  },
  {
    id: 'pat-panaderia-alfonso',
    nombre: 'Horno de Alfonso',
    categoria: 'panaderia',
    nivel: 'plata',
    direccion: 'Calle Alfonso I, 14',
    lat: 41.6552,
    lng: -0.8797,
    gancho: 'Pan recién horneado durante la cabalgata',
    descripcion: 'Horno con producción continua: el pan no para en toda la fiesta.',
    franja: '09:00-21:00',
    demostracion: true,
  },
  {
    id: 'pat-pasteleria-coso',
    nombre: 'Pastelería El Coso',
    categoria: 'pasteleria',
    nivel: 'plata',
    direccion: 'Plaza del Pilar - El Coso, 3',
    lat: 41.6576,
    lng: -0.8789,
    gancho: 'Roscón y el pastel gigante de la casa',
    descripcion: 'Especialidad de rosconería y bollos de San Valero.',
    demostracion: true,
  },

  {
    id: 'pat-rest-espana',
    nombre: 'Restaurante Plaza de España',
    categoria: 'restaurante',
    nivel: 'oro',
    direccion: 'Plaza de España, 2',
    lat: 41.6516,
    lng: -0.8815,
    gancho: 'Menú del día con reserva de mesa en la plaza',
    descripcion: 'Cocina aragonesa en la plaza donde la comparsa hace su primera parada larga.',
    franja: '13:30-17:00',
    demostracion: true,
  },
  {
    id: 'pat-tienda-alfonso',
    nombre: 'Sombrerería del Casco',
    categoria: 'tienda',
    nivel: 'plata',
    direccion: 'Calle Alfonso I, 33',
    lat: 41.6534,
    lng: -0.8815,
    gancho: 'Recuerdos de la comparsa y ropa del disfraz',
    descripcion: 'Comercio de souvenirs y vestuario tradicional de la comparsa.',
    demostracion: true,
  },
  {
    id: 'pat-bar-espana',
    nombre: 'Café Espolón',
    categoria: 'bar',
    nivel: 'plata',
    direccion: 'Plaza de España, 6',
    lat: 41.6519,
    lng: -0.8809,
    gancho: 'Café de paso para ver pasar a los gigantes',
    descripcion: 'Café de madrugadores, el mejor sitio para ver pasar a los gigantes.',
    demostracion: true,
  },
  {
    id: 'pat-tienda-santa-cruz',
    nombre: 'Zapatería Santa Cruz',
    categoria: 'tienda',
    nivel: 'plata',
    direccion: 'Plaza Santa Cruz, 5',
    lat: 41.6543,
    lng: -0.8779,
    gancho: 'Calzado de clown y vestuario de cabezudos',
    descripcion: 'Zapatería de barrio que trabaja con los talleres de cabezudos.',
    demostracion: true,
  },
];

