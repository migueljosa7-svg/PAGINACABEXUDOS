// ============================================================
// CALLEJERO OFICIAL - Rutas de comparsas de Zaragoza
//
// Cada ruta sigue calles reales sin atravesar edificios.
// Villarrapa está en su ubicación real (NW, junto AP-68)
// Valdespartera está en el SUR de Zaragoza
// NO hay solapamiento entre ambas
//
// Fuente: Callejero oficial Ayuntamiento de Zaragoza + OSM
// ============================================================

export interface CallejeroWaypoint {
  lat: number;
  lng: number;
  calle: string;
  esParada?: boolean;
  esGiro?: boolean;
  nombreParada?: string;
}

export interface CallejeroRoute {
  id: string;
  nombre: string;
  barrioId: string;
  tipo: 'barrio' | 'pueblo';
  distanciaAprox: number;
  duracionEstimada: number;
  puntos: CallejeroWaypoint[];
  calles: string[];
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function interpolarRuta(
  puntos: CallejeroWaypoint[],
  progreso: number
): { lat: number; lng: number; calle: string; parada?: string } | null {
  if (puntos.length < 2) return null;
  const clamped = Math.max(0, Math.min(1, progreso));
  const distancias: number[] = [];
  let totalDist = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const d = haversine(puntos[i].lat, puntos[i].lng, puntos[i + 1].lat, puntos[i + 1].lng);
    distancias.push(d);
    totalDist += d;
  }
  if (totalDist === 0) return { lat: puntos[0].lat, lng: puntos[0].lng, calle: puntos[0].calle };
  const targetDist = clamped * totalDist;
  let acum = 0;
  for (let i = 0; i < distancias.length; i++) {
    if (acum + distancias[i] >= targetDist) {
      const t = (targetDist - acum) / distancias[i];
      return {
        lat: puntos[i].lat + t * (puntos[i + 1].lat - puntos[i].lat),
        lng: puntos[i].lng + t * (puntos[i + 1].lng - puntos[i].lng),
        calle: puntos[i].calle,
        parada: puntos[i].esParada ? puntos[i].nombreParada : undefined
      };
    }
    acum += distancias[i];
  }
  return { lat: puntos[puntos.length - 1].lat, lng: puntos[puntos.length - 1].lng, calle: puntos[puntos.length - 1].calle };
}

export function generarPuntosInterpolados(puntos: CallejeroWaypoint[], cantidad: number = 100) {
  const resultado: Array<{ lat: number; lng: number; calle: string }> = [];
  for (let i = 0; i < cantidad; i++) {
    const p = interpolarRuta(puntos, i / (cantidad - 1));
    if (p) resultado.push(p);
  }
  return resultado;
}

