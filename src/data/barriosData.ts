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
  { id: 'san-juan-mozarrifar', name: 'San Juan de Mozarrifar', description: 'Pedanía del norte con fuerte identidad vecinal.', zona: 'pueblo', lat: 41.7340, lng: -0.8890 },
  { id: 'juslibol', name: 'Juslibol', description: 'Pedanía del noroeste a orillas del Ebro, famosa por su monasterio.', zona: 'pueblo', lat: 41.7300, lng: -0.9500 },
  { id: 'san-gregorio', name: 'San Gregorio', description: 'Pedanía del oeste de Zaragoza.', zona: 'pueblo', lat: 41.7100, lng: -1.0400 },
  { id: 'cartuja-baja', name: 'La Cartuja Baja', description: 'Pedanía del sur que toma su nombre del antiguo monasterio cartujo.', zona: 'pueblo', lat: 41.6100, lng: -0.8800 },
  { id: 'alfocea', name: 'Alfocea', description: 'Pequeña pedanía del noroeste junto al Ebro.', zona: 'pueblo', lat: 41.7400, lng: -0.9700 },
  { id: 'torrecilla-valmadrid', name: 'Torrecilla de Valmadrid', description: 'Pequeña pedanía del sureste de Zaragoza.', zona: 'pueblo', lat: 41.6000, lng: -0.8200 },
  { id: 'venta-olivar', name: 'Venta del Olivar', description: 'Pequeña pedanía del este de Zaragoza.', zona: 'pueblo', lat: 41.6700, lng: -0.7800 },
  { id: 'villarrapa', name: 'Villarrapa', description: 'Pequeña pedanía del oeste de Zaragoza, en la margen derecha del Ebro.', zona: 'pueblo', lat: 41.6210, lng: -0.9300 }
];

