export type BloqueKey =
  | 'BLOQUE_1'
  | 'BLOQUE_2'
  | 'BLOQUE_3'
  | 'BLOQUE_4'
  | 'BLOQUE_5'
  | 'BLOQUE_6'
  | 'BLOQUE_7'
  | 'BLOQUE_8'
  | 'BLOQUE_9'
  | 'BLOQUE_10';

export interface BarrioComparsaBloque {
  bloque: BloqueKey;
  barrioId: string;
  barrioNombre: string;
  personajesCabezudos: string[];
  personajesGigantes: string[];
}

/**
 * Inventario introducido manualmente por el usuario (texto), para ser usado posteriormente.
 * Nota: el filtrado del juego ya usa `barrioComparsasData.ts`; este fichero sirve como
 * “fuente de bloques” para que no se pierda la información aportada.
 */
export const barrioComparsasBloquesFiabilidad: BarrioComparsaBloque[] = [
  {
    bloque: 'BLOQUE_1',
    barrioId: 'arrabal',
    barrioNombre: 'Arrabal',
    personajesCabezudos: ['Baturro', 'Berrugón', 'Chulo', 'Forana', 'Morico', 'Ferroviario (incorporado desde 2008, sustituyendo al Gendarme Francés cedido por Barrio Jesús)'],
    personajesGigantes: [],
  },
  {
    bloque: 'BLOQUE_1',
    barrioId: 'almozara',
    barrioNombre: 'La Almozara (Comparsa de la Junta)',
    personajesCabezudos: ['Berrugón', 'Forana', 'Morico', 'Payaso', 'Tuerto', 'Torero', 'Almozica'],
    personajesGigantes: [],
  },

  {
    bloque: 'BLOQUE_1',
    barrioId: 'las-fuentes',
    barrioNombre: 'Las Fuentes',
    personajesCabezudos: ['Baturro', 'Bruja', 'Coreano', 'Indio', 'Maestro Cervecero', 'Morico', 'Payaso'],
    personajesGigantes: [],
  },
  {
    bloque: 'BLOQUE_4',
    barrioId: 'casetas',
    barrioNombre: 'Casetas',
    personajesCabezudos: ['Baturra', 'Baturro', 'Berrugón', 'Morico', 'Payaso'],
    personajesGigantes: ['Fernando el Católico', 'Isabel la Católica'],
  },

  {
    bloque: 'BLOQUE_4',
    barrioId: 'delicias',
    barrioNombre: 'Delicias',
    personajesCabezudos: ['Baturro', 'Forana', 'Morico', 'Berrugón', 'Bruja', 'Diablo', 'Payaso', 'Tuerto', 'Popeye', 'Lobo'],
    personajesGigantes: [],
  },
  {
    bloque: 'BLOQUE_4',
    barrioId: 'garrapinillos',
    barrioNombre: 'Garrapinillos',
    personajesCabezudos: ['Baturro', 'Baturra', 'Morico', 'Berrugón', 'Bruja', 'Payaso'],
    personajesGigantes: ['Agustina de Aragón'],
  },
  {
    bloque: 'BLOQUE_4',
    barrioId: 'cartuja-baja',
    barrioNombre: 'La Cartuja Baja',
    personajesCabezudos: ['Baturro', 'Morico', 'Berrugón', 'Bruja', 'Forana', 'Payaso'],
    personajesGigantes: [],
  },

  {
    bloque: 'BLOQUE_4',
    barrioId: 'santa-isabel',
    barrioNombre: 'Santa Isabel',
    personajesCabezudos: ['Baturra', 'Baturro', 'Morico', 'Berrugón', 'Bruja', 'Diablo', 'Payaso', 'Tuerto'],
    personajesGigantes: [],
  },
  {
    bloque: 'BLOQUE_4',
    barrioId: 'san-jose',
    barrioNombre: 'San José',
    personajesCabezudos: ['Baturro', 'Bruja', 'Coreano', 'Indio', 'Maestro Cervecero', 'Morico', 'Payaso'],
    personajesGigantes: [],
  },
];


