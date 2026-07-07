export interface ComparsaMember {
  id: string;
  name: string;
  type: 'gigante' | 'cabezudo';
  creator: string;
  year: number;
  history: string;
  description: string;
  height?: number; // In meters (only for giants)
  weight?: number; // In kg
  copla?: string;  // Traditional rhyme/song (primarily for cabezudos, but some giants have them)
  imagePlaceholder: string; // Used for UI rendering, can link to styling backgrounds
  iconColor: string; // Hex color associated with character
}

export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
  isStop?: boolean;
}

export interface ParadeRoute {
  id: string;
  name: string;
  description: string;
  dateString: string;
  points: RoutePoint[];
  color: string;
}

export const comparsaMembers: ComparsaMember[] = [
  // GIGANTES
  {
    id: 'rey',
    name: 'Rey Don Jaime I',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.85,
    weight: 90,
    history: 'El Rey Don Jaime I "El Conquistador" y su esposa Doña Leonor representan los orígenes medievales del Reino de Aragón. Jaime I conquistó Mallorca, Valencia y Murcia y expandió enormemente la corona aragonesa.',
    description: 'Viste ropajes de rey medieval con corona dorada y cetro. Su mirada majestuosa transmite solemnidad y autoridad real.',
    imagePlaceholder: '👑',
    iconColor: '#D4AF37'
  },
  {
    id: 'reina',
    name: 'Reina Doña Leonor',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.80,
    weight: 85,
    history: 'Doña Leonor de Castilla fue reina consorte de Aragón por su matrimonio con Jaime I. Representa la alianza entre los reinos medievales cristianos y la nobleza de la época.',
    description: 'Viste ropajes de corte medieval con mantilla blanca y un elegante vestido rojo y dorado, sosteniendo un abanico y un pañuelo.',
    imagePlaceholder: '👸',
    iconColor: '#D1121F'
  },
  {
    id: 'duque',
    name: 'El Duque de Villahermosa',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.75,
    weight: 88,
    history: 'Representa a la alta aristocracia aragonesa, en particular a la influyente Casa de Villahermosa, benefactores de las artes y las letras en Aragón durante los siglos de oro.',
    description: 'Porta un distinguido traje de época con casaca de terciopelo, chupa bordada y espadín al cinto. Luce peluca empolvada típica del siglo XVIII.',
    imagePlaceholder: '🎩',
    iconColor: '#7A1C2C'
  },
  {
    id: 'duquesa',
    name: 'La Duquesa',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.70,
    weight: 82,
    history: 'Acompañante del Duque, representa el refinamiento y la moda de la aristocracia ilustrada zaragozana del siglo XVIII.',
    description: 'Viste un elegante traje de gala de estilo goyesco con ricos encajes y pedrería, sosteniendo un delicado abanico cerrado.',
    imagePlaceholder: '🌂',
    iconColor: '#FFD700'
  },
  {
    id: 'don-quijote',
    name: 'Don Quijote de la Mancha',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.90,
    weight: 75,
    history: 'El célebre personaje de Miguel de Cervantes fue incluido en la comparsa porque en la segunda parte de la novela, Don Quijote y Sancho Panza visitan tierras aragonesas y se hospedan en un palacio de unos duques (identificados históricamente en Pedrola).',
    description: 'Figura esbelta, enjuta y demacrada, con armadura metálica, lanza de torneo y escudo. Su mirada soñadora apunta hacia el horizonte.',
    imagePlaceholder: '🛡️',
    iconColor: '#808080'
  },
  {
    id: 'dulcinea',
    name: 'Dulcinea del Toboso',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.75,
    weight: 80,
    history: 'La amada idealizada de Don Quijote. Representa la belleza tosca de la mujer del campo convertida en dama celestial por el delirio del caballero andante.',
    description: 'Viste como dama distinguida con tocado renacentista y vestido verde esmeralda con ribetes dorados, con un rostro sereno y melancólico.',
    imagePlaceholder: '🌹',
    iconColor: '#2E7D32'
  },
  {
    id: 'el-chino',
    name: 'El Chino',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.65,
    weight: 85,
    history: 'Representa la presencia de las culturas exóticas y lejanas en las exposiciones mundiales del siglo XIX. Traído originalmente como representación de Asia.',
    description: 'Viste un sombrero de cono mandarín tradicional, trenza larga en la espalda e indumentaria de seda con estampados orientales y mangas anchas.',
    imagePlaceholder: '🏮',
    iconColor: '#FF9800'
  },
  {
    id: 'la-negra',
    name: 'La Negra',
    type: 'gigante',
    creator: 'Félix Oroz',
    year: 1918,
    height: 3.60,
    weight: 83,
    history: 'Junto con el Chino, representa la universalidad del mundo. Simboliza al continente africano y añade diversidad cultural a la comparsa tradicional aragonesa.',
    description: 'Luce un colorido turbante africano, collares llamativos de cuentas doradas y un vestido largo y fluido de estampados geométricos vibrantes.',
    imagePlaceholder: '🥁',
    iconColor: '#E65100'
  },
  {
    id: 'gaston',
    name: 'Gastón de Bearn',
    type: 'gigante',
    creator: 'Ángel Lope (Restauración)',
    year: 1956,
    height: 3.80,
    weight: 87,
    history: 'Gastón IV de Bearn fue un noble francés que colaboró con el rey Alfonso I El Batallador en la reconquista de Zaragoza a los musulmanes en el año 1118, siendo nombrado primer gobernador de la ciudad.',
    description: 'Viste cota de malla medieval de caballero cruzado con el escudo heráldico de Bearn en el pecho, portando espada y escudo defensivo.',
    imagePlaceholder: '⚔️',
    iconColor: '#1565C0'
  },
  {
    id: 'talesa',
    name: 'Doña Talesa de Aragón',
    type: 'gigante',
    creator: 'Ángel Lope (Restauración)',
    year: 1956,
    height: 3.75,
    weight: 81,
    history: 'Esposa de Gastón de Bearn, representa a la nobleza occitana y su papel clave en la repoblación del valle del Ebro tras la reconquista de 1118.',
    description: 'Viste ropajes de dama de la nobleza occitana, con velo translúcido y una tiara floral sobre sus cabellos trenzados.',
    imagePlaceholder: '🌺',
    iconColor: '#EC407A'
  },
  {
    id: 'agustina',
    name: 'Agustina de Aragón',
    type: 'gigante',
    creator: 'Francisco Rallo',
    year: 1982,
    height: 3.75,
    weight: 84,
    history: 'La gran heroína de los Sitios de Zaragoza durante la Guerra de la Independencia Española (1808). Disparó el cañón defensivo en la Puerta del Portillo cuando las tropas francesas estaban a punto de romper las defensas.',
    description: 'Luce traje de época con la cinta de oficial al pecho y sostiene una bayoneta defensiva en sus manos con semblante resuelto y heroico.',
    imagePlaceholder: '💣',
    iconColor: '#1B5E20'
  },
  {
    id: 'palafox',
    name: 'José de Palafox',
    type: 'gigante',
    creator: 'Francisco Rallo',
    year: 1982,
    height: 3.85,
    weight: 90,
    history: 'El General Palafox fue el líder militar que organizó y dirigió la heroica defensa civil de la ciudad de Zaragoza durante los dos sangrientos asedios del ejército de Napoleón Bonaparte.',
    description: 'Viste un impecable uniforme militar de gala de general español de 1808 con fajín rojo, charreteras doradas y condecoraciones al valor.',
    imagePlaceholder: '🎖️',
    iconColor: '#0D47A1'
  },
  {
    id: 'goya',
    name: 'Francisco de Goya y Lucientes',
    type: 'gigante',
    creator: 'Manuel Aladrén',
    year: 2008,
    height: 3.80,
    weight: 88,
    history: 'El pintor aragonés más universal e ilustre, nacido en Fuendetodos y formado en Zaragoza. Goya revolucionó la historia de la pintura moderna y documentó como nadie los desastres de la guerra y la vida cotidiana zaragozana.',
    description: 'Luce traje de caballero ilustrado con casaca oscura, pañuelo de cuello y sostiene una paleta de pintor y unos pinceles en su mano izquierda.',
    imagePlaceholder: '🎨',
    iconColor: '#3E2723'
  },
  {
    id: 'josefa-bayeu',
    name: 'Josefa Bayeu',
    type: 'gigante',
    creator: 'Manuel Aladrén',
    year: 2008,
    height: 3.70,
    weight: 82,
    history: 'Esposa de Francisco de Goya y hermana del también célebre pintor Francisco Bayeu. Su inclusión rinde homenaje al papel fundamental de las mujeres zaragozanas en la vida y el apoyo creativo de los grandes genios.',
    description: 'Viste un primoroso traje goyesco del siglo XVIII de encajes negros con mantilla tradicional zaragozana y abanico de mano pintado.',
    imagePlaceholder: '🪭',
    iconColor: '#4A148C'
  },

  // CABEZUDOS
  {
    id: 'morico',
    name: 'El Morico',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1841,
    history: 'Es quizás el cabezudo más popular y querido. Representa a un sirviente de origen cubano que llegó a Zaragoza al servicio de un noble local. Es famoso por ser veloz y escurridizo.',
    description: 'Viste gorra de jockey tricolor (azul, roja y amarilla), chaqueta de terciopelo azul y pantalones bombachos amarillos.',
    copla: 'Aquí, aquí, Morico el del Pilar, que no come rancho por no pagar. Le da al porrón, le da al barril, y a los chavales los hace correr así.',
    imagePlaceholder: '🏇',
    iconColor: '#0288D1'
  },
  {
    id: 'boticario',
    name: 'El Boticario',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1841,
    history: 'Representa a un farmacéutico real de la Zaragoza del siglo XIX que tenía su botica cerca de la Plaza del Pilar y se quejaba constantemente del ruido de la comparsa.',
    description: 'Luce un semblante enfadado y altivo con un gran sombrero de copa, gafas redondas metálicas y una capa negra que ondea al correr.',
    copla: 'Boticario, boticario, con la capa del boticario, cuando corre el boticario, se le cae el calendario.',
    imagePlaceholder: '🧪',
    iconColor: '#212121'
  },
  {
    id: 'robaculeros',
    name: 'El Robaculeros',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1841,
    history: 'Originalmente representaba a un bandolero o un pícaro callejero de los suburbios. Su nombre proviene de su costumbre de asaltar los bolsillos traseros (culeros) de la gente.',
    description: 'Luce una frente abultada y mentón prominente. Lleva un pañuelo anudado a la cabeza (cachirulo) y un traje rústico verde y marrón.',
    copla: 'Robaculeros, ponte al corriente, que los chiquillos te clavan el diente. Corre que corre, no cogerás a ninguno de los que van detrás.',
    imagePlaceholder: '🎒',
    iconColor: '#4CAF50'
  },
  {
    id: 'pilara',
    name: 'La Pilara',
    type: 'cabezudo',
    creator: 'Modesto Lobón',
    year: 1982,
    history: 'Inspirada en Pilar Lahuerta, una popular cantante y vedette del legendario cabaret zaragozano "El Plata" en el tubo de Zaragoza. Fue la primera cabezuda que representó a una persona real contemporánea.',
    description: 'Luce un maquillaje muy vistoso, pelo rubio oxigenado recogido y un vestido rojo de lentejuelas con plumas de cabaret.',
    copla: 'Pilara, Pilara, cara de cuchara, que canta en el Plata con voz de hojalata. Si corres un poco, te muerde el cogote.',
    imagePlaceholder: '🎤',
    iconColor: '#E91E63'
  },
  {
    id: 'tuerto',
    name: 'El Tuerto',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1841,
    history: 'Representa a un médico de carácter colérico o a un pirata caricaturizado de la época. Su mirada bizca y tuerta asusta tradicionalmente a los niños pequeños.',
    description: 'Llevar un sombrero bicornio negro napoleónico, un parche en su ojo izquierdo bizco y una mueca torcida en los labios.',
    copla: 'El Tuerto por aquí, el Tuerto por allá, si no corres mucho, te la pegará. Tuerto de un ojo, cara de cerrojo, te come los mocos.',
    imagePlaceholder: '👁️',
    iconColor: '#37474F'
  },
  {
    id: 'forano',
    name: 'El Forano',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1841,
    history: 'Representa al campesino aragonés de fuera de la capital (forano) que viene de visita a Zaragoza a las Fiestas del Pilar vestido con sus mejores galas rústicas.',
    description: 'Llevar un sombrero de copa de paja, patillas muy pobladas y viste un chaleco de terciopelo bordado con pantalones de pana.',
    copla: 'El Forano, forano, saca la porra de debajo de la mano. Si te coge el Forano, te da con la porra y te deja plano.',
    imagePlaceholder: '🌾',
    iconColor: '#795548'
  },
  {
    id: 'forana',
    name: 'La Forana',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1916,
    history: 'Acompañante de El Forano. Es una mujer aragonesa del campo, un tanto estrafalaria y parlanchina, que presume de estar a la moda de la gran ciudad.',
    description: 'Luce peinado alto con peineta de carey, pendientes de gran tamaño y viste un colorido mantón de Manila sobre vestido folclórico.',
    copla: 'La Forana, la Forana, va de limpio por la mañana. Se peina y se limpia para ir a ver a su primo el del Pilar.',
    imagePlaceholder: '🧺',
    iconColor: '#FF5722'
  },
  {
    id: 'torero',
    name: 'El Torero',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1841,
    history: 'Representa la fiesta taurina española en tono de parodia. Es cobarde, vanidoso y siempre huye cuando los chicos le plantan cara.',
    description: 'Lleva una montera negra de torero, traje de luces bordado de color verde botella con medias rosas y coleta trasera.',
    copla: 'Torero, torero, ponte el sombrero, que viene el toro por el callejero. Si eres valiente, ponte delante, y si no, vete al instante.',
    imagePlaceholder: '🐂',
    iconColor: '#004D40'
  },
  {
    id: 'verrugon',
    name: 'El Verrugón',
    type: 'cabezudo',
    creator: 'Félix Oroz',
    year: 1841,
    history: 'Representa a un corregidor o magistrado municipal corrupto e influyente del siglo XIX, famoso por su mal genio y la gran verruga en su mejilla.',
    description: 'Luce un sombrero de tres picos con galones de oro, peluca blanca rizada y una gran verruga morada entre la nariz y la mejilla izquierda.',
    copla: 'Verrugón, verrugón, saca la porra del cajón. Que si no la sacas tú, la sacará el chavalón.',
    imagePlaceholder: '👴',
    iconColor: '#4E342E'
  },
  {
    id: 'cigarrera',
    name: 'La Cigarrera (Herminia)',
    type: 'cabezudo',
    creator: 'Ana de la Hoz',
    year: 2015,
    history: 'Inspirada en Herminia Martínez, la popular cigarrera del Tubo de Zaragoza que vendió tabaco y cerillas durante décadas en las zonas de ocio nocturno y cabaret.',
    description: 'Luce un moño tradicional, delantal de trabajo oscuro sobre ropa zaragozana de los años 50 y lleva su mítica bandeja de tabaco colgada del cuello.',
    copla: 'Cigarrera, cigarrera, que vendes tabaco en la acera. Vendes tabaco y cerillas y corres como una ardilla.',
    imagePlaceholder: '🚬',
    iconColor: '#8E24AA'
  },
  {
    id: 'azutero',
    name: 'El Azutero',
    type: 'cabezudo',
    creator: 'Francisco Rallo (Hijo)',
    year: 2022,
    history: 'Homenaje al canto y baile folclórico de la Jota Aragonesa. Su nombre proviene de los danzantes del barrio del Arrabal, junto al azud del río Ebro.',
    description: 'Viste el traje tradicional de jotero con chaleco bordado, faja morada en la cintura, alpargatas de cáñamo y cachirulo atado al frente.',
    copla: 'El Azutero cantando la jota corre que corre con buena bota. Canta que canta y salta con gracia, alegrando a toda Zaragoza.',
    imagePlaceholder: '🪕',
    iconColor: '#9C27B0'
  },
  {
    id: 'almozara',
    name: 'La Almozara',
    type: 'gigante',
    creator: 'Comparsa de Barrio',
    year: 2018,
    history: 'Representa el espíritu joven y solidario de La Almozara, barrio de vecinos muy implicados en la vida cultural y deportiva.',
    description: 'Luce un traje de gala con colores verdes y naranjas, símbolo de la vegetación urbana y del dinamismo del barrio.',
    imagePlaceholder: '🌳',
    iconColor: '#2E7D32'
  },
  {
    id: 'san-juan',
    name: 'El Sanjuanero',
    type: 'cabezudo',
    creator: 'Comparsa de Barrio',
    year: 2014,
    history: 'Personaje popular nacido en San Juan para recordar las fiestas de barrio y la alegría de sus plazas y calles.',
    description: 'Va con una gorra de colores brillantes, pañuelo al cuello y sonrisa amplia que le hace muy reconocible.',
    copla: 'San Juan, San Juan, que suena la música y se oye la jota al pasar.',
    imagePlaceholder: '🎺',
    iconColor: '#EF6C00'
  },
  {
    id: 'casablanca',
    name: 'La Casablanca',
    type: 'cabezudo',
    creator: 'Comparsa de Barrio',
    year: 2012,
    history: 'Homenaje al barrio de Casablanca, con raíces populares y una tradición de calles llenas de vecinos y fiesta.',
    description: 'Lleva un mantón de colores intensos y una expresión alegre que encarna la energía del barrio.',
    copla: 'Casablanca, mi barrio, va la gente alegre al son del tambor.',
    imagePlaceholder: '🎭',
    iconColor: '#C2185B'
  },
  {
    id: 'miralbueno',
    name: 'El Miralbueno',
    type: 'gigante',
    creator: 'Comparsa de Barrio',
    year: 2016,
    history: 'Gigante de barrio inspirado en la mezcla de tradición y modernidad que caracteriza a Miralbueno.',
    description: 'Muestra un atuendo clásico con detalles de la arquitectura y el entorno verde del barrio.',
    imagePlaceholder: '🏰',
    iconColor: '#5D4037'
  },
  {
    id: 'valdespartera',
    name: 'La Valdespartera',
    type: 'cabezudo',
    creator: 'Comparsa de Barrio',
    year: 2020,
    history: 'Representa el carácter familiar y acogedor de Valdespartera, con un aire cercano y muy participativo.',
    description: 'Va vestida con colores azul y blanco, con un gesto simpático que encanta a los niños.',
    copla: 'Valdespartera, la más ligera, pasa la fiesta con su risa ligera.',
    imagePlaceholder: '🌈',
    iconColor: '#0097A7'
  },
  {
    id: 'villarrapa',
    name: 'El Villarrapa',
    type: 'gigante',
    creator: 'Comparsa de Barrio',
    year: 2019,
    history: 'Recupera la memoria de las fiestas de Villarrapa y de las celebraciones vecinales que han marcado el barrio.',
    description: 'Luce un atuendo de tonos tierra y una gran sonrisa que lo hace muy humano y cercano.',
    imagePlaceholder: '🧡',
    iconColor: '#8D6E63'
  }
];