export const neighborhoodRoutes: NeighborhoodRoute[] = [
  // ==========================================
  // MUNICIPAL ROUTES (Casco Histórico-based)
  // ==========================================
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
      { lat: 41.6555, lng: -0.8800, streetName: 'Calle Alfonso I' },
      { lat: 41.6542, lng: -0.8812, streetName: 'Calle Alfonso I (Cruce Manifestación)', isStop: true },
      { lat: 41.6528, lng: -0.8820, streetName: 'Calle Alfonso I' },
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

  // ==========================================
  // NEIGHBORHOOD ROUTES - Barrios Urbanos
  // ==========================================

  // -- CASCO HISTÓRICO (additional barrio routes) --
  {
    id: 'route-casco-historico-barrio',
    name: 'Comparsa del Casco Histórico',
    barrioId: 'casco-historico',
    barrioName: 'Casco Histórico',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '16 de Mayo, 2026',
    timeString: '18:00',
    distance: 1200,
    duration: 30,
    streets: ['Plaza del Pilar', 'Calle Don Jaime I', 'Plaza de la Seo', 'Calle San Vicente de Paúl', 'Calle Mayor'],
    description: 'Recorrido por el casco viejo de Zaragoza, saliendo del Pilar y rodeando la Seo.',
    characterId: 'casco-historico-cab',
    characterName: 'El Cascarillero',
    characterEmoji: '🏛️',
    color: '#9C27B0',
    points: [
      { lat: 41.6568, lng: -0.8783, streetName: 'Plaza del Pilar (Salida)', isStop: true },
      { lat: 41.6561, lng: -0.8771, streetName: 'Calle Don Jaime I' },
      { lat: 41.6555, lng: -0.8762, streetName: 'Plaza de la Seo', isStop: true },
      { lat: 41.6548, lng: -0.8748, streetName: 'Calle San Vicente de Paúl' },
      { lat: 41.6538, lng: -0.8750, streetName: 'Calle Mayor', isStop: true },
      { lat: 41.6542, lng: -0.8765, streetName: 'Calle San Pablo' },
      { lat: 41.6552, lng: -0.8775, streetName: 'Calle San Gil' },
      { lat: 41.6562, lng: -0.8778, streetName: 'Plaza del Pilar (Llegada)', isStop: true }
    ]
  },

  // -- CENTRO --
  {
    id: 'route-centro',
    name: 'Recorrido del Centro',
    barrioId: 'centro',
    barrioName: 'Centro',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '15 de Junio, 2026',
    timeString: '19:00',
    distance: 1400,
    duration: 35,
    streets: ['Paseo de la Independencia', 'Calle de Alfonso I', 'Plaza de España', 'Calle San Miguel', 'Paseo de la Constitución'],
    description: 'Recorrido por el corazón comercial de Zaragoza, atravesando el Paseo de la Independencia y la Plaza de España.',
    characterId: 'centro-cab',
    characterName: 'El Centrista',
    characterEmoji: '🏙️',
    color: '#FF6F00',
    points: [
      { lat: 41.6520, lng: -0.8800, streetName: 'Plaza de España (Salida)', isStop: true },
      { lat: 41.6515, lng: -0.8825, streetName: 'Paseo de la Independencia' },
      { lat: 41.6505, lng: -0.8840, streetName: 'Paseo de la Independencia (Cruce Coso)', isStop: true },
      { lat: 41.6495, lng: -0.8825, streetName: 'Calle San Miguel' },
      { lat: 41.6488, lng: -0.8810, streetName: 'Plasa de los Sitios', isStop: true },
      { lat: 41.6498, lng: -0.8795, streetName: 'Paseo de la Constitución' },
      { lat: 41.6510, lng: -0.8790, streetName: 'Paseo de la Constitución (Cruce Coso)' },
      { lat: 41.6520, lng: -0.8800, streetName: 'Plaza de España (Llegada)', isStop: true }
    ]
  },

  // -- ARRABAL --
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

  // -- DELICIAS --
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

  // -- LAS FUENTES --
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

  // -- SAN JOSÉ --
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

  // -- TORRERO --
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

  // -- ACTUR --
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

  // -- OLIVER-VALDEFIERRO --
  {
    id: 'route-oliver-valdefierro',
    name: 'Recorrido Oliver - Valdefierro',
    barrioId: 'oliver-valdefierro',
    barrioName: 'Oliver - Valdefierro',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '10 de Julio, 2026',
    timeString: '19:00',
    distance: 1500,
    duration: 38,
    streets: ['Avenida de Valdefierro', 'Calle de la Sierra de Vicor', 'Corredor Verde', 'Calle de la Cruz'],
    description: 'Recorrido por el barrio de Oliver-Valdefierro, atravesando el Corredor Verde y las calles principales del barrio.',
    characterId: 'oliver-cab',
    characterName: 'El Olivero',
    characterEmoji: '🌳',
    color: '#2E7D32',
    points: [
      { lat: 41.6400, lng: -0.9300, streetName: 'Avenida de Valdefierro (Salida)', isStop: true },
      { lat: 41.6405, lng: -0.9280, streetName: 'Avenida de Valdefierro' },
      { lat: 41.6410, lng: -0.9260, streetName: 'Calle de la Sierra de Vicor', isStop: true },
      { lat: 41.6400, lng: -0.9240, streetName: 'Corredor Verde' },
      { lat: 41.6390, lng: -0.9255, streetName: 'Calle de la Cruz', isStop: true },
      { lat: 41.6395, lng: -0.9280, streetName: 'Calle de la Sierra de Vicor' },
      { lat: 41.6400, lng: -0.9300, streetName: 'Avenida de Valdefierro (Fin)', isStop: true }
    ]
  },

  // -- SANTA ISABEL --
  {
    id: 'route-santa-isabel',
    name: 'Recorrido Santa Isabel',
    barrioId: 'santa-isabel',
    barrioName: 'Santa Isabel',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '25 de Julio, 2026',
    timeString: '18:30',
    distance: 1200,
    duration: 30,
    streets: ['Calle Mayor', 'Plaza Santa Isabel', 'Calle de la Iglesia', 'Camino del Plano'],
    description: 'Recorrido por las calles principales de Santa Isabel, pasando por la plaza del barrio y la iglesia.',
    characterId: 'santa-isabel-cab',
    characterName: 'La Isabelica',
    characterEmoji: '🌸',
    color: '#C2185B',
    points: [
      { lat: 41.6800, lng: -0.8500, streetName: 'Plaza Santa Isabel (Salida)', isStop: true },
      { lat: 41.6805, lng: -0.8490, streetName: 'Calle Mayor' },
      { lat: 41.6810, lng: -0.8475, streetName: 'Calle de la Iglesia', isStop: true },
      { lat: 41.6818, lng: -0.8485, streetName: 'Camino del Plano' },
      { lat: 41.6810, lng: -0.8505, streetName: 'Calle Mayor (Vuelta)' },
      { lat: 41.6800, lng: -0.8500, streetName: 'Plaza Santa Isabel (Fin)', isStop: true }
    ]
  },

  // -- ALMOZARA --
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
      { lat: 41.6608, lng: -0.9150, streetName: 'Avenida de La Almozara' },
      { lat: 41.6612, lng: -0.9145, streetName: 'Avenida de La Almozara (Cruce)' },
      { lat: 41.6615, lng: -0.9138, streetName: 'Calle de la Concordia' },
      { lat: 41.6618, lng: -0.9128, streetName: 'Calle de la Concordia (Media)' },
      { lat: 41.6620, lng: -0.9118, streetName: 'Parque de La Almozara', isStop: true },
      { lat: 41.6615, lng: -0.9105, streetName: 'Parque de La Almozara (Salida)' },
      { lat: 41.6610, lng: -0.9092, streetName: 'Calle de la Estación' },
      { lat: 41.6605, lng: -0.9160, streetName: 'Avenida de La Almozara (Fin)', isStop: true }
    ]
  },

  // -- SAN PABLO --
  {
    id: 'route-san-pablo',
    name: 'Recorrido San Pablo (El Gancho)',
    barrioId: 'san-pablo',
    barrioName: 'San Pablo (El Gancho)',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '20 de Julio, 2026',
    timeString: '19:00',
    distance: 1100,
    duration: 28,
    streets: ['Plaza de San Pablo', 'Calle San Pablo', 'Calle El Gancho', 'Calle de la Salud'],
    description: 'Recorrido por el castizo barrio de San Pablo, conocido como El Gancho, con parada en la plaza del mercado.',
    characterId: 'san-pablo-cab',
    characterName: 'El Gancho',
    characterEmoji: '🎭',
    color: '#E65100',
    points: [
      { lat: 41.6530, lng: -0.8850, streetName: 'Plaza de San Pablo (Salida)', isStop: true },
      { lat: 41.6535, lng: -0.8845, streetName: 'Calle San Pablo' },
      { lat: 41.6540, lng: -0.8838, streetName: 'Calle El Gancho', isStop: true },
      { lat: 41.6538, lng: -0.8855, streetName: 'Calle de la Salud' },
      { lat: 41.6530, lng: -0.8860, streetName: 'Calle de la Salud (Baja)' },
      { lat: 41.6530, lng: -0.8850, streetName: 'Plaza de San Pablo (Fin)', isStop: true }
    ]
  },

  // -- LA JOTA --
  {
    id: 'route-la-jota',
    name: 'Recorrido La Jota',
    barrioId: 'la-jota',
    barrioName: 'La Jota',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '05 de Septiembre, 2026',
    timeString: '18:00',
    distance: 1300,
    duration: 32,
    streets: ['Avenida de La Jota', 'Calle de la Jota', 'Plaza de La Jota', 'Calle del Agua'],
    description: 'Recorrido por el animado barrio de La Jota, en la margen izquierda del Ebro.',
    characterId: 'la-jota-cab',
    characterName: 'La Jotera',
    characterEmoji: '💃',
    color: '#FF5722',
    points: [
      { lat: 41.6680, lng: -0.8700, streetName: 'Plaza de La Jota (Salida)', isStop: true },
      { lat: 41.6685, lng: -0.8690, streetName: 'Calle de la Jota' },
      { lat: 41.6690, lng: -0.8675, streetName: 'Avenida de La Jota', isStop: true },
      { lat: 41.6688, lng: -0.8655, streetName: 'Calle del Agua' },
      { lat: 41.6680, lng: -0.8680, streetName: 'Calle de la Jota (Vuelta)' },
      { lat: 41.6680, lng: -0.8700, streetName: 'Plaza de La Jota (Fin)', isStop: true }
    ]
  },

  // -- VADORREY --
  {
    id: 'route-vadorrey',
    name: 'Recorrido Vadorrey',
    barrioId: 'vadorrey',
    barrioName: 'Vadorrey',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '08 de Septiembre, 2026',
    timeString: '17:30',
    distance: 1200,
    duration: 30,
    streets: ['Puerto de Vadorrey', 'Calle de Vadorrey', 'Camino del Ebro', 'Plaza de Vadorrey'],
    description: 'Paseo festivo por las calles de Vadorrey, junto al río Ebro.',
    characterId: 'vadorrey-cab',
    characterName: 'El Vadorrey',
    characterEmoji: '🌊',
    color: '#00838F',
    points: [
      { lat: 41.6550, lng: -0.8550, streetName: 'Puerto de Vadorrey (Salida)', isStop: true },
      { lat: 41.6555, lng: -0.8540, streetName: 'Calle de Vadorrey' },
      { lat: 41.6560, lng: -0.8525, streetName: 'Camino del Ebro', isStop: true },
      { lat: 41.6558, lng: -0.8545, streetName: 'Calle de Vadorrey (Vuelta)' },
      { lat: 41.6550, lng: -0.8550, streetName: 'Puerto de Vadorrey (Fin)', isStop: true }
    ]
  },

  // -- CASABLANCA --
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
      { lat: 41.6412, lng: -0.9015, streetName: 'Calle de Casablanca' },
      { lat: 41.6418, lng: -0.9005, streetName: 'Avenida de la Hispanidad' },
      { lat: 41.6424, lng: -0.8998, streetName: 'Avenida de la Hispanidad (Cruce)' },
      { lat: 41.6430, lng: -0.8990, streetName: 'Plaza de la Luz', isStop: true },
      { lat: 41.6428, lng: -0.8978, streetName: 'Calle de los Olivos (Inicio)' },
      { lat: 41.6422, lng: -0.8968, streetName: 'Calle de los Olivos' },
      { lat: 41.6415, lng: -0.8990, streetName: 'Calle de Casablanca (Retorno)' },
      { lat: 41.6408, lng: -0.9025, streetName: 'Calle de Casablanca (Fin)', isStop: true }
    ]
  },

  // -- MIRALBUENO --
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
      { lat: 41.6332, lng: -0.9142, streetName: 'Calle del Rabal' },
      { lat: 41.6335, lng: -0.9128, streetName: 'Avenida de Miralbueno' },
      { lat: 41.6340, lng: -0.9118, streetName: 'Avenida de Miralbueno (Cruce)' },
      { lat: 41.6348, lng: -0.9106, streetName: 'Plaza de la Ermita', isStop: true },
      { lat: 41.6345, lng: -0.9095, streetName: 'Camino de los Pinos (Inicio)' },
      { lat: 41.6338, lng: -0.9088, streetName: 'Camino de los Pinos' },
      { lat: 41.6335, lng: -0.9105, streetName: 'Avenida de Miralbueno (Retorno)' },
      { lat: 41.6328, lng: -0.9155, streetName: 'Calle del Rabal (Fin)', isStop: true }
    ]
  },

  // -- VALDESPARTERA --
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
      { lat: 41.6844, lng: -0.9035, streetName: 'Avenida de Valdespartera' },
      { lat: 41.6848, lng: -0.9020, streetName: 'Calle de los Vientos' },
      { lat: 41.6853, lng: -0.9008, streetName: 'Calle de los Vientos (Media)' },
      { lat: 41.6860, lng: -0.8995, streetName: 'Parque de la Villa', isStop: true },
      { lat: 41.6855, lng: -0.8982, streetName: 'Parque de la Villa (Salida)' },
      { lat: 41.6845, lng: -0.8970, streetName: 'Paseo del Ebro' },
      { lat: 41.6842, lng: -0.8995, streetName: 'Avenida de Valdespartera (Retorno)' },
      { lat: 41.6840, lng: -0.9050, streetName: 'Avenida de Valdespartera (Fin)', isStop: true }
    ]
  },

  // -- ARCOSUR --
  {
    id: 'route-arcosur',
    name: 'Recorrido Arcosur',
    barrioId: 'arcosur',
    barrioName: 'Arcosur',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '15 de Agosto, 2026',
    timeString: '20:00',
    distance: 1400,
    duration: 35,
    streets: ['Avenida de Arcosur', 'Calle de la Paz', 'Plaza de Arcosur', 'Calle de la Esperanza'],
    description: 'Recorrido por el moderno barrio de Arcosur, en la zona sur de Zaragoza.',
    characterId: 'arcosur-cab',
    characterName: 'El Arcosur',
    characterEmoji: '🏘️',
    color: '#4A148C',
    points: [
      { lat: 41.6200, lng: -0.9100, streetName: 'Avenida de Arcosur (Salida)', isStop: true },
      { lat: 41.6208, lng: -0.9085, streetName: 'Calle de la Paz' },
      { lat: 41.6215, lng: -0.9068, streetName: 'Plaza de Arcosur', isStop: true },
      { lat: 41.6210, lng: -0.9090, streetName: 'Calle de la Esperanza' },
      { lat: 41.6200, lng: -0.9100, streetName: 'Avenida de Arcosur (Fin)', isStop: true }
    ]
  },

  // -- PARQUE GOYA --
  {
    id: 'route-parque-goya',
    name: 'Recorrido Parque Goya',
    barrioId: 'parque-goya',
    barrioName: 'Parque Goya',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '02 de Septiembre, 2026',
    timeString: '18:00',
    distance: 1300,
    duration: 33,
    streets: ['Avenida de Gómez Laguna', 'Calle de Francisco de Goya', 'Plaza de Goya', 'Calle de la Pintura'],
    description: 'Recorrido por el residencial barrio de Parque Goya, en la zona oeste de Zaragoza.',
    characterId: 'parque-goya-cab',
    characterName: 'El Goyesco',
    characterEmoji: '🎨',
    color: '#F57C00',
    points: [
      { lat: 41.6450, lng: -0.9400, streetName: 'Avenida de Gómez Laguna (Salida)', isStop: true },
      { lat: 41.6458, lng: -0.9385, streetName: 'Calle de Francisco de Goya' },
      { lat: 41.6465, lng: -0.9368, streetName: 'Plaza de Goya', isStop: true },
      { lat: 41.6460, lng: -0.9390, streetName: 'Calle de la Pintura' },
      { lat: 41.6450, lng: -0.9400, streetName: 'Avenida de Gómez Laguna (Fin)', isStop: true }
    ]
  },

  // -- ZALFONADA --
  {
    id: 'route-zalfonada',
    name: 'Recorrido Zalfonada (Picarral)',
    barrioId: 'zalfonada',
    barrioName: 'Zalfonada (Picarral)',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '12 de Septiembre, 2026',
    timeString: '17:00',
    distance: 1100,
    duration: 28,
    streets: ['Calle del Picarral', 'Calle Zalfonada', 'Plaza del Picarral', 'Calle de la Huerta'],
    description: 'Recorrido por el barrio del Picarral y Zalfonada, en la zona norte de Zaragoza.',
    characterId: 'zalfonada-cab',
    characterName: 'El Picarral',
    characterEmoji: '🏡',
    color: '#795548',
    points: [
      { lat: 41.6650, lng: -0.8600, streetName: 'Calle del Picarral (Salida)', isStop: true },
      { lat: 41.6655, lng: -0.8590, streetName: 'Calle Zalfonada' },
      { lat: 41.6660, lng: -0.8575, streetName: 'Plaza del Picarral', isStop: true },
      { lat: 41.6658, lng: -0.8595, streetName: 'Calle de la Huerta' },
      { lat: 41.6650, lng: -0.8600, streetName: 'Calle del Picarral (Fin)', isStop: true }
    ]
  },

  // -- MONTEMOLÍN --
  {
    id: 'route-montemolin',
    name: 'Recorrido Montemolín',
    barrioId: 'montemolin',
    barrioName: 'Montemolín',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '18 de Septiembre, 2026',
    timeString: '18:30',
    distance: 1200,
    duration: 30,
    streets: ['Avenida de Miguel Servet', 'Calle de Montemolín', 'Plaza Montemolín', 'Calle de las Torres'],
    description: 'Recorrido por la zona alta de Las Fuentes, en torno a la avenida de Miguel Servet.',
    characterId: 'montemolin-cab',
    characterName: 'El Montemolín',
    characterEmoji: '🏔️',
    color: '#5D4037',
    points: [
      { lat: 41.6450, lng: -0.8700, streetName: 'Plaza Montemolín (Salida)', isStop: true },
      { lat: 41.6455, lng: -0.8690, streetName: 'Calle de Montemolín' },
      { lat: 41.6460, lng: -0.8675, streetName: 'Calle de las Torres', isStop: true },
      { lat: 41.6458, lng: -0.8695, streetName: 'Avenida de Miguel Servet' },
      { lat: 41.6450, lng: -0.8700, streetName: 'Plaza Montemolín (Fin)', isStop: true }
    ]
  },

  // -- MAGDALENA --
  {
    id: 'route-magdalena',
    name: 'Recorrido La Magdalena',
    barrioId: 'magdalena',
    barrioName: 'La Magdalena',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '22 de Septiembre, 2026',
    timeString: '19:00',
    distance: 1000,
    duration: 25,
    streets: ['Calle de la Magdalena', 'Plaza de la Magdalena', 'Calle de las Armas', 'Calle del Castillo'],
    description: 'Recorrido por el histórico barrio de La Magdalena, uno de los más antiguos de Zaragoza.',
    characterId: 'magdalena-cab',
    characterName: 'La Magdalenica',
    characterEmoji: '🏘️',
    color: '#6A1B9A',
    points: [
      { lat: 41.6540, lng: -0.8750, streetName: 'Plaza de la Magdalena (Salida)', isStop: true },
      { lat: 41.6545, lng: -0.8740, streetName: 'Calle de la Magdalena' },
      { lat: 41.6550, lng: -0.8728, streetName: 'Calle de las Armas', isStop: true },
      { lat: 41.6548, lng: -0.8745, streetName: 'Calle del Castillo' },
      { lat: 41.6540, lng: -0.8750, streetName: 'Plaza de la Magdalena (Fin)', isStop: true }
    ]
  },

  // -- UNIVERSIDAD --
  {
    id: 'route-universidad',
    name: 'Recorrido Universidad',
    barrioId: 'universidad',
    barrioName: 'Universidad',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '28 de Septiembre, 2026',
    timeString: '17:30',
    distance: 1300,
    duration: 32,
    streets: ['Plaza de la Universidad', 'Calle de la Universidad', 'Avenida de San Juan Bosco', 'Calle de Pedro Cerbuna'],
    description: 'Recorrido por el barrio universitario, pasando por la Facultad de Medicina y el Campus.',
    characterId: 'universidad-cab',
    characterName: 'El Universitario',
    characterEmoji: '🎓',
    color: '#1565C0',
    points: [
      { lat: 41.6480, lng: -0.8850, streetName: 'Plaza de la Universidad (Salida)', isStop: true },
      { lat: 41.6485, lng: -0.8840, streetName: 'Calle de la Universidad' },
      { lat: 41.6490, lng: -0.8825, streetName: 'Avenida de San Juan Bosco', isStop: true },
      { lat: 41.6488, lng: -0.8845, streetName: 'Calle de Pedro Cerbuna' },
      { lat: 41.6480, lng: -0.8850, streetName: 'Plaza de la Universidad (Fin)', isStop: true }
    ]
  },

  // ==========================================
  // PUEBLOS RURALES
  // ==========================================

  // -- CASETAS --
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
      { lat: 41.7205, lng: -1.0190, streetName: 'Avenida de la Estación' },
      { lat: 41.7210, lng: -1.0180, streetName: 'Calle Mayor' },
      { lat: 41.7220, lng: -1.0160, streetName: 'Plaza de España', isStop: true },
      { lat: 41.7215, lng: -1.0140, streetName: 'Calle San Juan' },
      { lat: 41.7210, lng: -1.0160, streetName: 'Calle Mayor (Vuelta)' },
      { lat: 41.7200, lng: -1.0200, streetName: 'Avenida de la Estación (Llegada)', isStop: true }
    ]
  },

  // -- GARRAPINILLOS --
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
      { lat: 41.7105, lng: -1.0790, streetName: 'Calle Real' },
      { lat: 41.7110, lng: -1.0780, streetName: 'Plaza de la Iglesia', isStop: true },
      { lat: 41.7120, lng: -1.0760, streetName: 'Avenida del Aeropuerto' },
      { lat: 41.7110, lng: -1.0740, streetName: 'Calle de la Fuente' },
      { lat: 41.7100, lng: -1.0800, streetName: 'Calle Real (Llegada)', isStop: true }
    ]
  },

  // -- MONZALBARBA --
  {
    id: 'route-monzalbarba',
    name: 'Recorrido Monzalbarba',
    barrioId: 'monzalbarba',
    barrioName: 'Monzalbarba',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '08 de Septiembre, 2026',
    timeString: '18:00',
    distance: 1100,
    duration: 28,
    streets: ['Camino del Canal', 'Plaza de Monzalbarba', 'Calle Mayor', 'Calle de la Iglesia'],
    description: 'Recorrido por las calles de Monzalbarba, junto al Canal Imperial de Aragón.',
    characterId: 'monzalbarba-cab',
    characterName: 'El Monzalbar',
    characterEmoji: '🏡',
    color: '#8D6E63',
    points: [
      { lat: 41.7400, lng: -0.9800, streetName: 'Plaza de Monzalbarba (Salida)', isStop: true },
      { lat: 41.7405, lng: -0.9795, streetName: 'Calle Mayor' },
      { lat: 41.7410, lng: -0.9780, streetName: 'Calle de la Iglesia', isStop: true },
      { lat: 41.7408, lng: -0.9795, streetName: 'Camino del Canal' },
      { lat: 41.7400, lng: -0.9800, streetName: 'Plaza de Monzalbarba (Fin)', isStop: true }
    ]
  },

  // -- MOVERA --
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
      { lat: 41.6805, lng: -0.7990, streetName: 'Calle del Río' },
      { lat: 41.6810, lng: -0.7980, streetName: 'Plaza Mayor', isStop: true },
      { lat: 41.6820, lng: -0.7960, streetName: 'Calle de la Iglesia' },
      { lat: 41.6810, lng: -0.7940, streetName: 'Paseo del Ebro' },
      { lat: 41.6800, lng: -0.8000, streetName: 'Calle del Río (Llegada)', isStop: true }
    ]
  },

  // -- MONTAÑANA --
  {
    id: 'route-montanana',
    name: 'Recorrido Montañana',
    barrioId: 'montanana',
    barrioName: 'Montañana',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '15 de Septiembre, 2026',
    timeString: '18:30',
    distance: 1000,
    duration: 25,
    streets: ['Calle Principal de Montañana', 'Plaza de Montañana', 'Calle de la Fuente', 'Calle de la Iglesia'],
    description: 'Recorrido por la pedanía de Montañana, en la zona norte de Zaragoza.',
    characterId: 'montanana-cab',
    characterName: 'El Montañanero',
    characterEmoji: '⛰️',
    color: '#4E342E',
    points: [
      { lat: 41.7000, lng: -0.8500, streetName: 'Plaza de Montañana (Salida)', isStop: true },
      { lat: 41.7005, lng: -0.8495, streetName: 'Calle Principal de Montañana' },
      { lat: 41.7010, lng: -0.8485, streetName: 'Calle de la Iglesia', isStop: true },
      { lat: 41.7008, lng: -0.8495, streetName: 'Calle de la Fuente' },
      { lat: 41.7000, lng: -0.8500, streetName: 'Plaza de Montañana (Fin)', isStop: true }
    ]
  },

  // -- PEÑAFLOR --
  {
    id: 'route-penaflor',
    name: 'Recorrido Peñaflor',
    barrioId: 'penaflor',
    barrioName: 'Peñaflor',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '20 de Septiembre, 2026',
    timeString: '17:00',
    distance: 900,
    duration: 23,
    streets: ['Calle Mayor de Peñaflor', 'Plaza de Peñaflor', 'Calle de la Ermita'],
    description: 'Recorrido por la pequeña pedanía de Peñaflor, al norte de Zaragoza.',
    characterId: 'penaflor-cab',
    characterName: 'El Peñaflorense',
    characterEmoji: '🌾',
    color: '#689F38',
    points: [
      { lat: 41.7200, lng: -0.8300, streetName: 'Plaza de Peñaflor (Salida)', isStop: true },
      { lat: 41.7205, lng: -0.8295, streetName: 'Calle Mayor de Peñaflor' },
      { lat: 41.7210, lng: -0.8285, streetName: 'Calle de la Ermita', isStop: true },
      { lat: 41.7205, lng: -0.8295, streetName: 'Calle Mayor de Peñaflor (Vuelta)' },
      { lat: 41.7200, lng: -0.8300, streetName: 'Plaza de Peñaflor (Fin)', isStop: true }
    ]
  },

  // -- SAN JUAN DE MOZARRIFAR --
  {
    id: 'route-san-juan',
    name: 'Ronda de San Juan de Mozarrifar',
    barrioId: 'san-juan-mozarrifar',
    barrioName: 'San Juan de Mozarrifar',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '01 de Agosto, 2026',
    timeString: '19:00',
    distance: 1200,
    duration: 30,
    streets: ['Avenida de San Juan', 'Calle de la Paz', 'Plaza del Mercado', 'Calle de la Sierra'],
    description: 'Desfile fresco y alegre por las calles de San Juan de Mozarrifar, con una parada comunitaria en la plaza del barrio.',
    characterId: 'san-juan-cab',
    characterName: 'El Sanjuanero',
    characterEmoji: '🎺',
    color: '#EF6C00',
    points: [
      { lat: 41.7340, lng: -0.8890, streetName: 'Avenida de San Juan (Inicio)', isStop: true },
      { lat: 41.7345, lng: -0.8875, streetName: 'Avenida de San Juan' },
      { lat: 41.7350, lng: -0.8860, streetName: 'Calle de la Paz' },
      { lat: 41.7358, lng: -0.8845, streetName: 'Plaza del Mercado', isStop: true },
      { lat: 41.7352, lng: -0.8865, streetName: 'Calle de la Sierra' },
      { lat: 41.7340, lng: -0.8890, streetName: 'Avenida de San Juan (Fin)', isStop: true }
    ]
  },

  // -- JUSLIBOL --
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
      { lat: 41.7305, lng: -0.9490, streetName: 'Calle del Monasterio' },
      { lat: 41.7310, lng: -0.9480, streetName: 'Plaza de la Virgen', isStop: true },
      { lat: 41.7320, lng: -0.9460, streetName: 'Calle del Ebro' },
      { lat: 41.7310, lng: -0.9440, streetName: 'Camino del Soto' },
      { lat: 41.7300, lng: -0.9500, streetName: 'Calle del Monasterio (Llegada)', isStop: true }
    ]
  },

  // -- SAN GREGORIO --
  {
    id: 'route-san-gregorio',
    name: 'Recorrido San Gregorio',
    barrioId: 'san-gregorio',
    barrioName: 'San Gregorio',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '05 de Septiembre, 2026',
    timeString: '18:00',
    distance: 900,
    duration: 23,
    streets: ['Calle San Gregorio', 'Plaza de San Gregorio', 'Camino de la Fuente'],
    description: 'Recorrido por la pedanía de San Gregorio, al oeste de Zaragoza.',
    characterId: 'san-gregorio-cab',
    characterName: 'El San Gregorio',
    characterEmoji: '🌻',
    color: '#FDD835',
    points: [
      { lat: 41.7100, lng: -1.0400, streetName: 'Plaza de San Gregorio (Salida)', isStop: true },
      { lat: 41.7105, lng: -1.0395, streetName: 'Calle San Gregorio' },
      { lat: 41.7110, lng: -1.0385, streetName: 'Camino de la Fuente', isStop: true },
      { lat: 41.7105, lng: -1.0395, streetName: 'Calle San Gregorio (Vuelta)' },
      { lat: 41.7100, lng: -1.0400, streetName: 'Plaza de San Gregorio (Fin)', isStop: true }
    ]
  },

  // -- CARTUJA BAJA --
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
      { lat: 41.6105, lng: -0.8790, streetName: 'Calle del Monasterio' },
      { lat: 41.6110, lng: -0.8780, streetName: 'Plaza de la Cartuja', isStop: true },
      { lat: 41.6120, lng: -0.8760, streetName: 'Calle de la Huerta' },
      { lat: 41.6110, lng: -0.8740, streetName: 'Avenida de la Paz' },
      { lat: 41.6100, lng: -0.8800, streetName: 'Calle del Monasterio (Llegada)', isStop: true }
    ]
  },

  // -- ALFOCEA --
  {
    id: 'route-alfocea',
    name: 'Recorrido Alfocea',
    barrioId: 'alfocea',
    barrioName: 'Alfocea',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '12 de Septiembre, 2026',
    timeString: '18:00',
    distance: 800,
    duration: 20,
    streets: ['Calle Mayor de Alfocea', 'Plaza de Alfocea', 'Calle del Río'],
    description: 'Recorrido por la pequeña pedanía de Alfocea, junto al río Ebro.',
    characterId: 'alfocea-cab',
    characterName: 'El Alfoceano',
    characterEmoji: '🌿',
    color: '#43A047',
    points: [
      { lat: 41.7400, lng: -0.9700, streetName: 'Plaza de Alfocea (Salida)', isStop: true },
      { lat: 41.7405, lng: -0.9695, streetName: 'Calle Mayor de Alfocea' },
      { lat: 41.7410, lng: -0.9685, streetName: 'Calle del Río', isStop: true },
      { lat: 41.7405, lng: -0.9695, streetName: 'Calle Mayor de Alfocea (Vuelta)' },
      { lat: 41.7400, lng: -0.9700, streetName: 'Plaza de Alfocea (Fin)', isStop: true }
    ]
  },

  // -- TORRECILLA DE VALMADRID --
  {
    id: 'route-torrecilla-valmadrid',
    name: 'Recorrido Torrecilla de Valmadrid',
    barrioId: 'torrecilla-valmadrid',
    barrioName: 'Torrecilla de Valmadrid',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '18 de Septiembre, 2026',
    timeString: '17:30',
    distance: 800,
    duration: 20,
    streets: ['Calle Mayor de Valmadrid', 'Plaza de Torrecilla', 'Calle de la Iglesia'],
    description: 'Recorrido por la pedanía de Torrecilla de Valmadrid, al sureste de Zaragoza.',
    characterId: 'torrecilla-cab',
    characterName: 'El Torrecillano',
    characterEmoji: '🏘️',
    color: '#7B1FA2',
    points: [
      { lat: 41.6000, lng: -0.8200, streetName: 'Plaza de Torrecilla (Salida)', isStop: true },
      { lat: 41.6005, lng: -0.8195, streetName: 'Calle Mayor de Valmadrid' },
      { lat: 41.6010, lng: -0.8185, streetName: 'Calle de la Iglesia', isStop: true },
      { lat: 41.6005, lng: -0.8195, streetName: 'Calle Mayor de Valmadrid (Vuelta)' },
      { lat: 41.6000, lng: -0.8200, streetName: 'Plaza de Torrecilla (Fin)', isStop: true }
    ]
  },

  // -- VENTA DEL OLIVAR --
  {
    id: 'route-venta-olivar',
    name: 'Recorrido Venta del Olivar',
    barrioId: 'venta-olivar',
    barrioName: 'Venta del Olivar',
    type: 'barrio',
    category: 'cabezudo',
    dateString: '22 de Septiembre, 2026',
    timeString: '18:00',
    distance: 800,
    duration: 20,
    streets: ['Camino de la Venta', 'Plaza de la Venta', 'Calle del Olivar'],
    description: 'Recorrido por la pedanía de Venta del Olivar, al este de Zaragoza.',
    characterId: 'venta-olivar-cab',
    characterName: 'El Ventero',
    characterEmoji: '🌳',
    color: '#558B2F',
    points: [
      { lat: 41.6700, lng: -0.7800, streetName: 'Plaza de la Venta (Salida)', isStop: true },
      { lat: 41.6705, lng: -0.7795, streetName: 'Camino de la Venta' },
      { lat: 41.6710, lng: -0.7785, streetName: 'Calle del Olivar', isStop: true },
      { lat: 41.6705, lng: -0.7795, streetName: 'Camino de la Venta (Vuelta)' },
      { lat: 41.6700, lng: -0.7800, streetName: 'Plaza de la Venta (Fin)', isStop: true }
    ]
  },

  // -- VILLARRAPA --
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
      { lat: 41.6215, lng: -0.9290, streetName: 'Calle de Villarrapa' },
      { lat: 41.6220, lng: -0.9280, streetName: 'Plaza de la Era', isStop: true },
      { lat: 41.6230, lng: -0.9262, streetName: 'Camino de la Fuente' },
      { lat: 41.6222, lng: -0.9238, streetName: 'Avenida de la Sierra', isStop: true },
      { lat: 41.6215, lng: -0.9260, streetName: 'Calle de Villarrapa (Vuelta)' },
      { lat: 41.6210, lng: -0.9300, streetName: 'Calle de Villarrapa (Fin)', isStop: true }
    ]
  }
];