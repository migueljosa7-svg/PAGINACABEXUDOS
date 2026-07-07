// ============================================================
// CALENDARIO ANUAL - Eventos de la Comparsa de Zaragoza
// ============================================================

export type EventCategory =
  | 'pilar'
  | 'san-valero'
  | 'cincomarzada'
  | 'san-jorge'
  | 'rosconeros'
  | 'navidad'
  | 'extraordinaria'
  | 'barrio';

export type EventType = 'desfile' | 'concentracion' | 'misa' | 'actuacion' | 'bautizo' | 'festival';

export interface CalendarEvent {
  id: string;
  title: string;
  shortTitle: string;
  date: string;        // ISO date: '2025-10-12'
  time?: string;       // HH:mm
  endTime?: string;    // HH:mm
  category: EventCategory;
  type: EventType;
  barrio?: string;
  comparsa?: string;
  location: string;
  description: string;
  color: string;       // Hex color for the event badge
  emoji: string;
  featured?: boolean;  // Aparece en la portada
  year: number;
}

// Color palette per category
export const categoryColors: Record<EventCategory, string> = {
  'pilar':          '#8B0000',
  'san-valero':     '#1565C0',
  'cincomarzada':   '#2E7D32',
  'san-jorge':      '#F57F17',
  'rosconeros':     '#6A1B9A',
  'navidad':        '#1565C0',
  'extraordinaria': '#C62828',
  'barrio':         '#00695C',
};

export const categoryLabels: Record<EventCategory, string> = {
  'pilar':          'Fiestas del Pilar',
  'san-valero':     'San Valero',
  'cincomarzada':   'Cincomarzada',
  'san-jorge':      'San Jorge',
  'rosconeros':     'Rosconeros',
  'navidad':        'Navidad',
  'extraordinaria': 'Salida Extraordinaria',
  'barrio':         'Comparsa de Barrio',
};