export const paradeRoutes: ParadeRoute[] = [
  {
    id: 'recorrido-pilar',
    name: 'Recorrido Tradicional del Pilar',
    description: 'El recorrido clásico que transcurre por el casco histórico durante las Fiestas de la Virgen del Pilar en Octubre. Salida y llegada en el Ayuntamiento.',
    dateString: '12 de Octubre, 11:30 AM',
    color: '#D1121F',
    points: [
      { lat: 41.6568, lng: -0.8783, name: 'Ayuntamiento de Zaragoza (Salida)', isStop: true },
      { lat: 41.6560, lng: -0.8805, name: 'Calle Alfonso I' },
      { lat: 41.6542, lng: -0.8812, name: 'Cruce Calle Manifestación', isStop: true },
      { lat: 41.6521, lng: -0.8821, name: 'Calle Alfonso I - Centro' },
      { lat: 41.6508, lng: -0.8827, name: 'Plaza de España', isStop: true },
      { lat: 41.6515, lng: -0.8805, name: 'El Coso' },
      { lat: 41.6528, lng: -0.8778, name: 'Calle Don Jaime I' },
      { lat: 41.6548, lng: -0.8770, name: 'Plaza de la Santa Cruz', isStop: true },
      { lat: 41.6562, lng: -0.8765, name: 'Calle Don Jaime I - Norte' },
      { lat: 41.6568, lng: -0.8783, name: 'Ayuntamiento de Zaragoza (Llegada)', isStop: true }
    ]
  },
  {
    id: 'recorrido-san-valero',
    name: 'Recorrido de San Valero (Patrón)',
    description: 'Recorrido invernal en honor al patrón de Zaragoza, San Valero. Suele acompañarse del tradicional reparto de roscón en la Plaza del Pilar.',
    dateString: '29 de Enero, 11:00 AM',
    color: '#D4AF37',
    points: [
      { lat: 41.6568, lng: -0.8783, name: 'Plaza del Pilar (Salida)', isStop: true },
      { lat: 41.6561, lng: -0.8771, name: 'Calle Don Jaime I' },
      { lat: 41.6545, lng: -0.8777, name: 'Plaza Ariño', isStop: true },
      { lat: 41.6534, lng: -0.8783, name: 'Calle San Jorge' },
      { lat: 41.6528, lng: -0.8800, name: 'Plaza Santa Cruz', isStop: true },
      { lat: 41.6521, lng: -0.8812, name: 'Calle Cinegio (El Tubo)' },
      { lat: 41.6526, lng: -0.8825, name: 'Calle Estébanes (El Tubo)', isStop: true },
      { lat: 41.6542, lng: -0.8812, name: 'Calle Alfonso I' },
      { lat: 41.6568, lng: -0.8783, name: 'Plaza del Pilar (Llegada)', isStop: true }
    ]
  },
  {
    id: 'recorrido-arrabal',
    name: 'Recorrido Barrio del Arrabal',
    description: 'Recorrido especial cruzando el Puente de Piedra hacia el histórico barrio del Arrabal, cuna de los defensores de los Sitios y del Azutero.',
    dateString: '18 de Mayo, 18:00 PM',
    color: '#7A1C2C',
    points: [
      { lat: 41.6568, lng: -0.8783, name: 'Plaza del Pilar (Salida)', isStop: true },
      { lat: 41.6582, lng: -0.8772, name: 'Puente de Piedra (Cruce Río Ebro)' },
      { lat: 41.6601, lng: -0.8760, name: 'Plaza de la Mesa (Arrabal)', isStop: true },
      { lat: 41.6615, lng: -0.8752, name: 'Calle Sobrarbe' },
      { lat: 41.6625, lng: -0.8765, name: 'Plaza Rosario (Arrabal)', isStop: true },
      { lat: 41.6608, lng: -0.8780, name: 'Calle Sixto Celorrio' },
      { lat: 41.6582, lng: -0.8772, name: 'Puente de Piedra' },
      { lat: 41.6568, lng: -0.8783, name: 'Plaza del Pilar (Llegada)', isStop: true }
    ]
  }
];
