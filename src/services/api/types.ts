export type RouteStatus = 'Esperando inicio' | 'En marcha' | 'Parada' | 'Finalizado';

export type RecorridoLocationPoint = {
  lat: number;
  lng: number;
  streetName: string;
  isStop?: boolean;
  stopName?: string;
};

export type RecorridoDto = {
  id: string;
  name: string;
  description: string;
  type: 'municipal' | 'barrio';
  category: 'gigante' | 'cabezudo' | 'todos';
  color: string;
  durationMinutes: number;
  characterEmoji: string;
  characterName: string;
  timeString: string;
  points: RecorridoLocationPoint[];
};

export type EventoDto = {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time?: string;
  endTime?: string;
  comparsa?: string;
  barrio?: string;
};

export type ComparsaDto = {
  id: string;
  name: string;
  type: 'gigante' | 'cabezudo';
  year: number;
};