export const calendarEvents: CalendarEvent[] = [

  // ═══════════════════════
  // SAN VALERO (Enero)
  // ═══════════════════════
  {
    id: 'sv-2025-01',
    title: 'Misa de San Valero en La Seo',
    shortTitle: 'Misa San Valero',
    date: '2025-01-29',
    time: '11:00',
    endTime: '12:30',
    category: 'san-valero',
    type: 'misa',
    location: 'Catedral de La Seo, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Solemne misa en honor a San Valero, patrón de Zaragoza, en la Catedral del Salvador. La Comparsa Municipal acompaña la celebración con presencia en el exterior del templo. Los gigantes y cabezudos municipales realizan un breve recorrido por el entorno de La Seo antes de la misa.',
    color: categoryColors['san-valero'],
    emoji: '⛪',
    featured: true,
    year: 2025,
  },
  {
    id: 'sv-2025-02',
    title: 'Desfile de San Valero por el Casco Histórico',
    shortTitle: 'Desfile San Valero',
    date: '2025-01-29',
    time: '12:30',
    endTime: '14:00',
    category: 'san-valero',
    type: 'desfile',
    location: 'Casco Histórico, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Tras la Misa de San Valero, la Comparsa Municipal de Gigantes y Cabezudos recorre las principales calles del Casco Histórico. El recorrido incluye la Plaza del Pilar, Calle Don Jaime I, Plaza de España y regreso a La Seo. Una de las salidas más frías del año, con los cabezudos a menudo bajo la lluvia o la niebla característica del enero zaragozano.',
    color: categoryColors['san-valero'],
    emoji: '🥶',
    featured: true,
    year: 2025,
  },
  {
    id: 'sv-2025-03',
    title: 'Rosconeros de San Valero',
    shortTitle: 'Rosconeros',
    date: '2025-01-29',
    time: '14:30',
    endTime: '16:00',
    category: 'rosconeros',
    type: 'actuacion',
    location: 'Plaza del Pilar, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Según la ancestral tradición zaragozana de San Valero, el Ayuntamiento reparte roscones de anís entre el pueblo congregado en la Plaza del Pilar. Los Rosconeros son los encargados de realizar el reparto, acompañados por la Comparsa Municipal. Tradición que data del siglo XVII, cuando el Cabildo de La Seo comenzó la distribución de pan y roscas entre los fieles.',
    color: categoryColors['rosconeros'],
    emoji: '🥐',
    featured: true,
    year: 2025,
  },

  // ═══════════════════════
  // CINCOMARZADA (Marzo)
  // ═══════════════════════
  {
    id: 'cm-2025-01',
    title: 'Concentración Cincomarzada',
    shortTitle: 'Cincomarzada',
    date: '2025-03-05',
    time: '10:00',
    endTime: '14:00',
    category: 'cincomarzada',
    type: 'concentracion',
    location: 'El Cabezo, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'La Cincomarzada conmemora el 5 de marzo de 1838, cuando los zaragozanos —principalmente mujeres— rechazaron el intento de las tropas carlistas de entrar en Zaragoza. Cada año, miles de zaragozanos salen de picnic a El Cabezo y otros parajes extramuros para celebrar la jornada. La Comparsa Municipal hace acto de presencia en la fiesta popular.',
    color: categoryColors['cincomarzada'],
    emoji: '🌿',
    featured: true,
    year: 2025,
  },
  {
    id: 'cm-2025-02',
    title: 'Desfile Popular de la Cincomarzada',
    shortTitle: 'Desfile Cincomarzada',
    date: '2025-03-05',
    time: '11:30',
    endTime: '13:00',
    category: 'cincomarzada',
    type: 'desfile',
    location: 'Paseo de Pamplona - El Cabezo',
    comparsa: 'Comparsa Municipal',
    description: 'La Comparsa Municipal recorre el Paseo de Pamplona hasta el Parque del Cabezo acompañando a la ciudadanía en la jornada de la Cincomarzada. El ambiente es festivo y familiar, con grupos de música aragonesa y exhibiciones de jotas a lo largo del camino.',
    color: categoryColors['cincomarzada'],
    emoji: '🌱',
    year: 2025,
  },

  // ═══════════════════════
  // SAN JORGE (Abril)
  // ═══════════════════════
  {
    id: 'sj-2025-01',
    title: 'Día de Aragón - San Jorge',
    shortTitle: 'San Jorge',
    date: '2025-04-23',
    time: '10:30',
    endTime: '13:00',
    category: 'san-jorge',
    type: 'desfile',
    location: 'Paseo de la Independencia - Plaza de España',
    comparsa: 'Comparsa Municipal',
    description: 'San Jorge, patrón de Aragón, es celebrado el 23 de abril con un gran desfile institucional por el centro de Zaragoza. La Comparsa Municipal de Gigantes y Cabezudos desfila en un acto especialmente solemne junto a las autoridades autonómicas y municipales. El gigante de Goya y los de los Sitios son los protagonistas de esta jornada.',
    color: categoryColors['san-jorge'],
    emoji: '🐉',
    featured: true,
    year: 2025,
  },
  {
    id: 'sj-2025-02',
    title: 'Ofrenda Floral a San Jorge en el Castillo de la Aljafería',
    shortTitle: 'Ofrenda San Jorge',
    date: '2025-04-23',
    time: '12:00',
    endTime: '13:30',
    category: 'san-jorge',
    type: 'actuacion',
    location: 'Castillo de la Aljafería, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Ofrenda floral en el Castillo de la Aljafería, sede de las Cortes de Aragón, con presencia de la Comparsa Municipal. Los gigantes históricos de Don Jaime I y Gastón de Bearn tienen un papel protagonista en esta ceremonia que conmemora los orígenes medievales del Reino de Aragón.',
    color: categoryColors['san-jorge'],
    emoji: '🌹',
    year: 2025,
  },

  // ═══════════════════════
  // SALIDAS EXTRAORDINARIAS
  // ═══════════════════════
  {
    id: 'ext-2025-01',
    title: 'Bautizo del nuevo Cabezudo Municipal',
    shortTitle: 'Bautizo Nuevo Cabezudo',
    date: '2025-05-15',
    time: '18:00',
    endTime: '20:00',
    category: 'extraordinaria',
    type: 'bautizo',
    location: 'Plaza del Pilar, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Ceremonia tradicional de bautizo en la que un nuevo personaje es presentado oficialmente a la ciudadanía e incorporado a la comparsa municipal. El acto incluye la revelación del nombre del nuevo personaje, su historia oficial y el bautizo ritual con agua de la Fuente de la Hispanidad.',
    color: categoryColors['extraordinaria'],
    emoji: '🎭',
    featured: true,
    year: 2025,
  },
  {
    id: 'ext-2025-02',
    title: 'Visita Institucional al Hospital Infantil',
    shortTitle: 'Hospital Infantil',
    date: '2025-06-01',
    time: '10:00',
    endTime: '12:00',
    category: 'extraordinaria',
    type: 'actuacion',
    location: 'Hospital Miguel Servet, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Visita solidaria de los Cabezudos Municipales a las plantas pediátricas del Hospital Miguel Servet. Los portadores realizan actuaciones adaptadas al entorno hospitalario, sin correr ni perseguir, convirtiendo a los personajes en amigos que entretienen y animan a los niños ingresados.',
    color: categoryColors['extraordinaria'],
    emoji: '🏥',
    year: 2025,
  },
  {
    id: 'ext-2025-03',
    title: 'Festival Internacional de Gigantes y Cabezudos',
    shortTitle: 'Festival Internacional',
    date: '2025-09-06',
    time: '09:00',
    endTime: '20:00',
    category: 'extraordinaria',
    type: 'festival',
    location: 'Zaragoza (varios puntos)',
    comparsa: 'Comparsa Municipal + Invitadas',
    description: 'Festival que reúne comparsas de gigantes y cabezudos de toda España y varios países europeos. Desfilan figuras de diferentes tradiciones: País Vasco, Navarra, Cataluña, País Vasco, Portugal, Bélgica y Francia. La Comparsa Municipal de Zaragoza actúa como anfitriona. Uno de los eventos más esperados del año previo al Pilar.',
    color: categoryColors['extraordinaria'],
    emoji: '🌍',
    featured: true,
    year: 2025,
  },

  // ═══════════════════════
  // FIESTAS DEL PILAR
  // ═══════════════════════
  {
    id: 'pilar-2025-01',
    title: 'Pregón de las Fiestas del Pilar',
    shortTitle: 'Pregón del Pilar',
    date: '2025-10-05',
    time: '20:00',
    endTime: '21:30',
    category: 'pilar',
    type: 'actuacion',
    location: 'Plaza del Pilar, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'El pregón oficial da el pistoletazo de salida a las Fiestas del Pilar. La Comparsa Municipal hace su primera aparición festiva del Pilar en la Plaza del Pilar, iluminada para la ocasión. Los cabezudos recorren el escenario mientras el pregonero oficial proclama el inicio de las fiestas.',
    color: categoryColors['pilar'],
    emoji: '📣',
    featured: true,
    year: 2025,
  },
  {
    id: 'pilar-2025-02',
    title: 'Gran Desfile Inaugural del Pilar',
    shortTitle: 'Desfile Inaugural',
    date: '2025-10-06',
    time: '18:00',
    endTime: '22:00',
    category: 'pilar',
    type: 'desfile',
    location: 'Paseo de la Independencia - Casco Histórico',
    comparsa: 'Comparsa Municipal',
    description: 'El Gran Desfile Inaugural del Pilar es el desfile más multitudinario de todo el año. La Comparsa Municipal, encabezada por el Morico, recorre el corazón de Zaragoza ante cientos de miles de personas. El recorrido incluye el Paseo de la Independencia, la Plaza de España, el Coso, la Calle Don Jaime y la Plaza del Pilar.',
    color: categoryColors['pilar'],
    emoji: '🎺',
    featured: true,
    year: 2025,
  },
  {
    id: 'pilar-2025-03',
    title: 'Ofrenda de Flores a la Virgen del Pilar',
    shortTitle: 'Ofrenda de Flores',
    date: '2025-10-12',
    time: '09:00',
    endTime: '19:00',
    category: 'pilar',
    type: 'actuacion',
    location: 'Plaza del Pilar - Basílica del Pilar',
    comparsa: 'Comparsa Municipal',
    description: 'La Ofrenda de Flores es el acto más emotivo y colorido de las Fiestas del Pilar. Miles de zaragozanos vestidos con trajes regionales desfilan ante la Virgen depositando flores que forman el manto florido de su imagen. La Comparsa Municipal abre la comitiva inaugural con los gigantes y cierra cada turno con los cabezudos.',
    color: categoryColors['pilar'],
    emoji: '🌸',
    featured: true,
    year: 2025,
  },
  {
    id: 'pilar-2025-04',
    title: 'Desfile Pilar - Barrio de Las Fuentes',
    shortTitle: 'Pilar Las Fuentes',
    date: '2025-10-08',
    time: '17:00',
    endTime: '19:30',
    category: 'pilar',
    type: 'desfile',
    barrio: 'Las Fuentes',
    location: 'Paseo de las Fuentes, Zaragoza',
    comparsa: 'Comparsa de Las Fuentes',
    description: 'La Comparsa del Barrio de Las Fuentes sale a celebrar las Fiestas del Pilar con sus propios gigantes y cabezudos. Un desfile muy participativo donde los vecinos del barrio se incorporan a la comitiva en gran número.',
    color: categoryColors['barrio'],
    emoji: '🏘️',
    year: 2025,
  },
  {
    id: 'pilar-2025-05',
    title: 'Desfile Pilar - Barrio de Delicias',
    shortTitle: 'Pilar Delicias',
    date: '2025-10-09',
    time: '17:30',
    endTime: '20:00',
    category: 'pilar',
    type: 'desfile',
    barrio: 'Delicias',
    location: 'Paseo de Cuéllar - Avda. Madrid',
    comparsa: 'Comparsa de Delicias',
    description: 'El mayor barrio de Zaragoza celebra las Fiestas del Pilar con el desfile de su propia Comparsa. Los gigantes de Delicias, entre los que destaca la figura del Tío Jorge, recorren las principales avenidas del barrio ante miles de vecinos.',
    color: categoryColors['barrio'],
    emoji: '🏙️',
    year: 2025,
  },
  {
    id: 'pilar-2025-06',
    title: 'Desfile Pilar - Barrio del Arrabal',
    shortTitle: 'Pilar Arrabal',
    date: '2025-10-10',
    time: '18:00',
    endTime: '20:00',
    category: 'pilar',
    type: 'desfile',
    barrio: 'Arrabal',
    location: 'Avenida Cataluña - Plaza de los Sitios del Arrabal',
    comparsa: 'Comparsa del Arrabal',
    description: 'El histórico barrio del Arrabal festeja el Pilar con su tradicional comparsa, donde el Royo del Rabal tiene el papel protagonista. El recorrido cruza simbólicamente el Puente de Piedra para unirse a la celebración en el centro.',
    color: categoryColors['barrio'],
    emoji: '🌉',
    year: 2025,
  },
  {
    id: 'pilar-2025-07',
    title: 'Gran Desfile del Día del Pilar',
    shortTitle: 'Desfile Día del Pilar',
    date: '2025-10-12',
    time: '18:00',
    endTime: '22:00',
    category: 'pilar',
    type: 'desfile',
    location: 'Casco Histórico completo',
    comparsa: 'Comparsa Municipal',
    description: 'El desfile más importante del Pilar se celebra el día 12 de octubre, Día Nacional de España. Es el desfile de mayor duración y recorrido del año, con todas las figuras de la comparsa municipal y la participación de comparsas invitadas de toda Aragón. La temperatura emocional de este desfile es única: todo Zaragoza está en la calle.',
    color: categoryColors['pilar'],
    emoji: '🇪🇸',
    featured: true,
    year: 2025,
  },
  {
    id: 'pilar-2025-08',
    title: 'Desfile Cierre del Pilar',
    shortTitle: 'Cierre del Pilar',
    date: '2025-10-13',
    time: '20:00',
    endTime: '22:00',
    category: 'pilar',
    type: 'desfile',
    location: 'Plaza del Pilar - Coso',
    comparsa: 'Comparsa Municipal',
    description: 'El desfile de cierre marca el final de las Fiestas del Pilar con un emotivo recorrido nocturno que culmina en la Plaza del Pilar. En la tradición zaragozana, este desfile es el más emotivo: la comparsa "despide" el Pilar hasta el año siguiente.',
    color: categoryColors['pilar'],
    emoji: '🌙',
    year: 2025,
  },

  // ═══════════════════════
  // COMPARSAS DE BARRIOS
  // ═══════════════════════
  {
    id: 'barrio-sv-delicias',
    title: 'San Valero en Delicias',
    shortTitle: 'San Valero Delicias',
    date: '2025-01-29',
    time: '16:00',
    endTime: '18:00',
    category: 'barrio',
    type: 'desfile',
    barrio: 'Delicias',
    location: 'Calle Delicias - Plaza de los Sitios de Delicias',
    comparsa: 'Comparsa de Delicias',
    description: 'La Comparsa del Barrio de Delicias celebra San Valero con su propio desfile vespertino por las calles principales del barrio. Una celebración más íntima y familiar que el desfile municipal.',
    color: categoryColors['barrio'],
    emoji: '❄️',
    year: 2025,
  },
  {
    id: 'barrio-cm-arrabal',
    title: 'Cincomarzada en el Arrabal',
    shortTitle: 'Cincomarzada Arrabal',
    date: '2025-03-05',
    time: '12:00',
    endTime: '14:00',
    category: 'cincomarzada',
    type: 'desfile',
    barrio: 'Arrabal',
    location: 'Ribera del Ebro - Arrabal',
    comparsa: 'Comparsa del Arrabal',
    description: 'El barrio del Arrabal celebra la Cincomarzada con una particular emotividad, ya que sus vecinos fueron protagonistas directos de la defensa de Zaragoza en 1838. El Royo del Rabal encabeza el desfile junto a figuras tradicionales del barrio.',
    color: categoryColors['cincomarzada'],
    emoji: '💧',
    year: 2025,
  },
  {
    id: 'barrio-sj-actur',
    title: 'San Jorge en Actur-Rey Fernando',
    shortTitle: 'San Jorge Actur',
    date: '2025-04-23',
    time: '16:00',
    endTime: '18:00',
    category: 'san-jorge',
    type: 'desfile',
    barrio: 'Actur-Rey Fernando',
    location: 'Avenida Pablo Gargallo, Actur',
    comparsa: 'Comparsa del Actur',
    description: 'El barrio moderno del Actur celebra San Jorge con su joven comparsa, fundada en 2003. A pesar de su reciente creación, la comparsa del Actur ya tiene sus propias figuras características y una gran participación vecinal.',
    color: categoryColors['san-jorge'],
    emoji: '🏗️',
    year: 2025,
  },

  // ═══════════════════════
  // NAVIDAD
  // ═══════════════════════
  {
    id: 'nav-2025-01',
    title: 'Los Gigantes de Navidad en el Pilar',
    shortTitle: 'Gigantes de Navidad',
    date: '2025-12-24',
    time: '11:00',
    endTime: '13:00',
    category: 'navidad',
    type: 'actuacion',
    location: 'Plaza del Pilar, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'La mañana de Nochebuena, la Comparsa Municipal realiza una breve salida especial de temporada navideña. Los gigantes recorren el entorno de la Plaza del Pilar mientras suenan villancicos aragoneses. Es una salida íntima y muy especial que los zaragozanos esperan cada año.',
    color: '#1565C0',
    emoji: '🎄',
    featured: true,
    year: 2025,
  },
  {
    id: 'nav-2025-02',
    title: 'Cabezudos de Reyes en el Coso',
    shortTitle: 'Cabezudos de Reyes',
    date: '2026-01-05',
    time: '17:00',
    endTime: '19:00',
    category: 'navidad',
    type: 'desfile',
    location: 'Coso - Plaza España - Calle Don Jaime',
    comparsa: 'Comparsa Municipal',
    description: 'La víspera de Reyes, los Cabezudos Municipales acompañan la Cabalgata de Reyes Magos por el centro de Zaragoza. El Morico abre la comitiva precediendo a los caballos reales. Una de las salidas más populares entre el público infantil.',
    color: '#F9A825',
    emoji: '⭐',
    featured: true,
    year: 2025,
  },

  // ═══════════════════════
  // SAN VALERO 2026
  // ═══════════════════════
  {
    id: 'sv-2026-01',
    title: 'Misa de San Valero en La Seo',
    shortTitle: 'Misa San Valero',
    date: '2026-01-29',
    time: '11:00',
    endTime: '12:30',
    category: 'san-valero',
    type: 'misa',
    location: 'Catedral de La Seo, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Solemne misa en honor a San Valero, patrón de Zaragoza. La Comparsa Municipal acompaña la celebración con presencia exterior y desfile posterior.',
    color: categoryColors['san-valero'],
    emoji: '⛪',
    featured: true,
    year: 2026,
  },
  {
    id: 'sv-2026-02',
    title: 'Desfile de San Valero - Casco Histórico',
    shortTitle: 'Desfile San Valero',
    date: '2026-01-29',
    time: '12:30',
    endTime: '14:00',
    category: 'san-valero',
    type: 'desfile',
    location: 'Casco Histórico, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Desfile tradicional de San Valero por el Casco Histórico. Recorrido por Plaza del Pilar, Calle Don Jaime I, Plaza de España y regreso.',
    color: categoryColors['san-valero'],
    emoji: '🥶',
    year: 2026,
  },
  {
    id: 'sv-2026-03',
    title: 'Rosconeros de San Valero 2026',
    shortTitle: 'Rosconeros 2026',
    date: '2026-01-29',
    time: '14:30',
    category: 'rosconeros',
    type: 'actuacion',
    location: 'Plaza del Pilar, Zaragoza',
    comparsa: 'Comparsa Municipal',
    description: 'Tradicional reparto de roscones de anís en la Plaza del Pilar en honor a San Valero. Tradición que data del siglo XVII.',
    color: categoryColors['rosconeros'],
    emoji: '🥐',
    year: 2026,
  },
  {
    id: 'barrio-2025-almozara',
    title: 'Desfile de La Almozara',
    shortTitle: 'Almozara',
    date: '2025-07-18',
    time: '20:00',
    endTime: '21:30',
    category: 'barrio',
    type: 'desfile',
    barrio: 'La Almozara',
    comparsa: 'Comparsa de La Almozara',
    location: 'Avenida de La Almozara, Zaragoza',
    description: 'Salida vecinal con música, comparsa y parada en el parque principal del barrio.',
    color: categoryColors['barrio'],
    emoji: '🌳',
    year: 2025,
  },
  {
    id: 'barrio-2025-san-juan',
    title: 'Ronda de San Juan',
    shortTitle: 'San Juan',
    date: '2025-08-01',
    time: '19:00',
    endTime: '20:30',
    category: 'barrio',
    type: 'actuacion',
    barrio: 'San Juan',
    comparsa: 'Comparsa de San Juan',
    location: 'Plaza del Mercado, San Juan',
    description: 'Comparsa de barrio con actuación musical y recorrido por las calles más céntricas del distrito.',
    color: categoryColors['barrio'],
    emoji: '🎺',
    year: 2025,
  },
  {
    id: 'barrio-2025-casablanca',
    title: 'Comparsa de Casablanca',
    shortTitle: 'Casablanca',
    date: '2025-06-22',
    time: '18:30',
    endTime: '20:00',
    category: 'barrio',
    type: 'desfile',
    barrio: 'Casablanca',
    comparsa: 'Comparsa de Casablanca',
    location: 'Calle de Casablanca, Zaragoza',
    description: 'Salida popular con música de barrio y parada en la plaza central.',
    color: categoryColors['barrio'],
    emoji: '🎭',
    year: 2025,
  },
  {
    id: 'barrio-2025-miralbueno',
    title: 'Desfile de Miralbueno',
    shortTitle: 'Miralbueno',
    date: '2025-09-12',
    time: '16:30',
    endTime: '18:00',
    category: 'barrio',
    type: 'desfile',
    barrio: 'Miralbueno',
    comparsa: 'Comparsa de Miralbueno',
    location: 'Plaza de la Ermita, Miralbueno',
    description: 'Fiesta de barrio con el gigante del distrito como protagonista del recorrido.',
    color: categoryColors['barrio'],
    emoji: '🏰',
    year: 2025,
  },
  {
    id: 'barrio-2026-valdespartera',
    title: 'Ronda de Valdespartera',
    shortTitle: 'Valdespartera',
    date: '2026-08-26',
    time: '19:30',
    endTime: '21:00',
    category: 'barrio',
    type: 'actuacion',
    barrio: 'Valdespartera',
    comparsa: 'Comparsa de Valdespartera',
    location: 'Parque de la Villa, Valdespartera',
    description: 'Salida de verano con ambiente familiar y una animada rueda de comparsas vecinales.',
    color: categoryColors['barrio'],
    emoji: '🌈',
    year: 2026,
  },
  {
    id: 'barrio-2026-villarrapa',
    title: 'Fiesta de Villarrapa',
    shortTitle: 'Villarrapa',
    date: '2026-10-17',
    time: '12:30',
    endTime: '14:00',
    category: 'barrio',
    type: 'desfile',
    barrio: 'Villarrapa',
    comparsa: 'Comparsa de Villarrapa',
    location: 'Plaza de la Era, Villarrapa',
    description: 'Recorrido tradicional por el barrio con música, jota y participación vecinal.',
    color: categoryColors['barrio'],
    emoji: '🧡',
    year: 2026,
  },
  {
    id: 'barrio-2026-magdalena',
    title: 'Ruta de La Magdalena',
    shortTitle: 'Magdalena',
    date: '2026-09-20',
    time: '18:00',
    endTime: '19:30',
    category: 'barrio',
    type: 'desfile',
    barrio: 'La Magdalena',
    comparsa: 'Comparsa de La Magdalena',
    location: 'Calle de la Magdalena, Zaragoza',
    description: 'Recorrido de fiesta por los carriles históricos del barrio, con paradas en plazas y huertos.',
    color: categoryColors['barrio'],
    emoji: '🏘️',
    year: 2026,
  },
  {
    id: 'barrio-2026-universidad',
    title: 'Noche de la Universidad',
    shortTitle: 'Universidad',
    date: '2026-05-15',
    time: '21:00',
    endTime: '22:30',
    category: 'barrio',
    type: 'actuacion',
    barrio: 'Universidad',
    comparsa: 'Comparsa Universitaria',
    location: 'Avenida de la Universidad, Zaragoza',
    description: 'Actuación nocturna que mezcla tradición, música y ambiente de barrio en la zona universitaria.',
    color: categoryColors['barrio'],
    emoji: '🎓',
    year: 2026,
  },
];

// Helper: get events for a specific year
export const getEventsByYear = (year: number): CalendarEvent[] =>
  calendarEvents.filter(e => e.year === year);

// Helper: get events for a specific month (1-12)
export const getEventsByMonth = (year: number, month: number): CalendarEvent[] =>
  calendarEvents.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

// Helper: get unique barrios
export const getUniqueBarrios = (): string[] => {
  const barrios = calendarEvents
    .map(e => e.barrio)
    .filter((b): b is string => !!b);
  return [...new Set(barrios)].sort();
};

// Helper: get unique comparsas
export const getUniqueComparsas = (): string[] => {
  const comp = calendarEvents
    .map(e => e.comparsa)
    .filter((c): c is string => !!c);
  return [...new Set(comp)].sort();
};

// Helper: available years
export const availableYears = [2025, 2026];
