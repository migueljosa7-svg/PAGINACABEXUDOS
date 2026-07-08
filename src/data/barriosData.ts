export interface Neighborhood {
  id: string;
  name: string;
  description: string;
  zona: 'barrio' | 'pueblo';
  lat: number;
  lng: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  streetName: string;
  isStop?: boolean;
}

export interface NeighborhoodRoute {
  id: string;
  name: string;
  barrioId: string;
  barrioName: string;
  type: 'municipal' | 'barrio';
  category: 'gigante' | 'cabezudo';
  dateString: string;
  timeString: string;
  distance: number; // in meters
  duration: number; // in minutes
  streets: string[];
  description: string;
  points: RoutePoint[];
  characterId: string; // The character running this route (e.g. 'morico', 'rey')
  characterName: string;
  characterEmoji: string;
  color: string; // The color representation for map polylines
}

export const zaragozaNeighborhoods: Neighborhood[] = [
  // BARRIOS URBANOS
  { id: 'casco-historico', name: 'Casco Histórico', description: 'El corazón medieval y romano de Zaragoza, que incluye el Tubo y la Plaza del Pilar.', zona: 'barrio', lat: 41.6568, lng: -0.8783 },
  { id: 'centro', name: 'Centro', description: 'El distrito comercial y financiero principal, estructurado en torno al Paseo de la Independencia.', zona: 'barrio', lat: 41.6520, lng: -0.8800 },
  { id: 'arrabal-rabal', name: 'El Arrabal', description: 'Barrio histórico situado en la margen izquierda del río Ebro, con orígenes obreros y agrícolas.', zona: 'barrio', lat: 41.6625, lng: -0.8765 },
  { id: 'delicias', name: 'Delicias', description: 'El barrio más poblado y multicultural de Zaragoza, lleno de vida comercial.', zona: 'barrio', lat: 41.6515, lng: -0.9080 },
  { id: 'las-fuentes', name: 'Las Fuentes', description: 'Barrio residencial delimitado por los ríos Ebro y Huerva, fundado a mediados del siglo XX.', zona: 'barrio', lat: 41.6492, lng: -0.8655 },
  { id: 'san-jose', name: 'San José', description: 'Un barrio de gran tradición vecinal e industrial que se ha transformado en residencial.', zona: 'barrio', lat: 41.6435, lng: -0.8742 },
  { id: 'torrero', name: 'Torrero-La Paz', description: 'Histórico barrio delimitado por el Canal Imperial de Aragón, conocido por su carácter rebelde.', zona: 'barrio', lat: 41.6295, lng: -0.8858 },
  { id: 'actur', name: 'Actur - Rey Fernando', description: 'Barrio moderno surgido en los años 70 y 80, sede de la Expo 2008 y del Parque del Agua.', zona: 'barrio', lat: 41.6705, lng: -0.8885 },
  { id: 'oliver-valdefierro', name: 'Oliver - Valdefierro', description: 'Zona en expansión con amplias zonas verdes como el Corredor Verde.', zona: 'barrio', lat: 41.6400, lng: -0.9300 },
  { id: 'santa-isabel', name: 'Santa Isabel', description: 'Barrio periférico con origen de núcleo rural que conserva sus fiestas tradicionales.', zona: 'barrio', lat: 41.6800, lng: -0.8500 },
  { id: 'almozara', name: 'La Almozara', description: 'Barrio joven y muy activo, ligado a la vida cultural y deportiva de la zona norte de Zaragoza.', zona: 'barrio', lat: 41.6605, lng: -0.9160 },
  { id: 'san-pablo', name: 'San Pablo (El Gancho)', description: 'Barrio castizo y popular con su famosa plaza y mercado tradicional.', zona: 'barrio', lat: 41.6530, lng: -0.8850 },
  { id: 'la-jota', name: 'La Jota', description: 'Barrio de la margen izquierda del Ebro, conocido por su ambiente festivo.', zona: 'barrio', lat: 41.6680, lng: -0.8700 },
  { id: 'vadorrey', name: 'Vadorrey', description: 'Barrio de perfil residencial y familiar con un ambiente de fiesta muy cercano a los vecinos.', zona: 'barrio', lat: 41.6550, lng: -0.8550 },
  { id: 'casablanca', name: 'Casablanca', description: 'Barrio de tradición obrera y gran ambiente popular, muy vinculado a las comparsas de barrio.', zona: 'barrio', lat: 41.6408, lng: -0.9025 },
  { id: 'miralbueno', name: 'Miralbueno', description: 'Zona residencial y universitaria con calles estrechas y un ambiente festivo muy familiar.', zona: 'barrio', lat: 41.6328, lng: -0.9155 },
  { id: 'valdespartera', name: 'Valdespartera', description: 'Barrio moderno que reúne vida urbana, verdes y una importante presencia de familias jóvenes.', zona: 'barrio', lat: 41.6840, lng: -0.9050 },
  { id: 'arcosur', name: 'Arcosur', description: 'Barrio en plena expansión al sur de Zaragoza, con una población joven y dinámica.', zona: 'barrio', lat: 41.6200, lng: -0.9100 },
  { id: 'parque-goya', name: 'Parque Goya', description: 'Barrio residencial de la zona oeste con amplias zonas verdes.', zona: 'barrio', lat: 41.6450, lng: -0.9400 },
  { id: 'zalfonada', name: 'Zalfonada (Picarral)', description: 'Barrio tranquilo y familiar en la zona norte de Zaragoza.', zona: 'barrio', lat: 41.6650, lng: -0.8600 },
  { id: 'montemolin', name: 'Montemolín', description: 'Zona alta de Las Fuentes, en torno a la avenida de Miguel Servet.', zona: 'barrio', lat: 41.6450, lng: -0.8700 },
  { id: 'magdalena', name: 'La Magdalena', description: 'Zona histórica de huertos y viviendas tradicionales que conserva la memoria de la antigua Zaragoza.', zona: 'barrio', lat: 41.6540, lng: -0.8750 },
  { id: 'universidad', name: 'Universidad', description: 'Barrio universitario y joven, donde las fiestas de barrio se mezclan con la vida estudiantil.', zona: 'barrio', lat: 41.6480, lng: -0.8850 },
  // PUEBLOS RURALES
  { id: 'casetas', name: 'Casetas', description: 'La pedanía más grande y poblada del municipio de Zaragoza.', zona: 'pueblo', lat: 41.7200, lng: -1.0200 },
  { id: 'garrapinillos', name: 'Garrapinillos', description: 'Pedanía del oeste de Zaragoza junto al aeropuerto.', zona: 'pueblo', lat: 41.7100, lng: -1.0800 },
  { id: 'monzalbarba', name: 'Monzalbarba', description: 'Pedanía del noroeste a orillas del Canal Imperial.', zona: 'pueblo', lat: 41.7400, lng: -0.9800 },
  { id: 'movera', name: 'Movera', description: 'Pedanía del este de Zaragoza junto al Ebro.', zona: 'pueblo', lat: 41.6800, lng: -0.8000 },
  { id: 'montanana', name: 'Montañana', description: 'Pedanía del norte en un entorno de huerta y monte bajo.', zona: 'pueblo', lat: 41.7000, lng: -0.8500 },
  { id: 'penaflor', name: 'Peñaflor', description: 'Pequeña pedanía del norte de Zaragoza.', zona: 'pueblo', lat: 41.7200, lng: -0.8300 },
  { id: 'san-juan-mozarrifar', name: 'San Juan de Mozarrifar', description: 'Pedanía del norte con fuerte identidad vecinal.', zona: 'pueblo', lat: 41.7000, lng: -0.9000 },
  { id: 'juslibol', name: 'Juslibol', description: 'Pedanía del noroeste a orillas del Ebro, famosa por su monasterio.', zona: 'pueblo', lat: 41.7300, lng: -0.9500 },
  { id: 'san-gregorio', name: 'San Gregorio', description: 'Pedanía del oeste de Zaragoza.', zona: 'pueblo', lat: 41.7100, lng: -1.0400 },
  { id: 'cartuja-baja', name: 'La Cartuja Baja', description: 'Pedanía del sur que toma su nombre del antiguo monasterio cartujo.', zona: 'pueblo', lat: 41.6100, lng: -0.8800 },
  { id: 'alfocea', name: 'Alfocea', description: 'Pequeña pedanía del noroeste junto al Ebro.', zona: 'pueblo', lat: 41.7400, lng: -0.9700 },
  { id: 'torrecilla-valmadrid', name: 'Torrecilla de Valmadrid', description: 'Pequeña pedanía del sureste de Zaragoza.', zona: 'pueblo', lat: 41.6000, lng: -0.8200 },
  { id: 'venta-olivar', name: 'Venta del Olivar', description: 'Pequeña pedanía del este de Zaragoza.', zona: 'pueblo', lat: 41.6700, lng: -0.7800 },
  { id: 'villarrapa', name: 'Villarrapa', description: 'Pequeña pedanía del oeste de Zaragoza, en la margen derecha del Ebro.', zona: 'pueblo', lat: 41.6210, lng: -0.9300 }
];

