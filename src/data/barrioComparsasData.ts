// ============================================================
// BARRIO & PUEBLO COMPARSAS DATA
// Todas las comparsas de barrios urbanos y pueblos rurales
// de Zaragoza, con sus personajes y si tienen gigantes o no
// ============================================================

export type ZonaType = 'barrio' | 'pueblo';

export interface BarrioComparsa {
  id: string;
  name: string;
  zona: ZonaType;
  description: string;
  hasGigantes: boolean;
  hasCabezudos: boolean;
  asociacion: string;
  historia: string;
  personajes: BarrioPersonaje[];
  lat: number;
  lng: number;
  color: string;
}

export interface BarrioPersonaje {
  id: string;
  name: string;
  type: 'gigante' | 'cabezudo';
  description: string;
  year: number;
  copla?: string;
  emoji: string;
  color: string;
}

export const barrioComparsas: BarrioComparsa[] = [
  // ═══════════════════════════════════════════
  // BARRIOS URBANOS (Distritos de Zaragoza)
  // ═══════════════════════════════════════════
  {
    id: 'las-fuentes',
    name: 'Las Fuentes',
    zona: 'barrio',
    description: 'Comparsa del barrio de Las Fuentes, gestionada por la Asociación Gigantera de Las Fuentes.',
    asociacion: 'Asociación Gigantera de Las Fuentes',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Las Fuentes nació a principios de los años 2000 por iniciativa de la Asociación Gigantera del barrio. Sus personajes representan la historia y la idiosincrasia de este barrio zaragozano, uno de los más populosos de la ciudad. Con el tiempo se ha convertido en una de las comparsas de barrio más activas, participando en las fiestas del Pilar y en las fiestas patronales del barrio en honor a la Virgen del Carmen.',
    lat: 41.6492,
    lng: -0.8655,
    color: '#E91E63',
    personajes: [
      // Gigantes (según bloque aportado por usuario)
      { id: 'fuentes-gigante1', name: 'Gigante de Las Fuentes', type: 'gigante', description: 'Gigante del barrio Las Fuentes.', year: 2005, emoji: '🏛️', color: '#E91E63' },

      // Cabezudos (según bloque aportado por usuario)
      { id: 'fuentes-cab1', name: 'Baturra', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🎭', copla: 'Baturra, por las Fuentes voy ligero.', color: '#F06292' },
      { id: 'fuentes-cab2', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🧑‍🌾', copla: 'Baturro, por las Fuentes voy sin brillo.', color: '#F06292' },
      { id: 'fuentes-cab3', name: 'Berrugón', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '👴', copla: 'Berrugón, corre que te pillo.', color: '#F06292' },
      { id: 'fuentes-cab4', name: 'Morico', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🏇', copla: 'Morico, por las Fuentes se come las sopas.', color: '#F06292' },
      { id: 'fuentes-cab5', name: 'Payaso', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🤡', copla: 'Payaso, por las Fuentes a bailar.', color: '#F06292' },
      { id: 'fuentes-cab6', name: 'Bruja', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🧙', copla: 'Bruja, hechiza a todo el barrio.', color: '#F06292' },
      { id: 'fuentes-cab7', name: 'Coreano', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🇰🇷', copla: 'Coreano, por las Fuentes voy primero.', color: '#F06292' },
      { id: 'fuentes-cab8', name: 'Indio', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🪶', copla: 'Indio, por las Fuentes con brío.', color: '#F06292' },
      { id: 'fuentes-cab9', name: 'Maestro Cervecero', type: 'cabezudo', description: 'Cabezudo del barrio Las Fuentes (según inventario aportado).', year: 2005, emoji: '🍺', copla: 'Maestro cervecero, por las Fuentes sin parar.', color: '#F06292' },
    ]
  },
  {
    id: 'almozara',
    name: 'La Almozara',
    zona: 'barrio',
    description: 'Comparsa del barrio de La Almozara, gestionada por la Asociación de Vecinos.',
    asociacion: 'Asociación de Vecinos de La Almozara',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'La Comparsa de La Almozara fue creada por la Asociación de Vecinos del barrio para dinamizar las fiestas populares. Además, existe la Gigantera La Almozara, una agrupación independiente centrada exclusivamente en gigantes. El barrio, situado en la margen derecha del Ebro, tiene una fuerte tradición asociativa y festiva.',
    lat: 41.6605,
    lng: -0.9160,
    color: '#2E7D32',
    personajes: [
      { id: 'almozara-gigante', name: 'Gigante de La Almozara', type: 'gigante', description: 'Gigante que representa el espíritu joven y solidario del barrio.', year: 2018, emoji: '🌳', color: '#2E7D32' },
      { id: 'almozara-cab1', name: 'El Almozarero', type: 'cabezudo', description: 'Cabezudo que representa al vecino castizo del barrio.', year: 2018, copla: 'Almozarero, almozarero, por la avenida voy ligero.', emoji: '🎭', color: '#66BB6A' }
    ]
  },
  {
    id: 'rabal',
    name: 'El Rabal (Arrabal)',
    zona: 'barrio',
    description: 'Comparsa del histórico barrio del Arrabal, muy vinculada al Tío Jorge y los Sitios de Zaragoza.',
    asociacion: 'Asociación de Vecinos del Arrabal',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'La Comparsa del Rabal tiene sus raíces en el histórico barrio del Arrabal, cuna de los defensores de los Sitios de Zaragoza. Muy vinculada a la figura del Tío Jorge, sus personajes reflejan el carácter orgulloso y luchador de los arrabaleros. El barrio, situado en la margen izquierda del Ebro, es uno de los más antiguos de la ciudad.',
    lat: 41.6625,
    lng: -0.8765,
    color: '#7A1C2C',
    personajes: [
      // Gigantes (0 según listado del usuario)

      // Cabezudos (según listado del usuario)
      { id: 'rabal-cab-baturro', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo del Arrabal (según listado aportado).', year: 2000, emoji: '🧑‍🌾', copla: 'Baturro, por el Arrabal voy sin parar.', color: '#B71C1C' },
      { id: 'rabal-cab-berrugon', name: 'Berrugón', type: 'cabezudo', description: 'Cabezudo del Arrabal (según listado aportado).', year: 2000, emoji: '👴', copla: 'Berrugón, corre que te pillo.', color: '#B71C1C' },
      { id: 'rabal-cab-chulo', name: 'Chulo', type: 'cabezudo', description: 'Cabezudo del Arrabal (según listado aportado).', year: 2000, emoji: '😎', copla: 'Chulo, por el Arrabal voy primero.', color: '#B71C1C' },
      { id: 'rabal-cab-forana', name: 'Forana', type: 'cabezudo', description: 'Cabezudo del Arrabal (según listado aportado).', year: 2000, emoji: '🌾', copla: 'Forana, por el Arrabal voy ligera.', color: '#B71C1C' },
      { id: 'rabal-cab-morico', name: 'Morico', type: 'cabezudo', description: 'Cabezudo del Arrabal (según listado aportado).', year: 2000, emoji: '🏇', copla: 'Morico, el que más brío.', color: '#B71C1C' },
      { id: 'rabal-cab-ferroviario', name: 'Ferroviario', type: 'cabezudo', description: 'Cabezudo del Arrabal (según listado aportado).', year: 2000, emoji: '🚆', copla: 'Ferroviario, tren-tren, por el Arrabal.', color: '#B71C1C' }
    ]
  },
  {
    id: 'san-pablo',
    name: 'San Pablo (El Gancho)',
    zona: 'barrio',
    description: 'Comparsa del barrio de San Pablo, conocido popularmente como El Gancho.',
    asociacion: 'Asociación de Vecinos de San Pablo',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de San Pablo, también conocida como del Gancho, representa a uno de los barrios más castizos y populares de Zaragoza. El barrio de San Pablo, con su famosa plaza y su mercado, tiene una larga tradición festiva. Sus cabezudos son el alma de las fiestas del barrio.',
    lat: 41.6530,
    lng: -0.8850,
    color: '#FF5722',
    personajes: [
      { id: 'sanpablo-cab1', name: 'El Gancho', type: 'cabezudo', description: 'Cabezudo que representa al vecino más pícaro del barrio.', year: 2010, copla: 'Gancho, gancho, por San Pablo me engancho.', emoji: '🪝', color: '#FF5722' }
    ]
  },
  {
    id: 'san-jose',
    name: 'San José',
    zona: 'barrio',
    description: 'Comparsa del barrio de San José, uno de los más poblados de Zaragoza.',
    asociacion: 'Asociación de Vecinos de San José',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Comparsa del barrio de San José con cabezudos tradicionales. Según el inventario aportado, no constan gigantes en el filtro.',
    lat: 41.6435,
    lng: -0.8742,
    color: '#212121',
    personajes: [
      { id: 'sanjose-cab-baturro', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo de San José (según inventario aportado).', year: 2000, emoji: '🧑‍🌾', copla: 'Baturro, por San José voy ligero.', color: '#212121' },
      { id: 'sanjose-cab-bruja', name: 'Bruja', type: 'cabezudo', description: 'Cabezudo de San José (según inventario aportado).', year: 2000, emoji: '🧙', copla: 'Bruja, hechiza a San José.', color: '#212121' },
      { id: 'sanjose-cab-coreano', name: 'Coreano', type: 'cabezudo', description: 'Cabezudo de San José (según inventario aportado).', year: 2000, emoji: '🇰🇷', copla: 'Coreano, por San José voy primero.', color: '#212121' },
      { id: 'sanjose-cab-indio', name: 'Indio', type: 'cabezudo', description: 'Cabezudo de San José (según inventario aportado).', year: 2000, emoji: '🪶', copla: 'Indio, por San José con brío.', color: '#212121' },
      { id: 'sanjose-cab-maestro-cervecero', name: 'Maestro Cervecero', type: 'cabezudo', description: 'Cabezudo de San José (según inventario aportado).', year: 2000, emoji: '🍺', copla: 'Maestro cervecero, por San José sin parar.', color: '#212121' },
      { id: 'sanjose-cab-morico', name: 'Morico', type: 'cabezudo', description: 'Cabezudo de San José (según inventario aportado).', year: 2000, emoji: '🏇', copla: 'Morico, en San José se sale al paso.', color: '#212121' },
      { id: 'sanjose-cab-payaso', name: 'Payaso', type: 'cabezudo', description: 'Cabezudo de San José (según inventario aportado).', year: 2000, emoji: '🤡', copla: 'Payaso, en San José a bailar.', color: '#212121' }
    ]
  },
  {
    id: 'torrero',
    name: 'Torrero',
    zona: 'barrio',
    description: 'Comparsa del barrio de Torrero, gestionada por la Asociación Vecinal Venecia-Torrero.',
    asociacion: 'Asociación Vecinal Venecia-Torrero',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'La Comparsa de Torrero es una de las más activas de Zaragoza. El barrio de Torrero, delimitado por el Canal Imperial de Aragón, tiene fama de ser un barrio rebelde y con mucha personalidad. Sus gigantes y cabezudos son gestionados por la Asociación Vecinal Venecia-Torrero.',
    lat: 41.6295,
    lng: -0.8858,
    color: '#37474F',
    personajes: [
      { id: 'torrero-gigante', name: 'Gigante de Torrero', type: 'gigante', description: 'Gigante que representa el carácter reivindicativo del barrio.', year: 2010, emoji: '⚡', color: '#37474F' },
      { id: 'torrero-cab1', name: 'El Torrerano', type: 'cabezudo', description: 'Cabezudo que representa al vecino castizo de Torrero.', year: 2010, copla: 'Torrerano, torrerano, por el Canal voy temprano.', emoji: '🚣', color: '#607D8B' }
    ]
  },
  {
    id: 'la-jota',
    name: 'La Jota',
    zona: 'barrio',
    description: 'Comparsa del barrio de La Jota, en la margen izquierda del Ebro.',
    asociacion: 'Asociación de Vecinos de La Jota',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de La Jota representa a este barrio de la margen izquierda del Ebro, conocido por su ambiente festivo y sus tradicionales fiestas. El barrio toma su nombre de la jota aragonesa, el baile tradicional por excelencia.',
    lat: 41.6680,
    lng: -0.8700,
    color: '#9C27B0',
    personajes: [
      { id: 'jota-cab1', name: 'El Jotero', type: 'cabezudo', description: 'Cabezudo que representa al bailador de jota del barrio.', year: 2015, copla: 'Jotero, jotero, baila que baila ligero.', emoji: '💃', color: '#AB47BC' }
    ]
  },
  {
    id: 'delicias',
    name: 'Delicias',
    zona: 'barrio',
    description: 'Comparsa del barrio de Delicias, el más poblado de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Delicias',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'La Comparsa de Delicias es una de las más importantes de Zaragoza, al servicio del barrio más poblado de la ciudad. Delicias, con su famosa calle peatonal y el Parque de Roma, tiene una intensa vida cultural y festiva. Sus gigantes y cabezudos son gestionados por la Asociación de Vecinos de Delicias.',
    lat: 41.6515,
    lng: -0.9080,
    color: '#4CAF50',
    personajes: [
      { id: 'delicias-gigante', name: 'Gigante de Delicias', type: 'gigante', description: 'Gigante que representa la multiculturalidad del barrio.', year: 2008, emoji: '🌍', color: '#4CAF50' },
      { id: 'delicias-cab1', name: 'El Deliciero', type: 'cabezudo', description: 'Cabezudo que representa al vecino del barrio.', year: 2008, copla: 'Deliciero, deliciero, por la peatonal voy ligero.', emoji: '🚶', color: '#81C784' }
    ]
  },
  {
    id: 'vadorrey',
    name: 'Vadorrey',
    zona: 'barrio',
    description: 'Comparsa del barrio de Vadorrey, con el Pirata y el Capitán como personajes principales, ambos en categoría de cabezudos con temática del puerto de la ribera.',
    asociacion: 'Asociación de Vecinos de Vadorrey',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Vadorrey es famosa por sus personajes del Pirata y el Capitán, que reflejan la tradición fluvial del barrio junto al Ebro. Vadorrey, situado entre el río y el Canal Imperial, tiene una fuerte identidad vecinal. Ambos personajes están registrados oficialmente por la Asociación de Vecinos en la categoría de cabezudos, compartiendo la temática del puerto de la ribera.',
    lat: 41.6550,
    lng: -0.8550,
    color: '#1565C0',
    personajes: [
      { id: 'vadorrey-cab1', name: 'El Pirata', type: 'cabezudo', description: 'Cabezudo pirata que recuerda la tradición fluvial del Ebro y el puerto de la ribera de Vadorrey.', year: 2014, copla: 'Pirata, pirata, por el Ebro navega y mata.', emoji: '🏴‍☠️', color: '#1565C0' },
      { id: 'vadorrey-cab2', name: 'El Capitán', type: 'cabezudo', description: 'Cabezudo capitán de barco del Ebro, compañero del Pirata en las fiestas del barrio.', year: 2014, copla: 'Capitán, capitán, por el Ebro navegarán.', emoji: '⚓', color: '#1976D2' }
    ]
  },
  {
    id: 'actur',
    name: 'Actur-Rey Fernando',
    zona: 'barrio',
    description: 'Comparsa del barrio del Actur, el más moderno de Zaragoza.',
    asociacion: 'Asociación de Vecinos del Actur',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'La Comparsa del Actur representa al barrio más moderno de Zaragoza, surgido en los años 70 y 80. El Actur, sede de la Expo 2008 y del Parque del Agua, tiene una población joven y dinámica. Sus gigantes y cabezudos reflejan la modernidad del barrio.',
    lat: 41.6705,
    lng: -0.8885,
    color: '#1565C0',
    personajes: [
      { id: 'actur-gigante', name: 'Gigante del Actur', type: 'gigante', description: 'Gigante que representa la modernidad del barrio.', year: 2016, emoji: '🏗️', color: '#1565C0' },
      { id: 'actur-cab1', name: 'El Acturero', type: 'cabezudo', description: 'Cabezudo que representa al vecino del Actur.', year: 2016, copla: 'Acturero, acturero, por el Parque del Agua voy primero.', emoji: '🌊', color: '#42A5F5' }
    ]
  },
  {
    id: 'oliver',
    name: 'Oliver',
    zona: 'barrio',
    description: 'Comparsa del barrio Oliver, en la zona oeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Oliver',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Oliver representa a este barrio de la zona oeste de Zaragoza. Oliver, con su ambiente familiar y sus amplias zonas verdes, tiene unas fiestas populares muy queridas por sus vecinos.',
    lat: 41.6400,
    lng: -0.9300,
    color: '#FF9800',
    personajes: [
      { id: 'oliver-cab1', name: 'El Olivero', type: 'cabezudo', description: 'Cabezudo que representa al vecino del barrio Oliver.', year: 2017, copla: 'Olivero, olivero, por el barrio voy ligero.', emoji: '🍊', color: '#FF9800' }
    ]
  },
  {
    id: 'miralbueno',
    name: 'Miralbueno',
    zona: 'barrio',
    description: 'Comparsa del barrio de Miralbueno, en la zona oeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Miralbueno',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'La Comparsa de Miralbueno fue creada por la Asociación de Vecinos para animar las fiestas del barrio. Miralbueno, situado en la zona oeste de Zaragoza, es un barrio residencial con un fuerte tejido asociativo.',
    lat: 41.6328,
    lng: -0.9155,
    color: '#5D4037',
    personajes: [
      { id: 'miralbueno-gigante', name: 'El Miralbueno', type: 'gigante', description: 'Gigante que representa la mezcla de tradición y modernidad del barrio.', year: 2016, emoji: '🏰', color: '#5D4037' },
      { id: 'miralbueno-cab1', name: 'El Miralbuenero', type: 'cabezudo', description: 'Cabezudo que representa al vecino del barrio.', year: 2016, copla: 'Miralbuenero, miralbuenero, por la ermita voy primero.', emoji: '⛪', color: '#8D6E63' }
    ]
  },
  {
    id: 'santa-isabel',
    name: 'Santa Isabel',
    zona: 'barrio',
    description: 'Comparsa de Santa Isabel, con origen de núcleo rural.',
    asociacion: 'Asociación de Vecinos de Santa Isabel',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Santa Isabel conserva tradiciones rurales. Según el inventario aportado, no constan gigantes en el filtro.',
    lat: 41.6800,
    lng: -0.8500,
    color: '#C2185B',
    personajes: [
      { id: 'santaisabel-cab-baturra', name: 'Baturra', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '🎭', copla: 'Baturra, por Santa Isabel voy alegre.', color: '#C2185B' },
      { id: 'santaisabel-cab-baturro', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '🧑‍🌾', copla: 'Baturro, por Santa Isabel voy ligero.', color: '#C2185B' },
      { id: 'santaisabel-cab-morico', name: 'Morico', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '🏇', copla: 'Morico, por Santa Isabel se sale al paso.', color: '#C2185B' },
      { id: 'santaisabel-cab-berrugon', name: 'Berrugón', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '👴', copla: 'Berrugón, corre que te pillo.', color: '#C2185B' },
      { id: 'santaisabel-cab-bruja', name: 'Bruja', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '🧙', copla: 'Bruja, hechiza a todos.', color: '#C2185B' },
      { id: 'santaisabel-cab-diablo', name: 'Diablo', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '😈', copla: 'Diablo, por Santa Isabel voy primero.', color: '#C2185B' },
      { id: 'santaisabel-cab-payaso', name: 'Payaso', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '🤡', copla: 'Payaso, por Santa Isabel a bailar.', color: '#C2185B' },
      { id: 'santaisabel-cab-tuerto', name: 'Tuerto', type: 'cabezudo', description: 'Cabezudo de Santa Isabel (según inventario aportado).', year: 2000, emoji: '👁️', copla: 'Tuerto, tuerto, no te me pierdas.', color: '#C2185B' }
    ]
  },

  {
    id: 'casablanca',
    name: 'Casablanca',
    zona: 'barrio',
    description: 'Comparsa del barrio de Casablanca, con gran tradición vecinal.',
    asociacion: 'Asociación de Vecinos de Casablanca',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Casablanca es una de las más queridas de Zaragoza. El barrio de Casablanca, con su famosa plaza y su ambiente popular, tiene una larga tradición de fiestas vecinales. Sus cabezudos son el alma de las celebraciones.',
    lat: 41.6408,
    lng: -0.9025,
    color: '#C2185B',
    personajes: [
      { id: 'casablanca-cab1', name: 'La Casablanca', type: 'cabezudo', description: 'Cabezuda que representa la energía del barrio.', year: 2012, copla: 'Casablanca, mi barrio, va la gente alegre al son del tambor.', emoji: '🎭', color: '#C2185B' }
    ]
  },
  {
    id: 'valdespartera',
    name: 'Valdespartera',
    zona: 'barrio',
    description: 'Comparsa del barrio de Valdespartera, uno de los más modernos de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Valdespartera',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Valdespartera representa a este barrio moderno de la zona sur de Zaragoza. Valdespartera, con su diseño urbano contemporáneo y sus amplias zonas verdes, tiene una población joven y familiar.',
    lat: 41.6840,
    lng: -0.9050,
    color: '#0097A7',
    personajes: [
      { id: 'valdespartera-cab1', name: 'La Valdespartera', type: 'cabezudo', description: 'Cabezuda que representa el carácter familiar del barrio.', year: 2020, copla: 'Valdespartera, la más ligera, pasa la fiesta con su risa ligera.', emoji: '🌈', color: '#0097A7' }
    ]
  },
  {
    id: 'arcosur',
    name: 'Arcosur',
    zona: 'barrio',
    description: 'Comparsa del barrio de Arcosur, gestionada por la Peña Los Arqueros.',
    asociacion: 'Asociación de Vecinos / Peña Los Arqueros',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Arcosur es la más joven de Zaragoza, creada por la Peña Los Arqueros para dinamizar las fiestas del barrio. Arcosur, situado al sur de la ciudad, es un barrio en plena expansión con una población joven y dinámica.',
    lat: 41.6200,
    lng: -0.9100,
    color: '#F57C00',
    personajes: [
      { id: 'arcosur-cab1', name: 'El Arquero', type: 'cabezudo', description: 'Cabezudo que representa al espíritu deportivo del barrio.', year: 2021, copla: 'Arquero, arquero, por Arcosur voy primero.', emoji: '🏹', color: '#F57C00' }
    ]
  },
  {
    id: 'parque-goya',
    name: 'Parque Goya',
    zona: 'barrio',
    description: 'Comparsa del barrio de Parque Goya, en la zona oeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Parque Goya',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Parque Goya representa a este barrio residencial de la zona oeste de Zaragoza. Parque Goya, con sus amplias zonas verdes y su ambiente familiar, celebra sus fiestas con gran participación vecinal.',
    lat: 41.6450,
    lng: -0.9400,
    color: '#43A047',
    personajes: [
      { id: 'parquegoya-cab1', name: 'El Goyesco', type: 'cabezudo', description: 'Cabezudo que representa la inspiración artística del barrio.', year: 2019, copla: 'Goyesco, goyesco, por el parque voy fresco.', emoji: '🎨', color: '#43A047' }
    ]
  },
  {
    id: 'zalfonada',
    name: 'Zalfonada (Picarral)',
    zona: 'barrio',
    description: 'Comparsa del barrio de Picarral-Zalfonada, en la zona norte de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Picarral-Zalfonada',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Zalfonada representa a los barrios de Picarral y Zalfonada, en la zona norte de Zaragoza. Estos barrios, con su ambiente tranquilo y familiar, celebran sus fiestas con gran entusiasmo vecinal.',
    lat: 41.6650,
    lng: -0.8600,
    color: '#7B1FA2',
    personajes: [
      { id: 'zalfonada-cab1', name: 'El Zalfonero', type: 'cabezudo', description: 'Cabezudo que representa al vecino del barrio.', year: 2018, copla: 'Zalfonero, zalfonero, por Picarral voy ligero.', emoji: '🏘️', color: '#7B1FA2' }
    ]
  },
  {
    id: 'montemolin',
    name: 'Montemolín',
    zona: 'barrio',
    description: 'Comparsa de la zona de Miguel Servet / Las Fuentes altas.',
    asociacion: 'Asociación de Vecinos de Montemolín',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Comparsa de Montemolín representa a la zona alta de Las Fuentes, en torno a la avenida de Miguel Servet. Montemolín, con su ambiente residencial y sus vistas a la ciudad, tiene unas fiestas muy participativas.',
    lat: 41.6450,
    lng: -0.8700,
    color: '#00897B',
    personajes: [
      { id: 'montemolin-cab1', name: 'El Montemolinero', type: 'cabezudo', description: 'Cabezudo que representa al vecino de la zona alta.', year: 2019, copla: 'Montemolinero, montemolinero, desde lo alto voy primero.', emoji: '⛰️', color: '#00897B' }
    ]
  },

  // ═══════════════════════════════════════════
  // PUEBLOS RURALES (Pedanías de Zaragoza)
  // ═══════════════════════════════════════════
  {
    id: 'casetas',
    name: 'Casetas',
    zona: 'pueblo',
    description: 'Comparsa de Casetas, la pedanía más grande de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Casetas',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'Casetas es la pedanía más grande y poblada del municipio de Zaragoza. Su comparsa de gigantes y cabezudos es una de las más antiguas y queridas de los pueblos de Zaragoza. Participa activamente en las fiestas patronales de San Juan Bautista y en las del Pilar.',
    lat: 41.7200,
    lng: -1.0200,
    color: '#D32F2F',
    personajes: [
      // Gigantes
      { id: 'casetas-gig-fernando', name: 'Fernando el Católico', type: 'gigante', description: 'Gigante documentado en el listado para Casetas.', year: 2005, emoji: '👑', color: '#D32F2F' },
      { id: 'casetas-gig-isabel', name: 'Isabel la Católica', type: 'gigante', description: 'Gigante documentado en el listado para Casetas.', year: 2005, emoji: '👑', color: '#D32F2F' },

      // Cabezudos
      { id: 'casetas-cab-baturra', name: 'Baturra', type: 'cabezudo', description: 'Cabezudo documentado en el listado para Casetas.', year: 2005, emoji: '🎭', copla: 'Baturra, por Casetas voy alegre.', color: '#EF5350' },
      { id: 'casetas-cab-baturro', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo documentado en el listado para Casetas.', year: 2005, emoji: '🧑‍🌾', copla: 'Baturro, por Casetas voy ligero.', color: '#EF5350' },
      { id: 'casetas-cab-berrugon', name: 'Berrugón', type: 'cabezudo', description: 'Cabezudo documentado en el listado para Casetas.', year: 2005, emoji: '👴', copla: 'Berrugón, corre que te pillo.', color: '#EF5350' },
      { id: 'casetas-cab-morico', name: 'Morico', type: 'cabezudo', description: 'Cabezudo documentado en el listado para Casetas.', year: 2005, emoji: '🏇', copla: 'Morico, por Casetas se sale al paso.', color: '#EF5350' },
      { id: 'casetas-cab-payaso', name: 'Payaso', type: 'cabezudo', description: 'Cabezudo documentado en el listado para Casetas.', year: 2005, emoji: '🤡', copla: 'Payaso, por Casetas a bailar.', color: '#EF5350' },
    ]
  },
  {
    id: 'cartuja-baja',
    name: 'La Cartuja Baja',
    zona: 'pueblo',
    description: 'Comparsa de La Cartuja Baja, pedanía del sur de Zaragoza.',
    asociacion: 'Asociación de Vecinos de La Cartuja Baja',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Cartuja Baja, situada al sur de Zaragoza, toma su nombre del antiguo monasterio cartujo. La comparsa participa en las fiestas patronales del pueblo con cabezudos.',
    lat: 41.6100,
    lng: -0.8800,
    color: '#6A1B9A',
    personajes: [
      { id: 'cartuja-cab-baturra', name: 'Baturra', type: 'cabezudo', description: 'Cabezudo del listado para La Cartuja Baja.', year: 2016, emoji: '🎭', copla: 'Baturra, por La Cartuja Baja voy alegre.', color: '#8E24AA' },
      { id: 'cartuja-cab-baturro', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo del listado para La Cartuja Baja.', year: 2016, emoji: '🧑‍🌾', copla: 'Baturro, por La Cartuja Baja voy ligero.', color: '#8E24AA' },
      { id: 'cartuja-cab-berrugon', name: 'Berrugón', type: 'cabezudo', description: 'Cabezudo del listado para La Cartuja Baja.', year: 2016, emoji: '👴', copla: 'Berrugón, corre que te pillo.', color: '#8E24AA' },
      { id: 'cartuja-cab-bruja', name: 'Bruja', type: 'cabezudo', description: 'Cabezudo del listado para La Cartuja Baja.', year: 2016, emoji: '🧙', copla: 'Bruja, hechiza a todos.', color: '#8E24AA' },
      { id: 'cartuja-cab-forana', name: 'Forana', type: 'cabezudo', description: 'Cabezudo del listado para La Cartuja Baja.', year: 2016, emoji: '🌾', copla: 'Forana, por La Cartuja Baja voy ligera.', color: '#8E24AA' },
      { id: 'cartuja-cab-payaso', name: 'Payaso', type: 'cabezudo', description: 'Cabezudo del listado para La Cartuja Baja.', year: 2016, emoji: '🤡', copla: 'Payaso, por La Cartuja Baja a bailar.', color: '#8E24AA' },
    ]
  },
  {
    id: 'santa-isabel',
    name: 'Santa Isabel',
    zona: 'pueblo',
    description: 'Comparsa del barrio de Santa Isabel, con origen de núcleo rural.',
    asociacion: 'Asociación de Vecinos de Santa Isabel',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Santa Isabel conserva tradiciones rurales. La comparsa cuenta con cabezudos propios.',
    lat: 41.6800,
    lng: -0.8500,
    color: '#C2185B',
    personajes: [
      { id: 'santaisabel-cab-baturra', name: 'Baturra', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '🎭', copla: 'Baturra, por Santa Isabel voy alegre.', color: '#E91E63' },
      { id: 'santaisabel-cab-baturro', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '🧑‍🌾', copla: 'Baturro, por Santa Isabel voy ligero.', color: '#E91E63' },
      { id: 'santaisabel-cab-morico', name: 'Morico', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '🏇', copla: 'Morico, por Santa Isabel se sale al paso.', color: '#E91E63' },
      { id: 'santaisabel-cab-berrugon', name: 'Berrugón', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '👴', copla: 'Berrugón, corre que te pillo.', color: '#E91E63' },
      { id: 'santaisabel-cab-bruja', name: 'Bruja', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '🧙', copla: 'Bruja, hechiza a todos.', color: '#E91E63' },
      { id: 'santaisabel-cab-diablo', name: 'Diablo', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '😈', copla: 'Diablo, por Santa Isabel voy primero.', color: '#E91E63' },
      { id: 'santaisabel-cab-payaso', name: 'Payaso', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '🤡', copla: 'Payaso, por Santa Isabel a bailar.', color: '#E91E63' },
      { id: 'santaisabel-cab-tuerto', name: 'Tuerto', type: 'cabezudo', description: 'Cabezudo del listado para Santa Isabel.', year: 2013, emoji: '👁️', copla: 'Tuerto, tuerto, no te me pierdas.', color: '#E91E63' }
    ]
  },


  {
    id: 'garrapinillos',
    name: 'Garrapinillos',
    zona: 'pueblo',
    description: 'Comparsa de Garrapinillos, pedanía del oeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Garrapinillos',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'Garrapinillos, situado al oeste de Zaragoza junto al aeropuerto, tiene una comparsa que anima sus fiestas patronales. El pueblo conserva su identidad rural y sus tradiciones.',
    lat: 41.7100,
    lng: -1.0800,
    color: '#388E3C',
    personajes: [
      // Gigantes (según bloque aportado por usuario)
      { id: 'garrapinillos-gig-agustina', name: 'Agustina de Aragón', type: 'gigante', description: 'Gigante documentado de Garrapinillos.', year: 2008, emoji: '📜', color: '#388E3C' },

      // Cabezudos (según bloque aportado por usuario)
      { id: 'garrapinillos-cab-baturra', name: 'Baturra', type: 'cabezudo', description: 'Cabezudo de Garrapinillos (según inventario aportado).', year: 2008, emoji: '🎭', copla: 'Baturra, por Garrapinillos voy ligero.', color: '#66BB6A' },
      { id: 'garrapinillos-cab-baturro', name: 'Baturro', type: 'cabezudo', description: 'Cabezudo de Garrapinillos (según inventario aportado).', year: 2008, emoji: '🧑‍🌾', copla: 'Baturro, por Garrapinillos sin parar.', color: '#66BB6A' },
      { id: 'garrapinillos-cab-morico', name: 'Morico', type: 'cabezudo', description: 'Cabezudo de Garrapinillos (según inventario aportado).', year: 2008, emoji: '🏇', copla: 'Morico, por el campo voy primero.', color: '#66BB6A' },
      { id: 'garrapinillos-cab-berrugon', name: 'Berrugón', type: 'cabezudo', description: 'Cabezudo de Garrapinillos (según inventario aportado).', year: 2008, emoji: '👴', copla: 'Berrugón, corre que te pillo.', color: '#66BB6A' },
      { id: 'garrapinillos-cab-bruja', name: 'Bruja', type: 'cabezudo', description: 'Cabezudo de Garrapinillos (según inventario aportado).', year: 2008, emoji: '🧙', copla: 'Bruja, hechiza la fiesta a todo el mundo.', color: '#66BB6A' },
      { id: 'garrapinillos-cab-payaso', name: 'Payaso', type: 'cabezudo', description: 'Cabezudo de Garrapinillos (según inventario aportado).', year: 2008, emoji: '🤡', copla: 'Payaso, por Garrapinillos a bailar.', color: '#66BB6A' },
    ]
  },

  {
    id: 'monzalbarba',
    name: 'Monzalbarba',
    zona: 'pueblo',
    description: 'Comparsa de Monzalbarba, pedanía del noroeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Monzalbarba',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Monzalbarba, situado al noroeste de Zaragoza a orillas del Canal Imperial, tiene una comparsa de cabezudos que alegra sus fiestas patronales. El pueblo mantiene vivas sus tradiciones y su carácter rural.',
    lat: 41.7400,
    lng: -0.9800,
    color: '#5D4037',
    personajes: [
      { id: 'monzalbarba-cab1', name: 'El Monzalbarbino', type: 'cabezudo', description: 'Cabezudo que representa al vecino de Monzalbarba.', year: 2010, copla: 'Monzalbarbino, monzalbarbino, por el canal voy fino.', emoji: '🌾', color: '#5D4037' }
    ]
  },
  {
    id: 'movera',
    name: 'Movera',
    zona: 'pueblo',
    description: 'Comparsa de Movera, pedanía del este de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Movera',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Movera, situada al este de Zaragoza junto al Ebro, tiene una comparsa de cabezudos que participa en sus fiestas patronales. El pueblo conserva su esencia rural y su cercanía al río.',
    lat: 41.6800,
    lng: -0.8000,
    color: '#1565C0',
    personajes: [
      { id: 'movera-cab1', name: 'El Moverano', type: 'cabezudo', description: 'Cabezudo que representa al vecino de Movera.', year: 2012, copla: 'Moverano, moverano, por la ribera voy temprano.', emoji: '🌊', color: '#1565C0' }
    ]
  },
  {
    id: 'montanana',
    name: 'Montañana',
    zona: 'pueblo',
    description: 'Comparsa de Montañana, pedanía del norte de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Montañana',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Montañana, situada al norte de Zaragoza en un entorno de huerta y monte bajo, tiene una comparsa de cabezudos que anima sus fiestas. El pueblo mantiene su carácter rural y su tranquilidad.',
    lat: 41.7000,
    lng: -0.8500,
    color: '#2E7D32',
    personajes: [
      { id: 'montanana-cab1', name: 'El Montañanero', type: 'cabezudo', description: 'Cabezudo que representa al vecino de Montañana.', year: 2013, copla: 'Montañanero, montañanero, por la huerta voy primero.', emoji: '🥬', color: '#2E7D32' }
    ]
  },
  {
    id: 'penaflor',
    name: 'Peñaflor',
    zona: 'pueblo',
    description: 'Comparsa de Peñaflor, pedanía del norte de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Peñaflor',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Peñaflor, situada al norte de Zaragoza, es una pequeña pedanía con una comparsa de cabezudos que da vida a sus fiestas patronales. El pueblo conserva su identidad rural y su ambiente acogedor.',
    lat: 41.7200,
    lng: -0.8300,
    color: '#F57C00',
    personajes: [
      { id: 'penaflor-cab1', name: 'El Peñaflorino', type: 'cabezudo', description: 'Cabezudo que representa al vecino de Peñaflor.', year: 2014, copla: 'Peñaflorino, peñaflorino, por las fiestas voy fino.', emoji: '🌻', color: '#F57C00' }
    ]
  },
  {
    id: 'san-juan-mozarrifar',
    name: 'San Juan de Mozarrifar',
    zona: 'pueblo',
    description: 'Comparsa de San Juan de Mozarrifar, pedanía del norte de Zaragoza.',
    asociacion: 'Asociación de Vecinos de San Juan de Mozarrifar',
    hasGigantes: true,
    hasCabezudos: true,
    historia: 'San Juan de Mozarrifar, situado al norte de Zaragoza, tiene una comparsa con gigantes y cabezudos que participa en sus fiestas patronales en honor a San Juan Bautista. El pueblo ha crecido en los últimos años pero mantiene su esencia rural.',
    lat: 41.7000,
    lng: -0.9000,
    color: '#EF6C00',
    personajes: [
      { id: 'sanjuanmoz-gigante', name: 'Gigante de San Juan', type: 'gigante', description: 'Gigante que representa la tradición del pueblo.', year: 2015, emoji: '⛪', color: '#EF6C00' },
      { id: 'sanjuanmoz-cab1', name: 'El Sanjuanero', type: 'cabezudo', description: 'Cabezudo que representa al vecino del pueblo.', year: 2014, copla: 'San Juan, San Juan, que suena la música y se oye la jota al pasar.', emoji: '🎺', color: '#EF6C00' }
    ]
  },
  {
    id: 'juslibol',
    name: 'Juslibol',
    zona: 'pueblo',
    description: 'Comparsa de Juslibol, pedanía del noroeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Juslibol',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Juslibol, situado al noroeste de Zaragoza a orillas del Ebro, es famoso por su monasterio y su entorno natural. Su comparsa de cabezudos anima las fiestas patronales del pueblo.',
    lat: 41.7300,
    lng: -0.9500,
    color: '#00838F',
    personajes: [
      { id: 'juslibol-cab1', name: 'El Juslibolero', type: 'cabezudo', description: 'Cabezudo que representa al vecino de Juslibol.', year: 2015, copla: 'Juslibolero, juslibolero, por el Ebro voy primero.', emoji: '🏞️', color: '#00838F' }
    ]
  },
  {
    id: 'san-gregorio',
    name: 'San Gregorio',
    zona: 'pueblo',
    description: 'Comparsa de San Gregorio, pedanía del oeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de San Gregorio',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'San Gregorio, situado al oeste de Zaragoza, es una pedanía con una comparsa de cabezudos que participa en sus fiestas patronales en honor a San Gregorio Magno.',
    lat: 41.7100,
    lng: -1.0400,
    color: '#4E342E',
    personajes: [
      { id: 'sangregorio-cab1', name: 'El Gregoriano', type: 'cabezudo', description: 'Cabezudo que representa al vecino de San Gregorio.', year: 2016, copla: 'Gregoriano, gregoriano, por las fiestas voy temprano.', emoji: '🙏', color: '#4E342E' }
    ]
  },
  {
    id: 'cartuja-baja',
    name: 'La Cartuja Baja',
    zona: 'pueblo',
    description: 'Comparsa de La Cartuja Baja, pedanía del sur de Zaragoza.',
    asociacion: 'Asociación de Vecinos de La Cartuja Baja',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'La Cartuja Baja, situada al sur de Zaragoza, toma su nombre del antiguo monasterio cartujo. Su comparsa de cabezudos anima las fiestas patronales del pueblo.',
    lat: 41.6100,
    lng: -0.8800,
    color: '#6A1B9A',
    personajes: [
      { id: 'cartuja-cab1', name: 'El Cartujano', type: 'cabezudo', description: 'Cabezudo que representa al vecino de La Cartuja.', year: 2016, copla: 'Cartujano, cartujano, por el monasterio voy temprano.', emoji: '🏛️', color: '#6A1B9A' }
    ]
  },
  {
    id: 'alfocea',
    name: 'Alfocea',
    zona: 'pueblo',
    description: 'Comparsa de Alfocea, pedanía del noroeste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Alfocea',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Alfocea, situada al noroeste de Zaragoza junto al Ebro, es una pequeña pedanía con una comparsa de cabezudos que alegra sus fiestas patronales.',
    lat: 41.7400,
    lng: -0.9700,
    color: '#00897B',
    personajes: [
      { id: 'alfocea-cab1', name: 'El Alfoceano', type: 'cabezudo', description: 'Cabezudo que representa al vecino de Alfocea.', year: 2017, copla: 'Alfoceano, alfoceano, por la ribera voy temprano.', emoji: '🌿', color: '#00897B' }
    ]
  },
  {
    id: 'torrecilla-valmadrid',
    name: 'Torrecilla de Valmadrid',
    zona: 'pueblo',
    description: 'Comparsa de Torrecilla de Valmadrid, pedanía del sureste de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Torrecilla de Valmadrid',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Torrecilla de Valmadrid, situada al sureste de Zaragoza, es una pequeña pedanía con una comparsa de cabezudos que participa en sus fiestas patronales.',
    lat: 41.6000,
    lng: -0.8200,
    color: '#795548',
    personajes: [
      { id: 'torrecilla-cab1', name: 'El Torrecillano', type: 'cabezudo', description: 'Cabezudo que representa al vecino de Torrecilla.', year: 2018, copla: 'Torrecillano, torrecillano, por Valmadrid voy temprano.', emoji: '🏘️', color: '#795548' }
    ]
  },
  {
    id: 'venta-olivar',
    name: 'Venta del Olivar',
    zona: 'pueblo',
    description: 'Comparsa de Venta del Olivar, pedanía del este de Zaragoza.',
    asociacion: 'Asociación de Vecinos de Venta del Olivar',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Venta del Olivar, situada al este de Zaragoza, es una pequeña pedanía con una comparsa de cabezudos que anima sus fiestas patronales. Su nombre recuerda la antigua venta de camino.',
    lat: 41.6700,
    lng: -0.7800,
    color: '#F9A825',
    personajes: [
      { id: 'ventaolivar-cab1', name: 'El Ventero', type: 'cabezudo', description: 'Cabezudo que representa al ventero del camino.', year: 2018, copla: 'Ventero, ventero, por el camino voy primero.', emoji: '🏠', color: '#F9A825' }
    ]
  },
  {
    id: 'villarrapa',
    name: 'Villarrapa',
    zona: 'pueblo',
    description: '🌲 Villarrapa | Tipo: Pueblo | Gestión: Alcaldía Pedánea de Villarrapa. La comparsa consta de 1 Cabezudo tradicional catalogado.',
    asociacion: 'Alcaldía Pedánea de Villarrapa',
    hasGigantes: false,
    hasCabezudos: true,
    historia: 'Villarrapa es una pequeña pedanía situada al oeste de Zaragoza, en la margen derecha del río Ebro, muy cerca del límite con el municipio de La Muela. Su nombre proviene del latín "Villa Rapa", que significa "villa del nabo" o "villa del cultivo", haciendo referencia a su pasado agrícola. La comparsa de Villarrapa consta de 1 cabezudo tradicional catalogado: El Villarrapino.',
    lat: 41.6210,
    lng: -0.9300,
    color: '#8D6E63',
    personajes: [
      { id: 'villarrapa-cab1', name: 'El Villarrapino', type: 'cabezudo', description: 'Cabezudo tradicional de Villarrapa, representa al vecino del pueblo en sus fiestas patronales.', year: 2019, copla: 'Villarrapino, villarrapino, por el pueblo voy fino.', emoji: '👨‍🌾', color: '#A1887F' }
    ]
  }
];

// Helper function to get comparsas by zone type
export function getComparsasByZona(zona: ZonaType | 'todas'): BarrioComparsa[] {
  if (zona === 'todas') return barrioComparsas;
  return barrioComparsas.filter(c => c.zona === zona);
}

// Helper function to get comparsas that have gigantes
export function getComparsasWithGigantes(): BarrioComparsa[] {
  return barrioComparsas.filter(c => c.hasGigantes);
}

// Helper function to get comparsas that have cabezudos
export function getComparsasWithCabezudos(): BarrioComparsa[] {
  return barrioComparsas.filter(c => c.hasCabezudos);
}