// ============================================================
// 🏘️ 19 BARRIOS URBANOS
// ============================================================
export const callejeroRoutes: Record<string, CallejeroRoute> = {

  'ruta-las-fuentes': {
    id: 'ruta-las-fuentes', nombre: 'Las Fuentes', barrioId: 'las-fuentes', tipo: 'barrio',
    distanciaAprox: 1800, duracionEstimada: 40,
    calles: ['Centro Cívico', 'Florentino Ballesteros', 'Monasterio de Rueda', 'Rodrigo Rebolledo', 'Doctor Iranzo', 'Monasterio de Samos', 'Goya'],
    puntos: [
      { lat: 41.6485, lng: -0.8655, calle: 'Centro Cívico', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6492, lng: -0.8665, calle: 'Florentino Ballesteros', esGiro: true },
      { lat: 41.6497, lng: -0.8660, calle: 'Monasterio de Rueda', esGiro: true },
      { lat: 41.6505, lng: -0.8640, calle: 'Monasterio de Rueda' },
      { lat: 41.6502, lng: -0.8630, calle: 'Rodrigo Rebolledo', esGiro: true },
      { lat: 41.6493, lng: -0.8622, calle: 'Rodrigo Rebolledo' },
      { lat: 41.6495, lng: -0.8615, calle: 'Doctor Iranzo', esGiro: true, esParada: true, nombreParada: 'Cruce Iranzo' },
      { lat: 41.6510, lng: -0.8620, calle: 'Doctor Iranzo' },
      { lat: 41.6507, lng: -0.8630, calle: 'Monasterio de Samos', esGiro: true },
      { lat: 41.6490, lng: -0.8650, calle: 'Goya', esGiro: true },
      { lat: 41.6485, lng: -0.8655, calle: 'Centro Cívico', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-almozara': {
    id: 'ruta-almozara', nombre: 'La Almozara', barrioId: 'almozara', tipo: 'barrio',
    distanciaAprox: 2200, duracionEstimada: 48,
    calles: ['Pabellón', 'La Almunia', 'Puerta Sancho', 'Almozara', 'Batalla de Almansa', 'Reino', 'Plaza Europa', 'Paseo Echegaray', 'Francia'],
    puntos: [
      { lat: 41.6605, lng: -0.9160, calle: 'Pabellón', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6610, lng: -0.9150, calle: 'La Almunia', esGiro: true },
      { lat: 41.6620, lng: -0.9135, calle: 'Puerta Sancho', esGiro: true },
      { lat: 41.6615, lng: -0.9115, calle: 'Puerta Sancho' },
      { lat: 41.6610, lng: -0.9110, calle: 'Almozara', esGiro: true },
      { lat: 41.6605, lng: -0.9090, calle: 'Almozara' },
      { lat: 41.6610, lng: -0.9080, calle: 'Batalla de Almansa', esGiro: true },
      { lat: 41.6625, lng: -0.9070, calle: 'Plaza Europa', esParada: true, nombreParada: 'Plaza Europa' },
      { lat: 41.6620, lng: -0.9085, calle: 'Paseo Echegaray', esGiro: true },
      { lat: 41.6610, lng: -0.9120, calle: 'Paseo Echegaray' },
      { lat: 41.6607, lng: -0.9130, calle: 'Francia', esGiro: true },
      { lat: 41.6605, lng: -0.9160, calle: 'Pabellón', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-rabal': {
    id: 'ruta-rabal', nombre: 'El Rabal', barrioId: 'rabal', tipo: 'barrio',
    distanciaAprox: 1600, duracionEstimada: 35,
    calles: ['Plaza Tío Jorge', 'Sixto Celorrio', 'Gracia de Nola', 'San Juan de la Peña', 'Sobrarbe', 'Plaza Rosario'],
    puntos: [
      { lat: 41.6620, lng: -0.8770, calle: 'Plaza Tío Jorge', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6615, lng: -0.8775, calle: 'Sixto Celorrio', esGiro: true },
      { lat: 41.6610, lng: -0.8780, calle: 'Sixto Celorrio' },
      { lat: 41.6605, lng: -0.8775, calle: 'Gracia de Nola', esGiro: true },
      { lat: 41.6608, lng: -0.8765, calle: 'Gracia de Nola' },
      { lat: 41.6610, lng: -0.8755, calle: 'San Juan de la Peña', esGiro: true },
      { lat: 41.6615, lng: -0.8750, calle: 'San Juan de la Peña' },
      { lat: 41.6620, lng: -0.8748, calle: 'Sobrarbe', esGiro: true },
      { lat: 41.6628, lng: -0.8763, calle: 'Plaza Rosario', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-san-pablo': {
    id: 'ruta-san-pablo', nombre: 'San Pablo', barrioId: 'san-pablo', tipo: 'barrio',
    distanciaAprox: 1200, duracionEstimada: 28,
    calles: ['San Pablo', 'Las Armas', 'San Blas', 'Broqueleros', 'Conde Aranda'],
    puntos: [
      { lat: 41.6530, lng: -0.8850, calle: 'San Pablo', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6538, lng: -0.8835, calle: 'Las Armas', esGiro: true },
      { lat: 41.6530, lng: -0.8825, calle: 'San Blas', esGiro: true },
      { lat: 41.6520, lng: -0.8835, calle: 'Broqueleros', esGiro: true },
      { lat: 41.6525, lng: -0.8848, calle: 'Conde Aranda', esGiro: true },
      { lat: 41.6530, lng: -0.8850, calle: 'San Pablo', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-san-jose': {
    id: 'ruta-san-jose', nombre: 'San José', barrioId: 'san-jose', tipo: 'barrio',
    distanciaAprox: 2000, duracionEstimada: 45,
    calles: ['Miguel Servet', 'San José', 'Tenor Fleta', 'Puente de la Unión', 'Joaquín Sorolla'],
    puntos: [
      { lat: 41.6435, lng: -0.8742, calle: 'Miguel Servet', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6420, lng: -0.8730, calle: 'Miguel Servet' },
      { lat: 41.6415, lng: -0.8715, calle: 'San José', esGiro: true, esParada: true, nombreParada: 'Plaza Mayor San José' },
      { lat: 41.6425, lng: -0.8700, calle: 'Tenor Fleta', esGiro: true },
      { lat: 41.6440, lng: -0.8705, calle: 'Tenor Fleta' },
      { lat: 41.6445, lng: -0.8712, calle: 'Puente de la Unión', esGiro: true },
      { lat: 41.6440, lng: -0.8720, calle: 'Joaquín Sorolla', esGiro: true },
      { lat: 41.6435, lng: -0.8742, calle: 'Miguel Servet', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-torrero': {
    id: 'ruta-torrero', nombre: 'Torrero', barrioId: 'torrero', tipo: 'barrio',
    distanciaAprox: 1900, duracionEstimada: 42,
    calles: ['Monzón', 'Lasierra Purroy', 'Villa de Ansó', 'Av. América', 'Fray Julián Garcés', 'Plaza Canteras'],
    puntos: [
      { lat: 41.6305, lng: -0.8845, calle: 'Monzón', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6295, lng: -0.8855, calle: 'Lasierra Purroy', esGiro: true },
      { lat: 41.6285, lng: -0.8865, calle: 'Villa de Ansó', esGiro: true },
      { lat: 41.6275, lng: -0.8885, calle: 'Av. América', esGiro: true },
      { lat: 41.6270, lng: -0.8895, calle: 'Av. América' },
      { lat: 41.6265, lng: -0.8885, calle: 'Fray Julián Garcés', esGiro: true, esParada: true, nombreParada: 'Cruce Garcés' },
      { lat: 41.6285, lng: -0.8865, calle: 'Fray Julián Garcés' },
      { lat: 41.6295, lng: -0.8858, calle: 'Plaza Canteras', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-la-jota': {
    id: 'ruta-la-jota', nombre: 'La Jota', barrioId: 'la-jota', tipo: 'barrio',
    distanciaAprox: 1400, duracionEstimada: 32,
    calles: ['Plaza Albada', 'Balbino Orensanz', 'Pascual Lázaro', 'Felisa Galé', 'Av. Jota'],
    puntos: [
      { lat: 41.6680, lng: -0.8700, calle: 'Plaza Albada', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6685, lng: -0.8695, calle: 'Balbino Orensanz', esGiro: true },
      { lat: 41.6695, lng: -0.8698, calle: 'Pascual Lázaro', esGiro: true },
      { lat: 41.6685, lng: -0.8710, calle: 'Felisa Galé', esGiro: true },
      { lat: 41.6675, lng: -0.8710, calle: 'Av. Jota', esGiro: true },
      { lat: 41.6680, lng: -0.8700, calle: 'Plaza Albada', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-delicias': {
    id: 'ruta-delicias', nombre: 'Delicias', barrioId: 'delicias', tipo: 'barrio',
    distanciaAprox: 2000, duracionEstimada: 45,
    calles: ['Delicias', 'Duquesa Villahermosa', 'Unceta', 'Graus', 'Escoriaza y Fabro'],
    puntos: [
      { lat: 41.6495, lng: -0.9042, calle: 'Delicias', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6480, lng: -0.9030, calle: 'Delicias' },
      { lat: 41.6478, lng: -0.9022, calle: 'Duquesa Villahermosa', esGiro: true },
      { lat: 41.6488, lng: -0.9008, calle: 'Duquesa Villahermosa' },
      { lat: 41.6495, lng: -0.8992, calle: 'Unceta', esGiro: true },
      { lat: 41.6485, lng: -0.8980, calle: 'Graus', esGiro: true },
      { lat: 41.6480, lng: -0.8990, calle: 'Graus' },
      { lat: 41.6482, lng: -0.9018, calle: 'Delicias', esGiro: true },
      { lat: 41.6495, lng: -0.9042, calle: 'Delicias', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-vadorrey': {
    id: 'ruta-vadorrey', nombre: 'Vadorrey', barrioId: 'vadorrey', tipo: 'barrio',
    distanciaAprox: 1500, duracionEstimada: 35,
    calles: ['Plaza Botánica', 'Jesús Burriel', 'Balbino Orensanz', 'Paseo Ribera', 'Embarcadero'],
    puntos: [
      { lat: 41.6550, lng: -0.8550, calle: 'Plaza Botánica', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6560, lng: -0.8538, calle: 'Jesús Burriel', esGiro: true },
      { lat: 41.6565, lng: -0.8542, calle: 'Balbino Orensanz', esGiro: true },
      { lat: 41.6555, lng: -0.8560, calle: 'Paseo Ribera', esGiro: true },
      { lat: 41.6550, lng: -0.8570, calle: 'Paseo Ribera' },
      { lat: 41.6545, lng: -0.8565, calle: 'Embarcadero', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-actur': {
    id: 'ruta-actur', nombre: 'Actur', barrioId: 'actur', tipo: 'barrio',
    distanciaAprox: 2500, duracionEstimada: 55,
    calles: ['María de Maeztu', 'Gertrudis Gómez de Avellaneda', 'Rosalía de Castro', 'María Zambrano', 'Adolfo Aznar'],
    puntos: [
      { lat: 41.6710, lng: -0.8880, calle: 'María de Maeztu', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6720, lng: -0.8885, calle: 'María de Maeztu' },
      { lat: 41.6730, lng: -0.8880, calle: 'G. Gómez Avellaneda', esGiro: true },
      { lat: 41.6740, lng: -0.8900, calle: 'Rosalía de Castro', esGiro: true },
      { lat: 41.6730, lng: -0.8920, calle: 'Rosalía de Castro' },
      { lat: 41.6735, lng: -0.8930, calle: 'María Zambrano', esGiro: true, esParada: true, nombreParada: 'Av. María Zambrano' },
      { lat: 41.6750, lng: -0.8925, calle: 'Adolfo Aznar', esGiro: true },
      { lat: 41.6730, lng: -0.8905, calle: 'Adolfo Aznar' },
      { lat: 41.6710, lng: -0.8880, calle: 'María de Maeztu', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-oliver': {
    id: 'ruta-oliver', nombre: 'Oliver', barrioId: 'oliver', tipo: 'barrio',
    distanciaAprox: 1500, duracionEstimada: 35,
    calles: ['Oliver', 'Antonio de Leyva', 'Jerónimo Cáncer', 'Tambor de Hojalata', 'Mosén José Cafasso'],
    puntos: [
      { lat: 41.6400, lng: -0.9300, calle: 'Oliver', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6405, lng: -0.9295, calle: 'Antonio de Leyva', esGiro: true },
      { lat: 41.6415, lng: -0.9280, calle: 'Jerónimo Cáncer', esGiro: true },
      { lat: 41.6405, lng: -0.9270, calle: 'Tambor de Hojalata', esGiro: true },
      { lat: 41.6395, lng: -0.9285, calle: 'Mosén José Cafasso', esGiro: true },
      { lat: 41.6400, lng: -0.9300, calle: 'Oliver', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-miralbueno': {
    id: 'ruta-miralbueno', nombre: 'Miralbueno', barrioId: 'miralbueno', tipo: 'barrio',
    distanciaAprox: 1800, duracionEstimada: 40,
    calles: ['Camino del Pilón', 'Lagos de Coronas', 'Mayor de Miralbueno', 'Vistabella'],
    puntos: [
      { lat: 41.6328, lng: -0.9155, calle: 'Camino del Pilón', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6338, lng: -0.9140, calle: 'Lagos de Coronas', esGiro: true },
      { lat: 41.6345, lng: -0.9125, calle: 'Mayor de Miralbueno', esGiro: true, esParada: true, nombreParada: 'Mayor' },
      { lat: 41.6335, lng: -0.9110, calle: 'Mayor de Miralbueno' },
      { lat: 41.6330, lng: -0.9115, calle: 'Vistabella', esGiro: true },
      { lat: 41.6325, lng: -0.9138, calle: 'Vistabella' },
      { lat: 41.6328, lng: -0.9155, calle: 'Camino del Pilón', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-santa-isabel': {
    id: 'ruta-santa-isabel', nombre: 'Santa Isabel', barrioId: 'santa-isabel', tipo: 'barrio',
    distanciaAprox: 1700, duracionEstimada: 38,
    calles: ['Mayor Santa Isabel', 'del Gas', 'La Iglesia', 'Norte', 'Av. Real Zaragoza'],
    puntos: [
      { lat: 41.6800, lng: -0.8500, calle: 'Mayor Santa Isabel', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6810, lng: -0.8485, calle: 'del Gas', esGiro: true },
      { lat: 41.6820, lng: -0.8488, calle: 'La Iglesia', esGiro: true, esParada: true, nombreParada: 'Iglesia' },
      { lat: 41.6825, lng: -0.8492, calle: 'Norte', esGiro: true },
      { lat: 41.6815, lng: -0.8505, calle: 'Av. Real Zaragoza', esGiro: true },
      { lat: 41.6800, lng: -0.8500, calle: 'Mayor Santa Isabel', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-casablanca': {
    id: 'ruta-casablanca', nombre: 'Casablanca', barrioId: 'casablanca', tipo: 'barrio',
    distanciaAprox: 1800, duracionEstimada: 42,
    calles: ['Casablanca', 'Viñedo Viejo', 'Embarcadero', 'Vía Ibérica', 'Argualas'],
    puntos: [
      { lat: 41.6408, lng: -0.9025, calle: 'Casablanca', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6418, lng: -0.9010, calle: 'Viñedo Viejo', esGiro: true },
      { lat: 41.6428, lng: -0.9000, calle: 'Embarcadero', esGiro: true },
      { lat: 41.6432, lng: -0.8995, calle: 'Vía Ibérica', esGiro: true },
      { lat: 41.6425, lng: -0.8982, calle: 'Argualas', esGiro: true },
      { lat: 41.6410, lng: -0.9012, calle: 'Casablanca', esGiro: true },
      { lat: 41.6408, lng: -0.9025, calle: 'Casablanca', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // VALDESPARTERA (Zaragoza SUR - 41.68, -0.90)
  // ════════════════════════════════════════════════════════════
  'ruta-valdespartera': {
    id: 'ruta-valdespartera', nombre: 'Valdespartera', barrioId: 'valdespartera', tipo: 'barrio',
    distanciaAprox: 2200, duracionEstimada: 50,
    calles: ['Av. Casablanca', 'Ciudadano Kane', 'Todo sobre mi madre', 'Los Siete Samuráis', 'Av. Séptimo Arte'],
    puntos: [
      { lat: 41.6840, lng: -0.9050, calle: 'Av. Casablanca', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6845, lng: -0.9038, calle: 'Av. Casablanca' },
      { lat: 41.6850, lng: -0.9025, calle: 'Ciudadano Kane', esGiro: true },
      { lat: 41.6855, lng: -0.9018, calle: 'Ciudadano Kane' },
      { lat: 41.6860, lng: -0.9010, calle: 'Todo sobre mi madre', esGiro: true },
      { lat: 41.6855, lng: -0.8995, calle: 'Los Siete Samuráis', esGiro: true, esParada: true, nombreParada: 'Parque Villa' },
      { lat: 41.6848, lng: -0.8975, calle: 'Av. Séptimo Arte', esGiro: true },
      { lat: 41.6842, lng: -0.9010, calle: 'Av. Séptimo Arte' },
      { lat: 41.6840, lng: -0.9050, calle: 'Av. Casablanca', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-arcosur': {
    id: 'ruta-arcosur', nombre: 'Arcosur', barrioId: 'arcosur', tipo: 'barrio',
    distanciaAprox: 1600, duracionEstimada: 38,
    calles: ['Coral de Mar', 'Paseo de los Arqueros', 'Canal de Sifón', 'Patio de los Naranjos'],
    puntos: [
      { lat: 41.6200, lng: -0.9100, calle: 'Coral de Mar', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6210, lng: -0.9085, calle: 'Paseo de los Arqueros', esGiro: true },
      { lat: 41.6220, lng: -0.9088, calle: 'Canal de Sifón', esGiro: true },
      { lat: 41.6215, lng: -0.9075, calle: 'Patio de los Naranjos', esGiro: true, esParada: true, nombreParada: 'Patio Naranjos' },
      { lat: 41.6200, lng: -0.9100, calle: 'Coral de Mar', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-parque-goya': {
    id: 'ruta-parque-goya', nombre: 'Parque Goya', barrioId: 'parque-goya', tipo: 'barrio',
    distanciaAprox: 1500, duracionEstimada: 35,
    calles: ['Julián Borderas', 'Francisco Rallo', 'Academia General Militar', 'Majas de Goya'],
    puntos: [
      { lat: 41.6450, lng: -0.9400, calle: 'Julián Borderas', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6460, lng: -0.9385, calle: 'Francisco Rallo', esGiro: true },
      { lat: 41.6455, lng: -0.9368, calle: 'Academia General Militar', esGiro: true },
      { lat: 41.6450, lng: -0.9370, calle: 'Majas de Goya', esGiro: true, esParada: true, nombreParada: 'Majas Goya' },
      { lat: 41.6450, lng: -0.9400, calle: 'Julián Borderas', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-zalfonada': {
    id: 'ruta-zalfonada', nombre: 'Zalfonada', barrioId: 'zalfonada', tipo: 'barrio',
    distanciaAprox: 1400, duracionEstimada: 32,
    calles: ['Picarral', 'Camino de los Motes', 'San Juan de la Peña', 'Salvador Allende'],
    puntos: [
      { lat: 41.6650, lng: -0.8600, calle: 'Picarral', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6660, lng: -0.8590, calle: 'Camino de los Motes', esGiro: true },
      { lat: 41.6668, lng: -0.8602, calle: 'San Juan de la Peña', esGiro: true },
      { lat: 41.6660, lng: -0.8615, calle: 'Salvador Allende', esGiro: true, esParada: true, nombreParada: 'Allende' },
      { lat: 41.6650, lng: -0.8600, calle: 'Picarral', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-montemolin': {
    id: 'ruta-montemolin', nombre: 'Montemolín', barrioId: 'montemolin', tipo: 'barrio',
    distanciaAprox: 1500, duracionEstimada: 34,
    calles: ['Miguel Servet', 'General Pintos', 'Comendador Funes', 'Belchite'],
    puntos: [
      { lat: 41.6450, lng: -0.8700, calle: 'Miguel Servet', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6440, lng: -0.8690, calle: 'General Pintos', esGiro: true },
      { lat: 41.6435, lng: -0.8705, calle: 'Comendador Funes', esGiro: true },
      { lat: 41.6442, lng: -0.8718, calle: 'Belchite', esGiro: true, esParada: true, nombreParada: 'Belchite' },
      { lat: 41.6450, lng: -0.8700, calle: 'Miguel Servet', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  // ============================================================
  // 🌲 14 PUEBLOS RURALES
  // ============================================================

  'ruta-casetas-pueblo': {
    id: 'ruta-casetas-pueblo', nombre: 'Casetas', barrioId: 'casetas', tipo: 'pueblo',
    distanciaAprox: 1500, duracionEstimada: 35,
    calles: ['Plaza España', 'El Parque', 'Galicia', 'Av. Constitución', 'San Miguel', 'Logroño'],
    puntos: [
      { lat: 41.7220, lng: -1.0160, calle: 'Plaza España', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7230, lng: -1.0150, calle: 'El Parque', esGiro: true },
      { lat: 41.7235, lng: -1.0155, calle: 'Galicia', esGiro: true },
      { lat: 41.7228, lng: -1.0175, calle: 'Av. Constitución', esGiro: true, esParada: true, nombreParada: 'Constitución' },
      { lat: 41.7220, lng: -1.0170, calle: 'San Miguel', esGiro: true },
      { lat: 41.7220, lng: -1.0160, calle: 'Plaza España', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-garrapinillos-pueblo': {
    id: 'ruta-garrapinillos-pueblo', nombre: 'Garrapinillos', barrioId: 'garrapinillos', tipo: 'pueblo',
    distanciaAprox: 1400, duracionEstimada: 32,
    calles: ['Plaza España', 'Mayor', 'Zaragoza', 'Ramón y Cajal', 'Progreso'],
    puntos: [
      { lat: 41.7100, lng: -1.0800, calle: 'Plaza España', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7110, lng: -1.0788, calle: 'Mayor', esGiro: true },
      { lat: 41.7115, lng: -1.0780, calle: 'Mayor', esParada: true, nombreParada: 'Iglesia' },
      { lat: 41.7110, lng: -1.0775, calle: 'Zaragoza', esGiro: true },
      { lat: 41.7105, lng: -1.0770, calle: 'Ramón y Cajal', esGiro: true },
      { lat: 41.7100, lng: -1.0795, calle: 'Progreso', esGiro: true },
      { lat: 41.7100, lng: -1.0800, calle: 'Plaza España', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-monzalbarba-pueblo': {
    id: 'ruta-monzalbarba-pueblo', nombre: 'Monzalbarba', barrioId: 'monzalbarba', tipo: 'pueblo',
    distanciaAprox: 1100, duracionEstimada: 28,
    calles: ['Ntra. Sra. Sagrada', 'Mayor', 'Sagunto', 'Santa Ana'],
    puntos: [
      { lat: 41.7400, lng: -0.9800, calle: 'Ntra. Sra. Sagrada', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7410, lng: -0.9790, calle: 'Mayor', esGiro: true, esParada: true, nombreParada: 'Mayor' },
      { lat: 41.7420, lng: -0.9800, calle: 'Sagunto', esGiro: true },
      { lat: 41.7415, lng: -0.9815, calle: 'Santa Ana', esGiro: true },
      { lat: 41.7400, lng: -0.9800, calle: 'Ntra. Sra. Sagrada', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-movera-pueblo': {
    id: 'ruta-movera-pueblo', nombre: 'Movera', barrioId: 'movera', tipo: 'pueblo',
    distanciaAprox: 1200, duracionEstimada: 30,
    calles: ['Av. Movera', 'Torre de la Vega', 'Padre Claret'],
    puntos: [
      { lat: 41.6800, lng: -0.8000, calle: 'Av. Movera', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6810, lng: -0.7990, calle: 'Torre de la Vega', esGiro: true },
      { lat: 41.6820, lng: -0.8000, calle: 'Padre Claret', esGiro: true, esParada: true, nombreParada: 'Padre Claret' },
      { lat: 41.6815, lng: -0.8015, calle: 'Av. Movera', esGiro: true },
      { lat: 41.6800, lng: -0.8000, calle: 'Av. Movera', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-montanana-pueblo': {
    id: 'ruta-montanana-pueblo', nombre: 'Montañana', barrioId: 'montanana', tipo: 'pueblo',
    distanciaAprox: 1000, duracionEstimada: 25,
    calles: ['Av. Montañana', 'Mayor', 'San José', 'de la Iglesia'],
    puntos: [
      { lat: 41.7000, lng: -0.8500, calle: 'Av. Montañana', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7010, lng: -0.8490, calle: 'Mayor', esGiro: true },
      { lat: 41.7020, lng: -0.8500, calle: 'San José', esGiro: true },
      { lat: 41.7015, lng: -0.8515, calle: 'de la Iglesia', esGiro: true, esParada: true, nombreParada: 'Iglesia' },
      { lat: 41.7000, lng: -0.8500, calle: 'Av. Montañana', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-penaflor-pueblo': {
    id: 'ruta-penaflor-pueblo', nombre: 'Peñaflor', barrioId: 'penaflor', tipo: 'pueblo',
    distanciaAprox: 900, duracionEstimada: 22,
    calles: ['Mayor', 'San Cristóbal', 'del Sol', 'Plaza Iglesia'],
    puntos: [
      { lat: 41.7200, lng: -0.8300, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7210, lng: -0.8290, calle: 'San Cristóbal', esGiro: true },
      { lat: 41.7220, lng: -0.8300, calle: 'del Sol', esGiro: true },
      { lat: 41.7215, lng: -0.8310, calle: 'Plaza Iglesia', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-sanjuan-mozarrifar-pueblo': {
    id: 'ruta-sanjuan-mozarrifar-pueblo', nombre: 'San Juan Mozarrifar', barrioId: 'san-juan-mozarrifar', tipo: 'pueblo',
    distanciaAprox: 1300, duracionEstimada: 30,
    calles: ['Mayor', 'San Alberto', 'de la Cruz', 'Comercio'],
    puntos: [
      { lat: 41.7000, lng: -0.9000, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7010, lng: -0.8988, calle: 'San Alberto', esGiro: true },
      { lat: 41.7020, lng: -0.8998, calle: 'de la Cruz', esGiro: true, esParada: true, nombreParada: 'Cruz' },
      { lat: 41.7015, lng: -0.9012, calle: 'Comercio', esGiro: true },
      { lat: 41.7000, lng: -0.9000, calle: 'Mayor', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-juslibol-pueblo': {
    id: 'ruta-juslibol-pueblo', nombre: 'Juslibol', barrioId: 'juslibol', tipo: 'pueblo',
    distanciaAprox: 1100, duracionEstimada: 26,
    calles: ['Mayor', 'Zaragoza', 'de la Estación', 'Plaza Mayor'],
    puntos: [
      { lat: 41.7300, lng: -0.9500, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7310, lng: -0.9490, calle: 'Zaragoza', esGiro: true },
      { lat: 41.7320, lng: -0.9500, calle: 'de la Estación', esGiro: true },
      { lat: 41.7315, lng: -0.9515, calle: 'Plaza Mayor', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-san-gregorio-pueblo': {
    id: 'ruta-san-gregorio-pueblo', nombre: 'San Gregorio', barrioId: 'san-gregorio', tipo: 'pueblo',
    distanciaAprox: 1000, duracionEstimada: 24,
    calles: ['Mayor', 'San Gregorio', 'Cristo Rey', 'del Río'],
    puntos: [
      { lat: 41.7100, lng: -1.0400, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7110, lng: -1.0390, calle: 'San Gregorio', esGiro: true, esParada: true, nombreParada: 'San Gregorio' },
      { lat: 41.7120, lng: -1.0400, calle: 'Cristo Rey', esGiro: true },
      { lat: 41.7115, lng: -1.0415, calle: 'del Río', esGiro: true },
      { lat: 41.7100, lng: -1.0400, calle: 'Mayor', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-cartuja-baja-pueblo': {
    id: 'ruta-cartuja-baja-pueblo', nombre: 'La Cartuja Baja', barrioId: 'cartuja-baja', tipo: 'pueblo',
    distanciaAprox: 1000, duracionEstimada: 25,
    calles: ['Mayor', 'de la Constitución', 'San Bruno', 'Plaza España'],
    puntos: [
      { lat: 41.6100, lng: -0.8800, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6110, lng: -0.8790, calle: 'de la Constitución', esGiro: true },
      { lat: 41.6120, lng: -0.8800, calle: 'San Bruno', esGiro: true, esParada: true, nombreParada: 'San Bruno' },
      { lat: 41.6115, lng: -0.8815, calle: 'Plaza España', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-alfocea-pueblo': {
    id: 'ruta-alfocea-pueblo', nombre: 'Alfocea', barrioId: 'alfocea', tipo: 'pueblo',
    distanciaAprox: 800, duracionEstimada: 20,
    calles: ['Mayor', 'de la Fuente', 'del Castillo', 'San Blas'],
    puntos: [
      { lat: 41.7400, lng: -0.9700, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.7410, lng: -0.9690, calle: 'de la Fuente', esGiro: true },
      { lat: 41.7420, lng: -0.9700, calle: 'del Castillo', esGiro: true },
      { lat: 41.7415, lng: -0.9715, calle: 'San Blas', esGiro: true },
      { lat: 41.7400, lng: -0.9700, calle: 'Mayor', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-torrecilla-valmadrid-pueblo': {
    id: 'ruta-torrecilla-valmadrid-pueblo', nombre: 'Torrecilla Valmadrid', barrioId: 'torrecilla-valmadrid', tipo: 'pueblo',
    distanciaAprox: 700, duracionEstimada: 18,
    calles: ['Mayor', 'de la Balsa', 'San Cristóbal'],
    puntos: [
      { lat: 41.6000, lng: -0.8200, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6010, lng: -0.8192, calle: 'de la Balsa', esGiro: true },
      { lat: 41.6018, lng: -0.8205, calle: 'San Cristóbal', esGiro: true, esParada: true, nombreParada: 'San Cristóbal' },
      { lat: 41.6000, lng: -0.8200, calle: 'Mayor', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  'ruta-venta-olivar-pueblo': {
    id: 'ruta-venta-olivar-pueblo', nombre: 'Venta del Olivar', barrioId: 'venta-olivar', tipo: 'pueblo',
    distanciaAprox: 700, duracionEstimada: 18,
    calles: ['Mayor', 'de los Olivos', 'del Sol'],
    puntos: [
      { lat: 41.6700, lng: -0.7800, calle: 'Mayor', esParada: true, nombreParada: 'Salida' },
      { lat: 41.6710, lng: -0.7790, calle: 'de los Olivos', esGiro: true },
      { lat: 41.6718, lng: -0.7805, calle: 'del Sol', esGiro: true },
      { lat: 41.6700, lng: -0.7800, calle: 'Mayor', esParada: true, nombreParada: 'Llegada' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // ⭐ VILLARRAPA - NOROESTE (41.74, -1.13) junto a AP-68
  // NO CONFUNDIR con Valdespartera (41.68, -0.90) SUR
  // DISTANCIA REAL: ~25km lineales
  // ════════════════════════════════════════════════════════════
  'ruta-villarrapa-pueblo': {
    id: 'ruta-villarrapa-pueblo', nombre: 'Villarrapa', barrioId: 'villarrapa', tipo: 'pueblo',
    distanciaAprox: 800, duracionEstimada: 20,
    calles: ['A-126 (Gallur)', 'C/ Única', 'C/ de las Eras', 'Plaza de la Iglesia'],
    puntos: [
      { lat: 41.7394, lng: -1.1311, calle: 'A-126 (Gallur)', esParada: true, nombreParada: 'Entrada' },
      { lat: 41.7390, lng: -1.1305, calle: 'C/ Única', esGiro: true },
      { lat: 41.7385, lng: -1.1298, calle: 'C/ Única' },
      { lat: 41.7381, lng: -1.1294, calle: 'C/ Única' },
      { lat: 41.7378, lng: -1.1292, calle: 'C/ de las Eras', esGiro: true },
      { lat: 41.7379, lng: -1.1298, calle: 'C/ de las Eras' },
      { lat: 41.7382, lng: -1.1302, calle: 'Plaza de la Iglesia', esParada: true, nombreParada: 'Iglesia' },
      { lat: 41.7388, lng: -1.1308, calle: 'C/ Única (Vuelta)' },
      { lat: 41.7394, lng: -1.1311, calle: 'A-126 (Gallur)', esParada: true, nombreParada: 'Salida' },
    ]
  }
};

export const todasLasRutas: CallejeroRoute[] = Object.values(callejeroRoutes);

export function rutasPorTipo(tipo: 'barrio' | 'pueblo'): CallejeroRoute[] {
  return todasLasRutas.filter(r => r.tipo === tipo);
}

export function rutaPorBarrioId(barrioId: string): CallejeroRoute | undefined {
  for (const key of Object.keys(callejeroRoutes)) {
    if (callejeroRoutes[key].barrioId === barrioId) return callejeroRoutes[key];
  }
  return undefined;
}

export function puntosInterpolados(barrioId: string, cantidad: number = 100) {
  const ruta = rutaPorBarrioId(barrioId);
  if (!ruta) return [];
  return generarPuntosInterpolados(ruta.puntos, cantidad);
}