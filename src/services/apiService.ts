const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const mockDelay = () => delay(600 + Math.round(Math.random() * 400));

const progressStateById: Record<string, number> = {};

export interface ApiRoutePoint {
  lat: number;
  lng: number;
  streetName: string;
  isStop?: boolean;
}

export interface ApiRoute {
  id: string;
  name: string;
  startTime: string;
  distanceMeters: number;
  durationMinutes: number;
  streets: string[];
  points: ApiRoutePoint[];
}

export interface ApiComparsaSummary {
  id: string;
  name: string;
  barrio: string;
  history: string;
  figures: string[];
  calendar: string;
  status: 'active' | 'inactive';
  hasGigantes: boolean;
  hasCabezudos: boolean;
  color: string;
  routeId: string;
}

export interface ApiComparsaDetail extends ApiComparsaSummary {
  route: ApiRoute;
}

export interface ApiComparsaPosition {
  lat: number;
  lng: number;
  currentStreet: string;
  nextStop: string;
  lastStop: string;
  expectedTime: string;
  status: 'Preparándose' | 'En marcha' | 'Finalizada';
  progress: number;
}

export interface ApiEvento {
  id: string;
  title: string;
  date: string;
  barrio: string;
  type: string;
}

export interface ApiBarrio {
  id: string;
  name: string;
  description: string;
}

const getEndpointPath = (endpoint: string): string => {
  switch (endpoint) {
    case '/api/comparsas':
      return '/comparsas.json';
    case '/api/comparsas/activas':
      return '/comparsas-activas.json';
    case '/api/eventos/hoy':
      return '/eventos-hoy.json';
    case '/api/calendario':
      return '/calendario.json';
    case '/api/barrios':
      return '/barrios.json';
    default:
      if (endpoint.startsWith('/api/comparsas/')) {
        const suffix = endpoint.replace('/api/comparsas/', '');
        if (suffix.startsWith('activas')) {
          return '/comparsas-activas.json';
        }
        if (suffix.includes('/recorrido')) {
          const id = suffix.split('/recorrido')[0];
          return `/comparsas/${id}/recorrido.json`;
        }
        if (suffix.includes('/posicion')) {
          const id = suffix.split('/posicion')[0];
          return `/comparsas/${id}/posicion.json`;
        }
        return `/comparsas/${suffix}.json`;
      }
      return endpoint;
  }
};

const requestJson = async <T,>(endpoint: string): Promise<T> => {
  await mockDelay();
  const response = await fetch(`${API_BASE_URL}${getEndpointPath(endpoint)}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const formatTime = (minutes: number): string => {
  const totalMinutes = Math.max(0, minutes);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const apiService = {
  async getComparsas(): Promise<ApiComparsaSummary[]> {
    return requestJson<ApiComparsaSummary[]>('/api/comparsas');
  },

  async getActiveComparsas(): Promise<ApiComparsaDetail[]> {
    return requestJson<ApiComparsaDetail[]>('/api/comparsas/activas');
  },

  async getComparsaById(id: string): Promise<ApiComparsaDetail> {
    return requestJson<ApiComparsaDetail>(`/api/comparsas/${id}`);
  },

  async getComparsaRecorrido(id: string): Promise<ApiRoute> {
    return requestJson<ApiRoute>(`/api/comparsas/${id}/recorrido`);
  },

  async getComparsaPosicion(id: string): Promise<ApiComparsaPosition> {
    const route = await this.getComparsaRecorrido(id);
    const progress = (progressStateById[id] ?? 0) + 0.18 + Math.random() * 0.02;
    progressStateById[id] = progress >= 1 ? 0 : progress;

    const normalized = progress >= 1 ? 1 : progress;
    const waypoints = route.points;
    if (waypoints.length < 2) {
      const point = waypoints[0] ?? { lat: 41.6568, lng: -0.8783, streetName: 'Zaragoza' };
      return {
        lat: point.lat,
        lng: point.lng,
        currentStreet: point.streetName,
        nextStop: point.streetName,
        lastStop: point.streetName,
        expectedTime: route.startTime,
        status: 'Preparándose',
        progress: 0,
      };
    }

    const scaledIndex = normalized * (waypoints.length - 1);
    const currentIndex = Math.min(Math.floor(scaledIndex), waypoints.length - 2);
    const start = waypoints[currentIndex];
    const end = waypoints[currentIndex + 1];
    const interpolation = scaledIndex - currentIndex;

    const lat = start.lat + (end.lat - start.lat) * interpolation;
    const lng = start.lng + (end.lng - start.lng) * interpolation;
    const currentStreet = interpolation < 0.5 ? start.streetName : end.streetName;

    const stops = waypoints.filter((point) => point.isStop);
    const lastStop = stops[stops.length - 1]?.streetName ?? start.streetName;
    const nextStop = stops.find((point) => point.streetName !== currentStreet)?.streetName ?? end.streetName;

    const startMinutes = route.startTime.split(':').map(Number).reduce((acc, value, index) => acc + (index === 0 ? value * 60 : value), 0);
    const expectedMinutes = startMinutes + Math.round(normalized * route.durationMinutes);
    const expectedTime = formatTime(expectedMinutes);

    return {
      lat,
      lng,
      currentStreet,
      nextStop,
      lastStop,
      expectedTime,
      status: normalized < 0.02 ? 'Preparándose' : normalized >= 0.98 ? 'Finalizada' : 'En marcha',
      progress: normalized,
    };
  },

  async getEventosHoy(): Promise<ApiEvento[]> {
    return requestJson<ApiEvento[]>('/api/eventos/hoy');
  },

  async getCalendario(): Promise<ApiEvento[]> {
    return requestJson<ApiEvento[]>('/api/calendario');
  },

  async getBarrios(): Promise<ApiBarrio[]> {
    return requestJson<ApiBarrio[]>('/api/barrios');
  },
};