export const neighborhoodRoutes: NeighborhoodRoute[] = [
  // MUNICIPAL ROUTES
  {
    id: 'route-pilar-principal',
    name: 'Gran Desfile del Pilar (Comparsa Municipal)',
    barrioId: 'casco-historico',
    barrioName: 'Casco Histórico',
    type: 'municipal',
    category: 'gigante',
    dateString: '12 de Octubre, 2026',
    timeString: '11:30',
    distance: 1450,
    duration: 40,
    streets: ['Plaza del Pilar', 'Calle Alfonso I', 'Plaza de España', 'El Coso', 'Calle Don Jaime I'],
    description: 'El recorrido oficial principal del día central de las fiestas, encabezado por los Gigantes y Reyes de la comparsa.',
    characterId: 'rey',
    characterName: 'Rey Don Jaime I',
    characterEmoji: '👑',
    color: '#D1121F',
    points: [
      { lat: 41.6568, lng: -0.8783, streetName: 'Plaza del Pilar (Salida)', isStop: true },
      { lat: 41.6562, lng: -0.8795, streetName: 'Plaza del Pilar (Frente al Ayuntamiento)' },
      { lat: 41.6560, lng: -0.8805, streetName: 'Calle Alfonso I' },
      { lat: 41.6542, lng: -0.8812, streetName: 'Calle Alfonso I (Cruce Manifestación)', isStop: true },
      { lat: 41.6521, lng: -0.8821, streetName: 'Calle Alfonso I' },
      { lat: 41.6508, lng: -0.8827, streetName: 'Plaza de España (Estatua)', isStop: true },
      { lat: 41.6515, lng: -0.8805, streetName: 'El Coso' },
      { lat: 41.6528, lng: -0.8778, streetName: 'Calle Don Jaime I' },
      { lat: 41.6548, lng: -0.8770, streetName: 'Calle Don Jaime I (Plaza Santa Cruz)', isStop: true },
      { lat: 41.6562, lng: -0.8765, streetName: 'Calle Don Jaime I' },
      { lat: 41.6568, lng: -0.8783, streetName: 'Plaza del Pilar (Llegada)', isStop: true }
    ]
  },
  {
    id: 'route-morico-pilar',
    name: 'Carrera del Morico (Comparsa Municipal)',
    barrioId: 'casco-historico',
    barrioName: 'Casco Histórico',
    type: 'municipal',
    category: 'cabezudo',
    dateString: '13 de Octubre, 2026',
    timeString: '17:30',
    distance: 1200,
    duration: 30,
    streets: ['Plaza del Pilar', 'Calle Don Jaime I', 'Calle Estébanes', 'Calle Alfonso I'],
    description: 'Recorrido de persecución rápida por el Tubo de Zaragoza y el Pilar, liderado por El Morico corriendo tras los niños.',
    characterId: 'morico',
    characterName: 'El Morico',
    characterEmoji: '🏇',
    color: '#D4AF37',
    points: [
      { lat: 41.6568, lng: -0.8783, streetName: 'Plaza del Pilar', isStop: true },
      { lat: 41.6561, lng: -0.8771, streetName: 'Calle Don Jaime I' },
      { lat: 41.6545, lng: -0.8777, streetName: 'Calle Don Jaime I (Plaza Ariño)', isStop: true },
      { lat: 41.6534, lng: -0.8783, streetName: 'Calle San Jorge' },
      { lat: 41.6528, lng: -0.8800, streetName: 'Plaza Santa Cruz', isStop: true },
      { lat: 41.6521, lng: -0.8812, streetName: 'Calle Cinegio (El Tubo)' },
      { lat: 41.6526, lng: -0.8825, streetName: 'Calle Estébanes (El Plata)', isStop: true },
      { lat: 41.6542, lng: -0.8812, streetName: 'Calle Alfonso I' },
      { lat: 41.6568, lng: -0.8783, streetName: 'Plaza del Pilar (Ayuntamiento)', isStop: true }
    ]
  },

  // NEIGHBORHOOD ROUTES - Barrios Urbanos
  {
    id: 'route-arrabal-azutero',
    name: 'Recorrido del Arrabal y San Gregorio',
    barrioId: 'arrabal-rabal',
    barrioName: 'El Arrabal',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '18 de Mayo, 2026',
    timeString: '18:00',
    distance: 1600,
    duration: 35,
    streets: ['Plaza del Pilar', 'Puente de Piedra', 'Calle Sobrarbe', 'Plaza del Rosario', 'Calle Sixto Celorrio'],
    description: 'Desfile folclórico que cruza el río Ebro, rindiendo homenaje al jotero El Azutero y los antiguos defensores del barrio.',
    characterId: 'azutero',
    characterName: 'El Azutero',
    characterEmoji: '🪕',
    color: '#7A1C2C',
    points: [
      { lat: 41.6568, lng: -0.8783, streetName: 'Plaza del Pilar (Ayuntamiento)', isStop: true },
      { lat: 41.6582, lng: -0.8772, streetName: 'Puente de Piedra (Margen Izquierda)' },
      { lat: 41.6601, lng: -0.8760, streetName: 'Plaza de la Mesa (Arrabal)', isStop: true },
      { lat: 41.6615, lng: -0.8752, streetName: 'Calle Sobrarbe' },
      { lat: 41.6625, lng: -0.8765, streetName: 'Plaza Rosario (Arrabal)', isStop: true },
      { lat: 41.6608, lng: -0.8780, streetName: 'Calle Sixto Celorrio' },
      { lat: 41.6582, lng: -0.8772, streetName: 'Puente de Piedra' },
      { lat: 41.6568, lng: -0.8783, streetName: 'Plaza del Pilar (Llegada)', isStop: true }
    ]
  },
  {
    id: 'route-delicias',
    name: 'Comparsa de Delicias y Parque Roma',
    barrioId: 'delicias',
    barrioName: 'Delicias',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '05 de Septiembre, 2026',
    timeString: '12:00',
    distance: 1800,
    duration: 45,
    streets: ['Avenida de Madrid', 'Calle Delicias', 'Parque de Roma', 'Calle Vicente Berdusán'],
    description: 'Un animado recorrido que atraviesa la calle peatonal Delicias y el Parque Roma, con carreras rápidas y música de dulzainas.',
    characterId: 'robaculeros',
    characterName: 'El Robaculeros',
    characterEmoji: '🎒',
    color: '#4CAF50',
    points: [
      { lat: 41.6515, lng: -0.9080, streetName: 'Avenida de Madrid (Inicio)', isStop: true },
      { lat: 41.6508, lng: -0.9055, streetName: 'Avenida de Madrid' },
      { lat: 41.6495, lng: -0.9042, streetName: 'Calle Delicias (Peatonal)', isStop: true },
      { lat: 41.6480, lng: -0.9030, streetName: 'Calle Delicias' },
      { lat: 41.6472, lng: -0.9015, streetName: 'Plaza de las Delicias', isStop: true },
      { lat: 41.6488, lng: -0.8988, streetName: 'Calle Escoriaza y Fabro' },
      { lat: 41.6502, lng: -0.8972, streetName: 'Parque de Roma (Estanque)', isStop: true },
      { lat: 41.6515, lng: -0.9080, streetName: 'Avenida de Madrid (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-las-fuentes',
    name: 'Recorrido Las Fuentes - Ribera del Ebro',
    barrioId: 'las-fuentes',
    barrioName: 'Las Fuentes',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '28 de Agosto, 2026',
    timeString: '18:30',
    distance: 1500,
    duration: 35,
    streets: ['Calle Compromiso de Caspe', 'Calle Rodrigo Rebolledo', 'Paseo Echegaray y Caballero', 'Parque Torre Ramona'],
    description: 'Desfile veraniego recorriendo el núcleo comercial de Las Fuentes y aproximándose al Parque de Torre Ramona.',
    characterId: 'pilara',
    characterName: 'La Pilara',
    characterEmoji: '🎤',
    color: '#E91E63',
    points: [
      { lat: 41.6492, lng: -0.8655, streetName: 'Calle Compromiso de Caspe', isStop: true },
      { lat: 41.6498, lng: -0.8622, streetName: 'Calle Rodrigo Rebolledo' },
      { lat: 41.6510, lng: -0.8610, streetName: 'Calle Doctor Iranzo', isStop: true },
      { lat: 41.6525, lng: -0.8620, streetName: 'Paseo Echegaray y Caballero' },
      { lat: 41.6518, lng: -0.8650, streetName: 'Parque de las Fuentes', isStop: true },
      { lat: 41.6482, lng: -0.8672, streetName: 'Parque Torre Ramona', isStop: true },
      { lat: 41.6492, lng: -0.8655, streetName: 'Calle Compromiso de Caspe (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-san-jose',
    name: 'Comparsa de San José - Tenor Fleta',
    barrioId: 'san-jose',
    barrioName: 'San José',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '04 de Octubre, 2026',
    timeString: '11:00',
    distance: 1650,
    duration: 40,
    streets: ['Avenida de San José', 'Avenida Tenor Fleta', 'Calle Miguel Servet', 'Plaza Mayor'],
    description: 'Desfile otoñal por las arterias residenciales de San José, con paradas especiales en la Plaza Mayor del barrio.',
    characterId: 'boticario',
    characterName: 'El Boticario',
    characterEmoji: '🧪',
    color: '#212121',
    points: [
      { lat: 41.6435, lng: -0.8742, streetName: 'Avenida de San José (Cruce Fleta)', isStop: true },
      { lat: 41.6420, lng: -0.8735, streetName: 'Avenida de San José' },
      { lat: 41.6405, lng: -0.8728, streetName: 'Calle Doce de Octubre' },
      { lat: 41.6415, lng: -0.8702, streetName: 'Plaza Mayor de San José', isStop: true },
      { lat: 41.6432, lng: -0.8698, streetName: 'Calle Miguel Servet' },
      { lat: 41.6448, lng: -0.8720, streetName: 'Avenida Tenor Fleta', isStop: true },
      { lat: 41.6435, lng: -0.8742, streetName: 'Avenida de San José (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-torrero',
    name: 'Desfile Torrero y Canal Imperial',
    barrioId: 'torrero',
    barrioName: 'Torrero-La Paz',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '14 de Junio, 2026',
    timeString: '12:00',
    distance: 1400,
    duration: 35,
    streets: ['Avenida de América', 'Paseo del Canal', 'Calle Villa de Ansó', 'Plaza de las Canteras'],
    description: 'Recorrido histórico bordeando el Canal Imperial de Aragón y finalizando con los bailes de gigantes en la Plaza de las Canteras.',
    characterId: 'tuerto',
    characterName: 'El Tuerto',
    characterEmoji: '👁️',
    color: '#37474F',
    points: [
      { lat: 41.6295, lng: -0.8858, streetName: 'Plaza de las Canteras', isStop: true },
      { lat: 41.6282, lng: -0.8865, streetName: 'Avenida de América' },
      { lat: 41.6265, lng: -0.8875, streetName: 'Avenida de América (Cruce Fray Julián Garcés)', isStop: true },
      { lat: 41.6258, lng: -0.8890, streetName: 'Calle San Juan de la Peña' },
      { lat: 41.6272, lng: -0.8905, streetName: 'Paseo del Canal (Bajo los Pinos)', isStop: true },
      { lat: 41.6285, lng: -0.8885, streetName: 'Calle Villa de Ansó' },
      { lat: 41.6295, lng: -0.8858, streetName: 'Plaza de las Canteras (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-actur',
    name: 'Comparsa Actur y Parque del Agua',
    barrioId: 'actur',
    barrioName: 'Actur',
    type: 'barrio',
    category: 'gigante',
    dateString: '20 de Septiembre, 2026',
    timeString: '17:00',
    distance: 2100,
    duration: 50,
    streets: ['Calle María Zambrano', 'Calle Poeta Luciano Gracia', 'Avenida de Ranillas', 'Parque del Agua'],
    description: 'Un extenso desfile en el barrio más moderno, recorriendo la ribera del Ebro y finalizando en las inmediaciones del Parque del Agua.',
    characterId: 'gaston',
    characterName: 'Gastón de Bearn',
    characterEmoji: '⚔️',
    color: '#1565C0',
    points: [
      { lat: 41.6705, lng: -0.8885, streetName: 'Calle María Zambrano (Grancasa)', isStop: true },
      { lat: 41.6738, lng: -0.8898, streetName: 'Calle María Zambrano' },
      { lat: 41.6755, lng: -0.8920, streetName: 'Calle Poeta Luciano Gracia (Escuela Ingeniería)', isStop: true },
      { lat: 41.6740, lng: -0.8962, streetName: 'Avenida de Ranillas' },
      { lat: 41.6720, lng: -0.8988, streetName: 'Avenida de Ranillas (Frente Fluvial)', isStop: true },
      { lat: 41.6705, lng: -0.8885, streetName: 'Calle María Zambrano (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-almozara',
    name: 'Recorrido de La Almozara',
    barrioId: 'almozara',
    barrioName: 'La Almozara',
    type: 'barrio',
    category: 'gigante',
    dateString: '18 de Julio, 2026',
    timeString: '20:00',
    distance: 1750,
    duration: 42,
    streets: ['Avenida de La Almozara', 'Calle de la Concordia', 'Parque de La Almozara', 'Calle de la Estación'],
    description: 'Una salida muy participativa por la avenida principal de La Almozara, con paradas en los parques y plazas vecinales.',
    characterId: 'almozara',
    characterName: 'La Almozara',
    characterEmoji: '🌳',
    color: '#2E7D32',
    points: [
      { lat: 41.6605, lng: -0.9160, streetName: 'Avenida de La Almozara (Salida)', isStop: true },
      { lat: 41.6615, lng: -0.9138, streetName: 'Calle de la Concordia' },
      { lat: 41.6620, lng: -0.9118, streetName: 'Parque de La Almozara', isStop: true },
      { lat: 41.6610, lng: -0.9092, streetName: 'Calle de la Estación' },
      { lat: 41.6605, lng: -0.9160, streetName: 'Avenida de La Almozara (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-san-juan',
    name: 'Ronda de San Juan',
    barrioId: 'san-juan-mozarrifar',
    barrioName: 'San Juan de Mozarrifar',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '01 de Agosto, 2026',
    timeString: '19:00',
    distance: 1550,
    duration: 38,
    streets: ['Avenida de San Juan', 'Calle de la Paz', 'Plaza del Mercado', 'Calle de la Sierra'],
    description: 'Desfile fresco y alegre por las calles de San Juan, con una parada comunitaria en la plaza del barrio.',
    characterId: 'san-juan',
    characterName: 'El Sanjuanero',
    characterEmoji: '🎺',
    color: '#EF6C00',
    points: [
      { lat: 41.6468, lng: -0.9180, streetName: 'Avenida de San Juan (Inicio)', isStop: true },
      { lat: 41.6462, lng: -0.9155, streetName: 'Calle de la Paz' },
      { lat: 41.6452, lng: -0.9130, streetName: 'Plaza del Mercado', isStop: true },
      { lat: 41.6460, lng: -0.9105, streetName: 'Calle de la Sierra' },
      { lat: 41.6468, lng: -0.9180, streetName: 'Avenida de San Juan (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-casablanca',
    name: 'Comparsa de Casablanca',
    barrioId: 'casablanca',
    barrioName: 'Casablanca',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '22 de Junio, 2026',
    timeString: '18:30',
    distance: 1700,
    duration: 40,
    streets: ['Calle de Casablanca', 'Avenida de la Hispanidad', 'Plaza de la Luz', 'Calle de los Olivos'],
    description: 'Una salida muy viva por los ejes comerciales y plazas de Casablanca, con ritmo de jota y ambiente festivo.',
    characterId: 'casablanca',
    characterName: 'La Casablanca',
    characterEmoji: '🎭',
    color: '#C2185B',
    points: [
      { lat: 41.6408, lng: -0.9025, streetName: 'Calle de Casablanca (Salida)', isStop: true },
      { lat: 41.6418, lng: -0.9005, streetName: 'Avenida de la Hispanidad' },
      { lat: 41.6430, lng: -0.8990, streetName: 'Plaza de la Luz', isStop: true },
      { lat: 41.6422, lng: -0.8968, streetName: 'Calle de los Olivos' },
      { lat: 41.6408, lng: -0.9025, streetName: 'Calle de Casablanca (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-miralbueno',
    name: 'Desfile de Miralbueno',
    barrioId: 'miralbueno',
    barrioName: 'Miralbueno',
    type: 'barrio',
    category: 'gigante',
    dateString: '12 de Septiembre, 2026',
    timeString: '16:30',
    distance: 1650,
    duration: 39,
    streets: ['Calle del Rabal', 'Avenida de Miralbueno', 'Plaza de la Ermita', 'Camino de los Pinos'],
    description: 'Un recorrido tradicional por las calles de Miralbueno, con el gigante del barrio como protagonista del desfile.',
    characterId: 'miralbueno',
    characterName: 'El Miralbueno',
    characterEmoji: '🏰',
    color: '#5D4037',
    points: [
      { lat: 41.6328, lng: -0.9155, streetName: 'Calle del Rabal (Inicio)', isStop: true },
      { lat: 41.6335, lng: -0.9128, streetName: 'Avenida de Miralbueno' },
      { lat: 41.6348, lng: -0.9106, streetName: 'Plaza de la Ermita', isStop: true },
      { lat: 41.6338, lng: -0.9088, streetName: 'Camino de los Pinos' },
      { lat: 41.6328, lng: -0.9155, streetName: 'Calle del Rabal (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-valdespartera',
    name: 'Ronda de Valdespartera',
    barrioId: 'valdespartera',
    barrioName: 'Valdespartera',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '26 de Agosto, 2026',
    timeString: '19:30',
    distance: 1800,
    duration: 44,
    streets: ['Avenida de Valdespartera', 'Calle de los Vientos', 'Parque de la Villa', 'Paseo del Ebro'],
    description: 'Un recorrido moderno y dinámico por las avenidas de Valdespartera, pensado para familias y vecinos.',
    characterId: 'valdespartera',
    characterName: 'La Valdespartera',
    characterEmoji: '🌈',
    color: '#0097A7',
    points: [
      { lat: 41.6840, lng: -0.9050, streetName: 'Avenida de Valdespartera (Inicio)', isStop: true },
      { lat: 41.6848, lng: -0.9020, streetName: 'Calle de los Vientos' },
      { lat: 41.6860, lng: -0.8995, streetName: 'Parque de la Villa', isStop: true },
      { lat: 41.6845, lng: -0.8970, streetName: 'Paseo del Ebro' },
      { lat: 41.6840, lng: -0.9050, streetName: 'Avenida de Valdespartera (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-villarrapa',
    name: 'Fiesta de Villarrapa',
    barrioId: 'villarrapa',
    barrioName: 'Villarrapa',
    type: 'barrio',
    category: 'gigante',
    dateString: '17 de Octubre, 2026',
    timeString: '12:30',
    distance: 1500,
    duration: 36,
    streets: ['Calle de Villarrapa', 'Plaza de la Era', 'Camino de la Fuente', 'Avenida de la Sierra'],
    description: 'Recorrido de fiesta tradicional por Villarrapa, con paradas en la plaza central y el entorno de la fuente.',
    characterId: 'villarrapa',
    characterName: 'El Villarrapa',
    characterEmoji: '🧡',
    color: '#8D6E63',
    points: [
      { lat: 41.6210, lng: -0.9300, streetName: 'Calle de Villarrapa (Salida)', isStop: true },
      { lat: 41.6220, lng: -0.9280, streetName: 'Plaza de la Era' },
      { lat: 41.6230, lng: -0.9262, streetName: 'Camino de la Fuente', isStop: true },
      { lat: 41.6222, lng: -0.9238, streetName: 'Avenida de la Sierra' },
      { lat: 41.6210, lng: -0.9300, streetName: 'Calle de Villarrapa (Fin)', isStop: true }
    ]
  },
  // PUEBLOS RURALES ROUTES
  {
    id: 'route-casetas',
    name: 'Fiestas de Casetas',
    barrioId: 'casetas',
    barrioName: 'Casetas',
    type: 'barrio',
    category: 'gigante',
    dateString: '24 de Junio, 2026',
    timeString: '12:00',
    distance: 2000,
    duration: 50,
    streets: ['Avenida de la Estación', 'Calle Mayor', 'Plaza de España', 'Calle San Juan'],
    description: 'Recorrido por las calles principales de Casetas durante las fiestas de San Juan Bautista.',
    characterId: 'casetas-gigante',
    characterName: 'Gigante de Casetas',
    characterEmoji: '🚂',
    color: '#D32F2F',
    points: [
      { lat: 41.7200, lng: -1.0200, streetName: 'Avenida de la Estación (Salida)', isStop: true },
      { lat: 41.7210, lng: -1.0180, streetName: 'Calle Mayor' },
      { lat: 41.7220, lng: -1.0160, streetName: 'Plaza de España', isStop: true },
      { lat: 41.7215, lng: -1.0140, streetName: 'Calle San Juan' },
      { lat: 41.7200, lng: -1.0200, streetName: 'Avenida de la Estación (Llegada)', isStop: true }
    ]
  },
  {
    id: 'route-garrapinillos',
    name: 'Fiestas de Garrapinillos',
    barrioId: 'garrapinillos',
    barrioName: 'Garrapinillos',
    type: 'barrio',
    category: 'gigante',
    dateString: '15 de Agosto, 2026',
    timeString: '18:00',
    distance: 1800,
    duration: 45,
    streets: ['Calle Real', 'Plaza de la Iglesia', 'Avenida del Aeropuerto', 'Calle de la Fuente'],
    description: 'Desfile por las calles de Garrapinillos durante las fiestas patronales.',
    characterId: 'garrapinillos-gigante',
    characterName: 'Gigante de Garrapinillos',
    characterEmoji: '🌽',
    color: '#388E3C',
    points: [
      { lat: 41.7100, lng: -1.0800, streetName: 'Calle Real (Salida)', isStop: true },
      { lat: 41.7110, lng: -1.0780, streetName: 'Plaza de la Iglesia', isStop: true },
      { lat: 41.7120, lng: -1.0760, streetName: 'Avenida del Aeropuerto' },
      { lat: 41.7110, lng: -1.0740, streetName: 'Calle de la Fuente' },
      { lat: 41.7100, lng: -1.0800, streetName: 'Calle Real (Llegada)', isStop: true }
    ]
  },
  {
    id: 'route-movera',
    name: 'Fiestas de Movera',
    barrioId: 'movera',
    barrioName: 'Movera',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '10 de Septiembre, 2026',
    timeString: '19:00',
    distance: 1200,
    duration: 30,
    streets: ['Calle del Río', 'Plaza Mayor', 'Calle de la Iglesia', 'Paseo del Ebro'],
    description: 'Recorrido por las calles de Movera durante sus fiestas patronales.',
    characterId: 'movera-cab1',
    characterName: 'El Moverano',
    characterEmoji: '🌊',
    color: '#1565C0',
    points: [
      { lat: 41.6800, lng: -0.8000, streetName: 'Calle del Río (Salida)', isStop: true },
      { lat: 41.6810, lng: -0.7980, streetName: 'Plaza Mayor', isStop: true },
      { lat: 41.6820, lng: -0.7960, streetName: 'Calle de la Iglesia' },
      { lat: 41.6810, lng: -0.7940, streetName: 'Paseo del Ebro' },
      { lat: 41.6800, lng: -0.8000, streetName: 'Calle del Río (Llegada)', isStop: true }
    ]
  },
  {
    id: 'route-juslibol',
    name: 'Fiestas de Juslibol',
    barrioId: 'juslibol',
    barrioName: 'Juslibol',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '20 de Agosto, 2026',
    timeString: '18:30',
    distance: 1300,
    duration: 32,
    streets: ['Calle del Monasterio', 'Plaza de la Virgen', 'Calle del Ebro', 'Camino del Soto'],
    description: 'Desfile por las calles de Juslibol durante sus fiestas patronales.',
    characterId: 'juslibol-cab1',
    characterName: 'El Juslibolero',
    characterEmoji: '🏞️',
    color: '#00838F',
    points: [
      { lat: 41.7300, lng: -0.9500, streetName: 'Calle del Monasterio (Salida)', isStop: true },
      { lat: 41.7310, lng: -0.9480, streetName: 'Plaza de la Virgen', isStop: true },
      { lat: 41.7320, lng: -0.9460, streetName: 'Calle del Ebro' },
      { lat: 41.7310, lng: -0.9440, streetName: 'Camino del Soto' },
      { lat: 41.7300, lng: -0.9500, streetName: 'Calle del Monasterio (Llegada)', isStop: true }
    ]
  },
  {
    id: 'route-cartuja',
    name: 'Fiestas de La Cartuja Baja',
    barrioId: 'cartuja-baja',
    barrioName: 'La Cartuja Baja',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '08 de Septiembre, 2026',
    timeString: '17:00',
    distance: 1100,
    duration: 28,
    streets: ['Calle del Monasterio', 'Plaza de la Cartuja', 'Calle de la Huerta', 'Avenida de la Paz'],
    description: 'Recorrido por las calles de La Cartuja Baja durante sus fiestas patronales.',
    characterId: 'cartuja-cab1',
    characterName: 'El Cartujano',
    characterEmoji: '🏛️',
    color: '#6A1B9A',
    points: [
      { lat: 41.6100, lng: -0.8800, streetName: 'Calle del Monasterio (Salida)', isStop: true },
      { lat: 41.6110, lng: -0.8780, streetName: 'Plaza de la Cartuja', isStop: true },
      { lat: 41.6120, lng: -0.8760, streetName: 'Calle de la Huerta' },
      { lat: 41.6110, lng: -0.8740, streetName: 'Avenida de la Paz' },
      { lat: 41.6100, lng: -0.8800, streetName: 'Calle del Monasterio (Llegada)', isStop: true }
    ]
  },
  // ============================
  // RUTAS FALTANTES (para evitar placeholders route-missing-*)
  // ============================
  {
    id: 'route-centro',
    name: 'Recorrido del Centro (placeholder-corrección de datos)',
    barrioId: 'centro',
    barrioName: 'Centro',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '01 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Paseo de la Independencia', 'Calle Alfonso', 'Plaza de España'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6520, lng: -0.8800, streetName: 'Paseo de la Independencia (Salida)', isStop: true },
      { lat: 41.6520, lng: -0.8790, streetName: 'Calle Alfonso' },
      { lat: 41.6520, lng: -0.8800, streetName: 'Plaza de España (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-oliver-valdefierro',
    name: 'Recorrido Oliver - Valdefierro (placeholder-corrección de datos)',
    barrioId: 'oliver-valdefierro',
    barrioName: 'Oliver - Valdefierro',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '02 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Corredor Verde', 'Avenida Valdefierro'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6400, lng: -0.9300, streetName: 'Corredor Verde (Salida)', isStop: true },
      { lat: 41.6400, lng: -0.9290, streetName: 'Avenida Valdefierro' },
      { lat: 41.6400, lng: -0.9300, streetName: 'Corredor Verde (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-santa-isabel',
    name: 'Recorrido Santa Isabel (placeholder-corrección de datos)',
    barrioId: 'santa-isabel',
    barrioName: 'Santa Isabel',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '03 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle Mayor', 'Plaza Santa Isabel'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6800, lng: -0.8500, streetName: 'Plaza Santa Isabel (Salida)', isStop: true },
      { lat: 41.6805, lng: -0.8495, streetName: 'Calle Mayor' },
      { lat: 41.6800, lng: -0.8500, streetName: 'Plaza Santa Isabel (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-san-pablo',
    name: 'Recorrido San Pablo (placeholder-corrección de datos)',
    barrioId: 'san-pablo',
    barrioName: 'San Pablo (El Gancho)',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '04 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle El Gancho', 'Plaza de San Pablo'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6530, lng: -0.8850, streetName: 'Plaza de San Pablo (Salida)', isStop: true },
      { lat: 41.6535, lng: -0.8845, streetName: 'Calle El Gancho' },
      { lat: 41.6530, lng: -0.8850, streetName: 'Plaza de San Pablo (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-la-jota',
    name: 'Recorrido La Jota (placeholder-corrección de datos)',
    barrioId: 'la-jota',
    barrioName: 'La Jota',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '05 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Avenida de La Jota', 'Plaza de La Jota'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6680, lng: -0.8700, streetName: 'Plaza de La Jota (Salida)', isStop: true },
      { lat: 41.6685, lng: -0.8695, streetName: 'Avenida de La Jota' },
      { lat: 41.6680, lng: -0.8700, streetName: 'Plaza de La Jota (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-vadorrey',
    name: 'Recorrido Vadorrey (placeholder-corrección de datos)',
    barrioId: 'vadorrey',
    barrioName: 'Vadorrey',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '06 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Puerto de Vadorrey', 'Camino del Ebro'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6550, lng: -0.8550, streetName: 'Puerto de Vadorrey (Salida)', isStop: true },
      { lat: 41.6555, lng: -0.8545, streetName: 'Camino del Ebro' },
      { lat: 41.6550, lng: -0.8550, streetName: 'Puerto de Vadorrey (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-arcosur',
    name: 'Recorrido Arcosur (placeholder-corrección de datos)',
    barrioId: 'arcosur',
    barrioName: 'Arcosur',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '07 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Avenida de Arcosur', 'Plaza de Arcosur'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6200, lng: -0.9100, streetName: 'Plaza de Arcosur (Salida)', isStop: true },
      { lat: 41.6205, lng: -0.9095, streetName: 'Avenida de Arcosur' },
      { lat: 41.6200, lng: -0.9100, streetName: 'Plaza de Arcosur (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-parque-goya',
    name: 'Recorrido Parque Goya (placeholder-corrección de datos)',
    barrioId: 'parque-goya',
    barrioName: 'Parque Goya',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '08 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Parque Goya', 'Calle Principal'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6450, lng: -0.9400, streetName: 'Parque Goya (Salida)', isStop: true },
      { lat: 41.6455, lng: -0.9395, streetName: 'Calle Principal' },
      { lat: 41.6450, lng: -0.9400, streetName: 'Parque Goya (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-zalfonada',
    name: 'Recorrido Zalfonada (placeholder-corrección de datos)',
    barrioId: 'zalfonada',
    barrioName: 'Zalfonada (Picarral)',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '09 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Picarral', 'Calle Zalfonada'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6650, lng: -0.8600, streetName: 'Picarral (Salida)', isStop: true },
      { lat: 41.6655, lng: -0.8595, streetName: 'Calle Zalfonada' },
      { lat: 41.6650, lng: -0.8600, streetName: 'Picarral (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-montemolin',
    name: 'Recorrido Montemolín (placeholder-corrección de datos)',
    barrioId: 'montemolin',
    barrioName: 'Montemolín',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '10 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Avenida de Miguel Servet', 'Plaza Montemolín'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6450, lng: -0.8700, streetName: 'Plaza Montemolín (Salida)', isStop: true },
      { lat: 41.6455, lng: -0.8695, streetName: 'Avenida de Miguel Servet' },
      { lat: 41.6450, lng: -0.8700, streetName: 'Plaza Montemolín (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-magdalena',
    name: 'Recorrido La Magdalena (placeholder-corrección de datos)',
    barrioId: 'magdalena',
    barrioName: 'La Magdalena',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '11 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle de la Magdalena', 'Plaza de la Magdalena'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6540, lng: -0.8750, streetName: 'Plaza de la Magdalena (Salida)', isStop: true },
      { lat: 41.6545, lng: -0.8745, streetName: 'Calle de la Magdalena' },
      { lat: 41.6540, lng: -0.8750, streetName: 'Plaza de la Magdalena (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-universidad',
    name: 'Recorrido Universidad (placeholder-corrección de datos)',
    barrioId: 'universidad',
    barrioName: 'Universidad',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '12 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Avenida de la Universidad', 'Calle Mayor'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6480, lng: -0.8850, streetName: 'Avenida de la Universidad (Salida)', isStop: true },
      { lat: 41.6485, lng: -0.8845, streetName: 'Calle Mayor' },
      { lat: 41.6480, lng: -0.8850, streetName: 'Avenida de la Universidad (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-monzalbarba',
    name: 'Recorrido Monzalbarba (placeholder-corrección de datos)',
    barrioId: 'monzalbarba',
    barrioName: 'Monzalbarba',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '13 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Camino del Canal', 'Plaza de Monzalbarba'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.7400, lng: -0.9800, streetName: 'Plaza de Monzalbarba (Salida)', isStop: true },
      { lat: 41.7405, lng: -0.9795, streetName: 'Camino del Canal' },
      { lat: 41.7400, lng: -0.9800, streetName: 'Plaza de Monzalbarba (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-montanana',
    name: 'Recorrido Montañana (placeholder-corrección de datos)',
    barrioId: 'montanana',
    barrioName: 'Montañana',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '14 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle Principal de Montañana', 'Plaza de Montañana'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.7000, lng: -0.8500, streetName: 'Plaza de Montañana (Salida)', isStop: true },
      { lat: 41.7005, lng: -0.8495, streetName: 'Calle Principal de Montañana' },
      { lat: 41.7000, lng: -0.8500, streetName: 'Plaza de Montañana (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-penaflor',
    name: 'Recorrido Peñaflor (placeholder-corrección de datos)',
    barrioId: 'penaflor',
    barrioName: 'Peñaflor',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '15 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle Mayor de Peñaflor', 'Plaza de Peñaflor'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.7200, lng: -0.8300, streetName: 'Plaza de Peñaflor (Salida)', isStop: true },
      { lat: 41.7205, lng: -0.8295, streetName: 'Calle Mayor de Peñaflor' },
      { lat: 41.7200, lng: -0.8300, streetName: 'Plaza de Peñaflor (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-san-gregorio',
    name: 'Recorrido San Gregorio (placeholder-corrección de datos)',
    barrioId: 'san-gregorio',
    barrioName: 'San Gregorio',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '16 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle San Gregorio', 'Plaza de San Gregorio'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.7100, lng: -1.0400, streetName: 'Plaza de San Gregorio (Salida)', isStop: true },
      { lat: 41.7105, lng: -1.0395, streetName: 'Calle San Gregorio' },
      { lat: 41.7100, lng: -1.0400, streetName: 'Plaza de San Gregorio (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-alfocea',
    name: 'Recorrido Alfocea (placeholder-corrección de datos)',
    barrioId: 'alfocea',
    barrioName: 'Alfocea',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '17 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle Mayor de Alfocea', 'Plaza de Alfocea'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.7400, lng: -0.9700, streetName: 'Plaza de Alfocea (Salida)', isStop: true },
      { lat: 41.7405, lng: -0.9695, streetName: 'Calle Mayor de Alfocea' },
      { lat: 41.7400, lng: -0.9700, streetName: 'Plaza de Alfocea (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-torrecilla-valmadrid',
    name: 'Recorrido Torrecilla de Valmadrid (placeholder-corrección de datos)',
    barrioId: 'torrecilla-valmadrid',
    barrioName: 'Torrecilla de Valmadrid',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '18 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle Mayor de Valmadrid', 'Plaza de Torrecilla'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6000, lng: -0.8200, streetName: 'Plaza de Torrecilla (Salida)', isStop: true },
      { lat: 41.6005, lng: -0.8195, streetName: 'Calle Mayor de Valmadrid' },
      { lat: 41.6000, lng: -0.8200, streetName: 'Plaza de Torrecilla (Fin)', isStop: true }
    ]
  },
  {
    id: 'route-venta-olivar',
    name: 'Recorrido Venta del Olivar (placeholder-corrección de datos)',
    barrioId: 'venta-olivar',
    barrioName: 'Venta del Olivar',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '19 de Noviembre, 2026',
    timeString: '12:00',
    distance: 1000,
    duration: 25,
    streets: ['Camino de la Venta', 'Plaza de la Venta'],
    description: 'Ruta mínima para sustituir placeholders. Completar con datos reales cuando existan.',
    characterId: 'placeholder',
    characterName: 'Pendiente',
    characterEmoji: '📍',
    color: '#999999',
    points: [
      { lat: 41.6700, lng: -0.7800, streetName: 'Plaza de la Venta (Salida)', isStop: true },
      { lat: 41.6705, lng: -0.7795, streetName: 'Camino de la Venta' },
      { lat: 41.6700, lng: -0.7800, streetName: 'Plaza de la Venta (Fin)', isStop: true }
    ]
  }
];

