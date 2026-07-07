export interface GalleryItem {
  id: string;
  title: string;
  src: string;
  alt: string;
  category: string;
}

export interface VideoItem {
  id: string;
  title: string;
  src: string;
  thumbnail: string;
  duration: string;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  tag: string;
}

export interface HistoryMilestone {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface HistoricalRoute {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
  durationMin: number;
  difficulty: 'Fácil' | 'Media' | 'Difícil';
  category: 'Pilar' | 'Histórica' | 'Barrio';
  points: Array<{ name: string; lat: number; lng: number }>;
}

export const galleryItems: GalleryItem[] = [
  {
    id: 'g1',
    title: 'Desfile inaugural del Pilar',
    src: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=80',
    alt: 'Comparsa de gigantes y cabezudos en la plaza del Pilar',
    category: 'Desfiles'
  },
  {
    id: 'g2',
    title: 'La Pilara en acción',
    src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
    alt: 'La Pilara durante una salida festiva',
    category: 'Cabezudos'
  },
  {
    id: 'g3',
    title: 'Recorrido histórico por el Casco',
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    alt: 'Imagen del Casco Histórico con la comparsa',
    category: 'Recorridos'
  },
  {
    id: 'g4',
    title: 'Fiestas del Pilar',
    src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
    alt: 'Fiestas del Pilar y ambiente festivo',
    category: 'Eventos'
  }
];

export const videoItems: VideoItem[] = [
  {
    id: 'v1',
    title: 'Comparsa Municipal en desfile',
    src: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80',
    duration: '01:24'
  },
  {
    id: 'v2',
    title: 'Recorrido histórico del Pilar',
    src: 'https://www.w3schools.com/html/movie.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80',
    duration: '02:10'
  }
];

export const newsItems: NewsItem[] = [
  {
    id: 'n1',
    title: 'Nueva ruta histórica para el próximo Pilar',
    excerpt: 'La comparsa incorporará un recorrido revisado por el Casco Histórico con nuevas paradas culturales.',
    date: '2026-07-01',
    tag: 'Ruta'
  },
  {
    id: 'n2',
    title: 'La Enciclopedia recibe 11 nuevas fichas de cabezudos',
    excerpt: 'Se amplía la información documental de los personajes más emblemáticos del desfile.',
    date: '2026-06-20',
    tag: 'Contenido'
  },
  {
    id: 'n3',
    title: 'Arranca la temporada de salidas extraordinarias',
    excerpt: 'El calendario incluye actos solidarios, visitas y muestras culturales en barrios y espacios emblemáticos.',
    date: '2026-06-10',
    tag: 'Agenda'
  }
];

export const historyMilestones: HistoryMilestone[] = [
  {
    id: 'h1',
    year: '1841',
    title: 'Nacimiento de la comparsa moderna',
    description: 'Se consolidan los primeros cabezudos como símbolo festivo del Pilar.'
  },
  {
    id: 'h2',
    year: '1918',
    title: 'Llegan los gigantes históricos',
    description: 'Félix Oroz incorpora a los gigantes que aún hoy recorren las calles de Zaragoza.'
  },
  {
    id: 'h3',
    year: '1982',
    title: 'Nueva etapa con la Pilara y Agustina',
    description: 'Se renuevan personajes y se abre la comparsa a nuevas referencias contemporáneas.'
  },
  {
    id: 'h4',
    year: '2008',
    title: 'Goya y Josefa Bayeu',
    description: 'La comparsa incorpora figuras de referencia cultural y artística para Aragón.'
  },
  {
    id: 'h5',
    year: '2015',
    title: 'La Cigarrera',
    description: 'Se reconoce a una figura trabajadora del entorno urbano con una nueva incorporación muy querida.'
  }
];

export const historicalRoutes: HistoricalRoute[] = [
  {
    id: 'ruta-pilar',
    name: 'Ruta del Pilar',
    description: 'Recorrido clásico entre la Plaza del Pilar, el Coso y la Basílica.',
    distanceKm: 3.4,
    durationMin: 55,
    difficulty: 'Fácil',
    category: 'Pilar',
    points: [
      { name: 'Plaza del Pilar', lat: 41.654, lng: -0.878 },
      { name: 'Calle Mayor', lat: 41.654, lng: -0.8786 },
      { name: 'Plaza de España', lat: 41.6524, lng: -0.8789 },
      { name: 'Paseo de la Independencia', lat: 41.6505, lng: -0.8781 }
    ]
  },
  {
    id: 'ruta-sitios',
    name: 'Ruta de los Sitios',
    description: 'Una ruta emotiva que enlaza los lugares más simbólicos de 1808.',
    distanceKm: 5.1,
    durationMin: 80,
    difficulty: 'Media',
    category: 'Histórica',
    points: [
      { name: 'Puerta del Carmen', lat: 41.655, lng: -0.8792 },
      { name: 'Plaza del Portillo', lat: 41.6555, lng: -0.8798 },
      { name: 'La Seo', lat: 41.6567, lng: -0.8778 }
    ]
  },
  {
    id: 'ruta-arrabal',
    name: 'Ruta del Arrabal',
    description: 'Explora la herencia popular y el espíritu del barrio más aragonés.',
    distanceKm: 4.2,
    durationMin: 70,
    difficulty: 'Fácil',
    category: 'Barrio',
    points: [
      { name: 'Puente de Piedra', lat: 41.6538, lng: -0.879 },
      { name: 'Arrabal', lat: 41.6506, lng: -0.8783 },
      { name: 'Plaza de los Sitios', lat: 41.6517, lng: -0.8788 }
    ]
  }
];
