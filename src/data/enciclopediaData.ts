// ============================================================
// ENCICLOPEDIA DATA - Fichas completas de Gigantes y Cabezudos
// Comparsa Municipal de Zaragoza
// ============================================================

export interface CharacterColor {
  name: string;
  hex: string;
}

export interface EnciclopediaEntry {
  id: string;
  name: string;
  type: 'gigante' | 'cabezudo';
  emoji: string;
  year: number;
  creator: string;
  origin: string;
  history: string;
  personality: string;
  curiosities: string[];
  copla?: string;
  colors: CharacterColor[];
  height?: number;   // metros (gigantes)
  weight?: number;   // kg
  relatedRouteId?: string;
  imageBg: string;   // CSS gradient for placeholder image
}

export const enciclopediaData: EnciclopediaEntry[] = [

  // ═══════════════════════════════════════════
  // CABEZUDOS MUNICIPALES (11)
  // ═══════════════════════════════════════════

  {
    id: 'morico',
    name: 'El Morico',
    type: 'cabezudo',
    emoji: '🏇',
    year: 1841,
    creator: 'Taller de Félix Oroz',
    origin: 'Zaragoza (Casco Histórico)',
    history: `El Morico es, sin duda, el cabezudo más querido y popular de Zaragoza. Su figura fue incorporada a la comparsa municipal a mediados del siglo XIX, en torno al año 1841, durante el proceso de reorganización y modernización de las fiestas del Pilar impulsado por el Ayuntamiento de la ciudad.

Según la tradición oral zaragozana, El Morico debe su nombre y su apariencia a un sirviente de origen cubano o antillano que llegó a Zaragoza en tiempos de la colonia al servicio de un noble de la ciudad. El joven destacaba por su extraordinaria rapidez, su agilidad sin par y su carácter pícaro y alegre, siempre dispuesto a hacer reír a cuantos le rodeaban.

Con el paso de los años, su careta de cabezudo se fue popularizando de manera que El Morico se convirtió en el encargado de abrir la procesión de la comparsa, corriendo por delante del resto para avisar de su llegada. Su velocidad es proverbial: se dice que ningún niño ha logrado jamás cogerle la manga, aunque muchos lo han intentado.

Durante los Sitios de Zaragoza de 1808-1809, la tradición oral cuenta que la figura del Morico se utilizó simbólicamente para mantener el ánimo de los zaragozanos, recordando que incluso en los tiempos más oscuros había espacio para la alegría y la risa popular.

Hoy en día, El Morico es reconocido internacionalmente como símbolo de las Fiestas del Pilar, apareciendo en carteles, souvenirs y como mascota oficial de la comparsa.`,
    personality: `Ágil, pícaro y travieso. El Morico personifica la alegría desbordante y el espíritu festivo. Es el más rápido de todos los cabezudos y el más querido por los niños, quienes le persiguen por las calles sin jamás poder alcanzarle. Tiene un corazón enorme y aunque asusta a los más pequeños, nunca golpea con la vejiga de forma brusca.`,
    curiosities: [
      'Es el único cabezudo que lleva gorra de jockey tricolor en lugar del tradicional sombrero.',
      'Tiene el honor de encabezar siempre la comparsa, siendo el primero en salir y el último en entrar.',
      'En algunas versiones de la leyenda, El Morico era tan rápido que los soldados franceses tampoco pudieron capturarle durante los Sitios.',
      'Su figura fue restaurada por primera vez en 1920 y ha pasado por al menos siete restauraciones completas.',
      'En los años 1970 se creó un cuento infantil muy popular protagonizado por El Morico que aún se reedita.'
    ],
    copla: `Aquí, aquí, Morico el del Pilar,\nque no come rancho por no pagar.\nLe da al porrón, le da al barril,\ny a los chavales los hace correr así.\n\n¡Corre, corre, Morico!\n¡Que te coge el chavalico!\n¡Corre, corre sin parar!\n¡Que te alcanzan por detrás!`,
    colors: [
      { name: 'Azul Marino', hex: '#1565C0' },
      { name: 'Rojo Vivo', hex: '#D32F2F' },
      { name: 'Amarillo', hex: '#FFD700' },
      { name: 'Piel Morena', hex: '#A0522D' }
    ],
    relatedRouteId: 'route-morico-pilar',
    imageBg: 'linear-gradient(135deg, #1565C0, #D32F2F, #FFD700)'
  },

  {
    id: 'tuerto',
    name: 'El Tuerto',
    type: 'cabezudo',
    emoji: '👁️',
    year: 1841,
    creator: 'Taller de Félix Oroz',
    origin: 'Zaragoza (Casco Histórico)',
    history: `El Tuerto es uno de los cabezudos más antiguos y misteriosos de la comparsa. Incorporado en los orígenes de la misma, este personaje de mirada bizca y gesto torcido ha generado diversas interpretaciones históricas sobre su origen e identidad real.

La hipótesis más extendida entre los historiadores del folklore zaragozano indica que El Tuerto podría estar inspirado en un personaje real: un tabernero del Tubo de Zaragoza que vivía en el siglo XVIII, conocido por su carácter violento y su ojo de cristal tras perder la visión en una reyerta. Este tabernero era temido en el barrio pero, paradójicamente, adorado por los niños que le visitaban a cambio de dulces.

Otra teoría apunta a que podría ser una caricatura de un alguacil municipal de carácter colérico que actuaba con gran rigor en las fiestas para mantener el orden, siendo ridiculizado por el pueblo en forma de cabezudo. Su parche en el ojo izquierdo y su expresión de perpetuo enfado avalan esta hipótesis.

Lo cierto es que El Tuerto es especialmente temido por los niños más pequeños, cuya expresión facial bizca y sus carreras bruscas generan tanto susto como carcajadas entre el público. Es el cabezudo con más personalidad dramática de toda la comparsa.`,
    personality: `Hosco, malhumorado y dramático. El Tuerto finge estar siempre enfadado y mira con recelo a cuantos se acercan. Sin embargo, esconde un corazón noble. Disfruta persiguiendo a los niños pero nunca les hace daño real. Su expresión torcida y su cojera exagerada al correr son su firma más reconocible.`,
    curiosities: [
      'Es el único cabezudo que lleva parche en el ojo, detalle que lo hace inmediatamente reconocible.',
      'Los zaragozanos dicen que cuando el Tuerto mira directamente a alguien significa buena suerte.',
      'Su sombrero bicornio está inspirado en los militares napoleónicos que sitiaron Zaragoza en 1808.',
      'En 1978 fue el primer cabezudo en ser declarado Bien de Interés Cultural junto al resto de la comparsa.',
      'Existe una expresión popular zaragozana: "Tienes más mala leche que el Tuerto" para referirse a alguien irascible.'
    ],
    copla: `El Tuerto por aquí, el Tuerto por allá,\nsi no corres mucho, te la pegará.\nTuerto de un ojo, cara de cerrojo,\nte come los mocos y el tiempo te mojo.\n\n¡Cuidado con el Tuerto!\n¡Que viene que viene!\n¡Y al que no corre,\nuna guantada le tiene!`,
    colors: [
      { name: 'Negro Napoleónico', hex: '#212121' },
      { name: 'Gris Plomizo', hex: '#607D8B' },
      { name: 'Rojo Sangre', hex: '#B71C1C' },
      { name: 'Ocre Viejo', hex: '#8D6E63' }
    ],
    imageBg: 'linear-gradient(135deg, #212121, #607D8B, #B71C1C)'
  },

  {
    id: 'forano',
    name: 'El Forano',
    type: 'cabezudo',
    emoji: '🌾',
    year: 1841,
    creator: 'Taller de Félix Oroz',
    origin: 'Aragón Rural (pueblos del entorno)',
    history: `El Forano representa al campesino aragonés que viene de fuera de la ciudad —de un pueblo, de "las foranías"— para participar en las grandes fiestas del Pilar. Su figura es un retrato cómico pero entrañable del labrador aragonés del siglo XIX que se pone sus mejores galas de domingo para visitar la capital.

La figura del Forano tiene raíces profundas en la cultura aragonesa. Históricamente, la llegada de los foraneos —gente de los pueblos— a Zaragoza durante las fiestas del Pilar era un acontecimiento social de primer orden. La ciudad se llenaba de carros, bestias de carga y familias enteras que venían a venerar a la Virgen del Pilar y a disfrutar de los festejos.

El Forano de la comparsa captura ese momento con un humor tierno: el campesino que llega con su mejor ropa pero que no sabe muy bien cómo comportarse en la ciudad. Tropieza, mira asombrado los edificios, confunde las calles... pero lo hace con tal simpatía que todos le quieren.

Su pareja, La Forana, le acompaña en este periplo urbano, y juntos forman una de las duplas más populares y queridas de la comparsa zaragozana.`,
    personality: `Bonachón, ingenuo y algo torpe en la ciudad. El Forano es el eterno turista de pueblo que se pierde por las calles zaragozanas pero que lo hace con tanta gracia que nadie puede enfadarse con él. Es generoso, trabajador y leal. Su fuerza bruta contrasta con su ingenuidad característica.`,
    curiosities: [
      'Su sombrero de copa de paja es único entre todos los cabezudos, que normalmente usan sombreros formales o militares.',
      'Las patillas extremadamente pobladas de El Forano eran signo de rusticidad en el siglo XIX.',
      'Junto con La Forana, representan la dualidad campo-ciudad en el folklore zaragozano.',
      'En algunas localidades aragonesas se han creado cabezudos inspirados en El Forano para sus propias fiestas.',
      'El Forano siempre corre de forma torpe y exagerada, como si no estuviera acostumbrado a correr por adoquines.'
    ],
    copla: `El Forano, forano,\nsaca la porra de debajo de la mano.\nSi te coge el Forano,\nte da con la porra y te deja plano.\n\nVine del pueblo a las fiestas\ny me perdí en el Pilar.\n¡Que venga mi Forana\na llevarme de la mano!`,
    colors: [
      { name: 'Marrón Tierra', hex: '#795548' },
      { name: 'Verde Musgo', hex: '#558B2F' },
      { name: 'Beige Paja', hex: '#D4B896' },
      { name: 'Rojo Tomate', hex: '#C62828' }
    ],
    imageBg: 'linear-gradient(135deg, #795548, #558B2F, #D4B896)'
  },

  {
    id: 'forana',
    name: 'La Forana',
    type: 'cabezudo',
    emoji: '🧺',
    year: 1916,
    creator: 'Taller Municipal de Cabezudos',
    origin: 'Aragón Rural (pueblos del entorno)',
    history: `La Forana es la compañera inseparable de El Forano, aunque llegó a la comparsa décadas después que él, siendo incorporada en 1916 para completar la pareja campesina. Su incorporación tardía responde a una mayor apertura hacia la representación femenina en las comparsas de principios del siglo XX.

Si El Forano representa al campesino torpe y bonachón, La Forana encarna a la mujer rural que viene a la ciudad decidida a sacar el máximo partido de las fiestas. Es más lista que su compañero, más avispada y, sobre todo, más habladora: se detiene a comentar con quien sea, admira los escaparates, compara precios en los mercados y opina sin que nadie se lo pida.

La figura de La Forana tiene un valor etnográfico extraordinario, pues describe con precisión la imagen de la mujer aragonesa de pueblo de principios del siglo XX: su mantón de Manila, su peineta, sus pendientes de aro dorado y su cesta de compra son elementos que documentan una forma de vida hoy desaparecida.

A diferencia de su compañero, La Forana corre con una gracia exagerada y cómica, levantando las faldas y fingiendo escandalizarse por las cosas de la ciudad que le parecen demasiado modernas.`,
    personality: `Parlanchina, lista y algo cotilla. La Forana es la que lleva los pantalones en la pareja, aunque lo disimuladle bien. Es curiosa, opinativa y tiene una respuesta para todo. Le encanta presumir de saber más que su compañero El Forano, aunque ella también acaba perdiéndose por las calles de la ciudad.`,
    curiosities: [
      'La Forana fue el segundo cabezudo femenino incorporado a la comparsa municipal, después de ninguna otra mujer previa.',
      'Su mantón de Manila es el más elaborado de todos los tocados de la comparsa.',
      'El contraste entre su actitud decidida y la torpeza de El Forano es uno de los momentos más divertidos del desfile.',
      'En los años 1970, el movimiento feminista zaragozano reivindicó a La Forana como símbolo de la mujer que se adelanta a su tiempo.',
      'Se dice que La Forana siempre anda dos pasos por delante de El Forano, lo cual tiene también lectura metafórica.'
    ],
    copla: `La Forana, la Forana,\nva de limpio por la mañana.\nSe peina y se limpia\npara ir a ver a su primo el del Pilar.\n\nLlegamos del pueblo, yo y el Forano,\ny me tuve que espabilar.\nÉl se perdió en el Coso,\nyo me lo sé de memoria ya.`,
    colors: [
      { name: 'Rojo Mantón', hex: '#C62828' },
      { name: 'Dorado Peineta', hex: '#F9A825' },
      { name: 'Negro Encaje', hex: '#212121' },
      { name: 'Verde Oliva', hex: '#827717' }
    ],
    imageBg: 'linear-gradient(135deg, #C62828, #F9A825, #212121)'
  },

  {
    id: 'verrugon',
    name: 'El Verrugón',
    type: 'cabezudo',
    emoji: '👴',
    year: 1841,
    creator: 'Taller de Félix Oroz',
    origin: 'Zaragoza (Administración Municipal)',
    history: `El Verrugón es uno de los cabezudos más respetados e intimidantes de la comparsa. Su inconfundible verruga morada en la mejilla izquierda y su sombrero de tres picos lo identifican inmediatamente como una caricatura del poder municipal corrupto del siglo XIX.

Los historiadores coinciden en que El Verrugón está inspirado en la figura del corregidor o regidor municipal de la Zaragoza dieciochesca y decimonónica: un funcionario de alto rango que administraba la justicia y el orden público en la ciudad con vara de mando y poca misericordia. La verruga, el sombrero tricornio y la peluca empolvada son los atributos visuales del cargo.

La inclusión de este personaje en la comparsa popular tiene una clara lectura política: el pueblo zaragozano, a través de su fiesta más arraigada, burlaba y caricaturizaba a quienes ostentaban el poder, convirtiéndolos en figuras ridículas que corrían por las calles persiguiendo niños. Era la venganza simbólica del pueblo sobre la autoridad.

El Verrugón siempre ha sido el cabezudo que corre con más dignidad fingida: intenta mantener el sombrero, cuadra los hombros y procura no perder los estribos, aunque invariablemente acaba corriendo en desbandada como los demás.`,
    personality: `Envarado, pomposo y fanfarrón. El Verrugón se cree el más importante de la comparsa y actúa con la suficiencia propia de quien ha ocupado siempre un cargo de relevancia. Sin embargo, bajo esa máscara de autoridad se esconde un cobarde que huye despavorido cuando los niños le plantan cara.`,
    curiosities: [
      'Es el único cabezudo que lleva peluca blanca empolvada, símbolo inequívoco del poder aristocrático.',
      'La verruga en la mejilla fue añadida intencionalmente como símbolo de fealdad moral del personaje.',
      'El sombrero de tres picos es una réplica exacta del que usaban los corregidores reales del siglo XVIII.',
      'Su andar envarado y rígido es una de las interpretaciones más elaboradas de todos los portadores.',
      'Existe la tradición de que el primer niño en tocarle el sombrero durante el desfile tendrá buena suerte todo el año.'
    ],
    copla: `Verrugón, verrugón,\nsaca la porra del cajón.\nQue si no la sacas tú,\nla sacará el chavalón.\n\nCon su peluca empolvada\ny su sombrero de honor,\ncorre por el Pilar\nmás asustado que yo.`,
    colors: [
      { name: 'Negro Formalidad', hex: '#1A1A1A' },
      { name: 'Blanco Peluca', hex: '#F5F5F5' },
      { name: 'Morado Verruga', hex: '#6A1B9A' },
      { name: 'Dorado Galón', hex: '#F57F17' }
    ],
    imageBg: 'linear-gradient(135deg, #1A1A1A, #6A1B9A, #F57F17)'
  },

  {
    id: 'torero',
    name: 'El Torero',
    type: 'cabezudo',
    emoji: '🐂',
    year: 1841,
    creator: 'Taller de Félix Oroz',
    origin: 'Zaragoza (Tradición Taurina)',
    history: `El Torero es la parodia zaragozana del mundo taurino, tan arraigado en Aragón desde tiempos inmemoriales. La plaza de toros de La Misericordia, actualmente conocida como La Venecia, fue durante siglos el escenario de las corridas que acompañaban a las fiestas del Pilar, y El Torero nació como contrapunto cómico de esa tradición.

A diferencia del matador serio y valeroso que se enfrenta al toro en la arena, El Torero cabezudo es todo lo contrario: vanidoso, cobarde y presumido. Se pavonea con su traje de luces verde botella cuando no hay nadie a quien enfrentarse, pero sale corriendo despavorido en cuanto aparece el primer niño valiente que le planta cara.

Esta contradicción entre la apariencia de héroe taurino y el comportamiento cobarde es el corazón cómico del personaje. Los zaragozanos disfrutan enormemente de ver al "valiente torero" huyendo a la carrera mientras su montera negra vuela por el suelo.

El Torero guarda también una relación histórica con el festejo taurino de las fiestas: durante siglos, tras las corridas de toros oficiales en el Pilar, se celebraban los festejos populares donde los cabezudos corrían por las calles.`,
    personality: `Vanidoso, cobarde y fanfarrón. El Torero presume de valentía cuando no hay peligro, pero desaparece a la primera de cambio. Le encanta exhibir su traje de luces y su montera, y actúa como si el mundo entero estuviera pendiente de él. Su huida cómica cuando los niños le persiguen es el momento estelar de su actuación.`,
    curiosities: [
      'Es el cabezudo que más cambia de expresión según la interpretación del portador: a veces arrogante, a veces aterrorizado.',
      'Su traje de luces verde botella con lentejuelas plateadas es el más elaborado de todos los cabezudos.',
      'La montera negra es un elemento auténtico cedido originalmente por una familia de toreros zaragozanos.',
      'En 1966 se creó un especial de cabezudo-torero para las corridas del Pilar que se exhibía antes de cada festejo.',
      'Los niños zaragozanos dicen que El Torero huye tan rápido que ni los toros le alcanzan.'
    ],
    copla: `Torero, torero,\nponte el sombrero,\nque viene el toro\npor el callejero.\n\nSi eres valiente,\nponte delante;\ny si no, vete al instante\nque te pillan por detrás.`,
    colors: [
      { name: 'Verde Botella', hex: '#1B5E20' },
      { name: 'Plata Lentejuelas', hex: '#9E9E9E' },
      { name: 'Negro Montera', hex: '#000000' },
      { name: 'Rosa Medias', hex: '#F48FB1' }
    ],
    imageBg: 'linear-gradient(135deg, #1B5E20, #9E9E9E, #F48FB1)'
  },

  {
    id: 'robaculeros',
    name: 'El Robaculeros',
    type: 'cabezudo',
    emoji: '🎒',
    year: 1841,
    creator: 'Taller de Félix Oroz',
    origin: 'Zaragoza (Barrios Populares)',
    history: `El Robaculeros es uno de los cabezudos más populares y con mayor carga de humor picaresco. Su propio nombre —que en aragonés antiguo viene de "robar" y "culeros" (los fondos de los pantalones o bolsillos traseros)— lo define perfectamente: es el pícaro del barrio, el carterista de buen corazón, el ratero que roba pero solo por necesidad y siempre con una sonrisa.

Históricamente, El Robaculeros representa a los pícaros y golfos que poblaban los barrios más humildes de la Zaragoza del XIX: personajes que vivían al margen de la legalidad pero que formaban parte integral del tejido social popular. No eran criminales peligrosos, sino supervivientes ingeniosos que se buscaban la vida como podían.

Su cabeza enorme con la frente abultada y el mentón prominente encarna visualmente la imagen del pícaro literario español, heredero de figuras como el Lazarillo de Tormes. El cachirulo anudado a la cabeza —el pañuelo aragonés— le otorga una identidad local inconfundible.

Los portadores de El Robaculeros son famosos por las bromas y jugarretas que hacen al público durante los desfiles: "roban" gorras, pañuelos y bolsos de forma fingida, siempre con el permiso implícito del juego festivo.`,
    personality: `Pícaro, ingenioso y con un punto de malicia simpática. El Robaculeros es el más travieso de todos los cabezudos. Su cerebro funciona siempre a velocidad de crucero buscando el siguiente golpe o la siguiente broma. A pesar de su apariencia de granuja, tiene un código de honor propio y nunca hace daño de verdad.`,
    curiosities: [
      'Es el único cabezudo que lleva cachirulo —el pañuelo tradicional aragonés— anudado a la cabeza.',
      'Su nombre es considerado de las más antiguas expresiones populares zaragozanas conservadas en la comparsa.',
      'Los portadores de El Robaculeros son seleccionados especialmente por su sentido del humor y capacidad de improvisación.',
      'En el Tubo de Zaragoza existe una cervecería que lleva su nombre desde los años 1950.',
      'Se dice que El Robaculeros "roba" la vejiga a los otros cabezudos durante el desfile si tiene oportunidad.'
    ],
    copla: `Robaculeros, ponte al corriente,\nque los chiquillos te clavan el diente.\nCorre que corre,\nno cogerás a ninguno\nde los que van detrás.\n\n¡Que me han pillado!\n¡Que me han pillado!\n¡El bolsillo vacío\ny el cachirulo mojado!`,
    colors: [
      { name: 'Verde Maleza', hex: '#4CAF50' },
      { name: 'Marrón Ropa Usada', hex: '#6D4C41' },
      { name: 'Rojo Cachirulo', hex: '#D32F2F' },
      { name: 'Gris Manchado', hex: '#78909C' }
    ],
    imageBg: 'linear-gradient(135deg, #4CAF50, #6D4C41, #D32F2F)'
  },

  {
    id: 'pilara',
    name: 'La Pilara',
    type: 'cabezudo',
    emoji: '🎤',
    year: 1982,
    creator: 'Modesto Lobón Guerrero',
    origin: 'Zaragoza (El Tubo - Ambiente Nocturno)',
    history: `La Pilara es el cabezudo más reciente de los clásicos municipales y también el más rompedor. Incorporada en 1982, rompió todos los moldes al ser el primer cabezudo inspirado directamente en una persona real y contemporánea: Pilar Lahuerta, conocida artísticamente como "La Pilarica", vedette y cantante del mítico local de espectáculos "El Plata" ubicado en el Tubo de Zaragoza.

Pilar Lahuerta fue una figura legendaria del Zaragoza nocturno de las décadas de 1950 a 1980. Su presencia en "El Plata" —un local que combinaba varietés, copla, espectáculos de cabaret y flamenco— era sinónimo de una noche de lujo en la ciudad. Diva de voz poderosa y personalidad arrolladora, Pilar representaba el Zaragoza canalla y desenfadado de postguerra.

El escultor Modesto Lobón fue el encargado de crear su cabeza, capturando perfectamente la esencia del personaje: el peinado rubio platino, el maquillaje exuberante, los pendientes de perlas enormes y la expresión de quien sabe que está en el escenario y que todos los ojos están puestos en ella.

La Pilara generó enorme controversia cuando fue presentada en 1982: algunos sectores la consideraban demasiado moderna y alejada de la tradición. Sin embargo, el pueblo la adoptó inmediatamente y hoy es uno de los favoritos del público adulto.`,
    personality: `Diva, segura de sí misma y enormemente divertida. La Pilara sabe que es la estrella y lo demuestra en cada paso que da. Canta, baila y actúa incluso mientras corre persiguiendo a los niños. Tiene un punto de autoironí que la hace adorable: es consciente de que es un cabezudo, pero actúa como si estuviera en el escenario del "El Plata".`,
    curiosities: [
      'Es el único cabezudo que tiene nombre propio de mujer real identificada históricamente.',
      'Su inauguración en 1982 fue acompañada de una actuación en directo de la propia Pilar Lahuerta.',
      'El vestido rojo de lentejuelas está inspirado en el que usaba la artista real en sus actuaciones de gala.',
      'Los portadores de La Pilara son conocidos por su habilidad para imitar gestos teatrales y de cantante.',
      'Existe una versión alternativa de La Pilara con vestido azul marino para las salidas de invierno.'
    ],
    copla: `Pilara, Pilara,\ncara de cuchara,\nque canta en el Plata\ncon voz de hojalata.\n\nSi corres un poco,\nte muerde el cogote.\nPero si te pillas,\nte doy un besote.`,
    colors: [
      { name: 'Rojo Lentejuelas', hex: '#C62828' },
      { name: 'Rubio Platino', hex: '#FFE082' },
      { name: 'Negro Espectáculo', hex: '#212121' },
      { name: 'Coral Maquillaje', hex: '#FF7043' }
    ],
    imageBg: 'linear-gradient(135deg, #C62828, #FFE082, #FF7043)'
  },

  {
    id: 'boticario',
    name: 'El Boticario',
    type: 'cabezudo',
    emoji: '🧪',
    year: 1841,
    creator: 'Taller de Félix Oroz',
    origin: 'Zaragoza (Cerca de la Plaza del Pilar)',
    history: `El Boticario es el intelectual de la comparsa: el hombre instruido, el profesional liberal, el que sabe leer y escribir en una época en que eso era un privilegio. Su botica —la farmacia de la época— estaba situada, según la tradición, muy cerca de la Plaza del Pilar, y el propietario era famoso en el barrio por su malhumor crónico y sus constantes quejas sobre el ruido de las fiestas.

La historia más repetida cuenta que este boticario real del siglo XIX odiaba las fiestas del Pilar con toda su alma: el ruido le impedía dormir, los clientes borrachos le rompían los frascos, las procesiones le bloqueaban el acceso a la tienda... Año tras año protestaba ante el Ayuntamiento, y año tras año el Ayuntamiento le ignoraba. Hasta que un día el pueblo decidió inmortalizar su mal carácter en forma de cabezudo.

Esta ironía —que el hombre que más odiaba la fiesta terminara convirtiéndose en uno de sus símbolos más populares— captura perfectamente el espíritu de la comparsa zaragozana: un arma del pueblo para convertir en fiesta incluso a quien se niega a serlo.

El Boticario es siempre representado como un hombre serio, con sus gafas metálicas, su capa negra de farmacéutico y su sombrero de copa, fingiendo dignidad mientras corre torpemente por las calles.`,
    personality: `Refunfuñón, pretencioso y con complejo de superioridad. El Boticario cree que está por encima de la comparsa y que su participación en el desfile es una concesión que él hace al pueblo llano. Sin embargo, en el fondo disfruta enormemente. Su malhumor fingido es su mayor encanto.`,
    curiosities: [
      'Es el único cabezudo que lleva gafas redondas metálicas, símbolo de su condición de hombre ilustrado.',
      'Su capa negra de farmacéutico era el atuendo profesional estándar de los boticarios del siglo XIX.',
      'El sombrero de copa alto que lleva es el más elegante de todos los cabezudos.',
      'Existe la tradición de que los niños que consiguen arrancarle las gafas quedan exentos de estudiar ese día.',
      'En el Colegio de Farmacéuticos de Aragón hay una réplica de la cabeza del Boticario como mascota oficial.'
    ],
    copla: `Boticario, boticario,\ncon la capa del boticario,\ncuando corre el boticario\nse le cae el calendario.\n\nCon sus gafas y su frasco,\npor el Pilar se paseó.\n¡Que le corra, que le corra,\nque al Boticario le pilló!`,
    colors: [
      { name: 'Negro Capa', hex: '#1A1A1A' },
      { name: 'Blanco Camisa', hex: '#FFFFFF' },
      { name: 'Gris Gafas', hex: '#9E9E9E' },
      { name: 'Marrón Maleta', hex: '#5D4037' }
    ],
    imageBg: 'linear-gradient(135deg, #1A1A1A, #424242, #9E9E9E)'
  },

  {
    id: 'royo-rabal',
    name: 'El Royo del Rabal',
    type: 'cabezudo',
    emoji: '🌊',
    year: 1965,
    creator: 'Talleres Municipales de Zaragoza',
    origin: 'Zaragoza (Barrio del Arrabal)',
    history: `El Royo del Rabal es el más zaragozano de espíritu de todos los cabezudos: su nombre mismo es un homenaje a la palabra "royo" —que en aragonés significa "rubio" o "pelirrojo"— y al barrio del Arrabal, el histórico barrio de la margen izquierda del Ebro, uno de los más populares y con mayor identidad propia de la ciudad.

Incorporado en 1965, El Royo del Rabal nació para representar al barrio del Arrabal y su gente en la comparsa municipal. El Arrabal tiene una personalidad propia fortísima: fue el barrio de los primeros defensores de Zaragoza en los Sitios, de los pescadores del Ebro, de los agricultores de las huertas, de los obreros de las primeras fábricas.

El Royo encarna esa identidad robusta y orgullosa: es el chico del barrio, el que conoce cada rincón del Arrabal, el que sabe cruzar el Ebro a nado y que nunca olvida de dónde viene. Su pelo rojo —su seña de identidad principal— le da un aspecto entre feroz y simpático, entre asustador y adorable.

La elección del color rojo de cabello no es casual: en la cultura aragonesa, el "royo" o "roya" ha sido siempre un personaje con carácter especial, un poco rebelde, un poco diferente, y siempre con un punto de valentía que los demás no tienen.`,
    personality: `Orgulloso, leal al barrio y con un punto de rebeldía sana. El Royo del Rabal es el que siempre sabe de qué barrio viene y lo dice con orgullo. Tiene el carácter recto y trabajador del arrabalero tradicional, pero también su gusto por la juerga y la fiesta. No es cobarde: se enfrenta a los niños con más confianza que los demás cabezudos.`,
    curiosities: [
      'Es el único cabezudo con pelo rojo, rasgo que le hace inmediatamente reconocible desde lejos.',
      'Su nombre combina dos palabras puramente aragonesas: "royo" (rubio/pelirrojo) y "Rabal" (Arrabal).',
      'Se dice que El Royo solo se quita el gorro en el Puente de Piedra, en señal de respeto al Ebro.',
      'Los vecinos del Arrabal sienten una identificación especial con este cabezudo y le tributan el mayor aplauso.',
      'Existe una peña de fiestas del Arrabal que lleva su nombre desde los años 1970.'
    ],
    copla: `Royo del Rabal, royo del río,\nviene del Arrabal con mucho brío.\nCruzó el Ebro a nado\ny llegó al Pilar.\n¡Que nadie le pare,\nque tiene que llegar!\n\nDel Arrabal vengo yo,\ndel barrio más valiente.\n¡El Royo del Rabal\nes el más diferente!`,
    colors: [
      { name: 'Rojo Pelo', hex: '#B71C1C' },
      { name: 'Azul Ebro', hex: '#1565C0' },
      { name: 'Verde Huerta', hex: '#2E7D32' },
      { name: 'Gris Piedra', hex: '#616161' }
    ],
    imageBg: 'linear-gradient(135deg, #B71C1C, #1565C0, #2E7D32)'
  },

  {
    id: 'cigarrera',
    name: 'La Cigarrera (Herminia)',
    type: 'cabezudo',
    emoji: '🚬',
    year: 2015,
    creator: 'Ana de la Hoz',
    origin: 'Zaragoza (El Tubo - Casco Histórico)',
    history: `La Cigarrera es el cabezudo más reciente de la comparsa municipal y también el que tiene la historia más humana y emotiva. Creada en 2015 por la artista Ana de la Hoz, está inspirada en Herminia Martínez García, una mujer de carne y hueso que durante décadas fue una figura absolutamente icónica del Tubo de Zaragoza.

Herminia ejerció su oficio de cigarrera —vendedora ambulante de tabaco, cerillas, caramelos y otros pequeños artículos— en las calles y locales nocturnos del Tubo desde los años 1950 hasta bien entrados los años 2000. Era pequeña, tenía siempre una sonrisa y conocía a todo el mundo en el barrio. Sus bandejas colgadas del cuello eran un símbolo visual de toda una época.

La Cigarrera representa no solo a Herminia, sino a todas las mujeres trabajadoras que se ganaron la vida de forma honesta en las calles de Zaragoza: las vendedoras ambulantes, las costureras, las lavanderas, las que hacían de tripas corazón en tiempos difíciles. Su incorporación al grupo de cabezudos municipales fue celebrada como un reconocimiento tardío pero justo.

La artista Ana de la Hoz fue la primera mujer en crear un cabezudo para la comparsa municipal, lo que añade un valor simbólico adicional a esta figura ya de por sí cargada de significado.`,
    personality: `Trabajadora, entrañable y con una energía vital desbordante. La Cigarrera es la que más kilómetros recorre durante el desfile, siempre activa, siempre sonriendo, siempre lista para el siguiente cliente imaginario. Tiene la generosidad propia de quien ha vivido del trato con la gente y sabe que la amabilidad siempre se devuelve.`,
    curiosities: [
      'Es el primer cabezudo creado por una mujer artista para la comparsa municipal de Zaragoza.',
      'Herminia Martínez, la mujer que la inspiró, estuvo presente en el acto de presentación de la figura.',
      'La bandeja de tabaco que lleva colgada del cuello es una réplica exacta de la que usaba Herminia real.',
      'El delantal oscuro de trabajo está bordado con pequeñas flores que Herminia llevaba siempre en su ropa real.',
      'La Cigarrera tiene el récord de distancia recorrida en un solo desfile: 4,2 km sin parar en el Pilar de 2018.'
    ],
    copla: `Cigarrera, cigarrera,\nque vendes tabaco en la acera.\nVendes tabaco y cerillas\ny corres como una ardilla.\n\nHerminia de nuestro Tubo,\nla que a todos conocía.\n¡Ahora corre el Pilar\ny lo hace con alegría!`,
    colors: [
      { name: 'Negro Delantal', hex: '#212121' },
      { name: 'Marrón Bandeja', hex: '#6D4C41' },
      { name: 'Blanco Moño', hex: '#F5F5F5' },
      { name: 'Azul Años 50', hex: '#1565C0' }
    ],
    imageBg: 'linear-gradient(135deg, #212121, #6D4C41, #1565C0)'
  },

  // ═══════════════════════════════════════════
  // GIGANTES MUNICIPALES (14)
  // ═══════════════════════════════════════════

  {
    id: 'rey',
    name: 'Rey Don Jaime I',
    type: 'gigante',
    emoji: '👑',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'Reino de Aragón',
    height: 3.85,
    weight: 90,
    history: `El Rey Don Jaime I "El Conquistador" es la figura más imponente y simbólica de toda la comparsa. Representa al monarca más grande de la historia del Reino de Aragón, aquel que amplió el territorio de la Corona hasta incluir Mallorca, Valencia y Murcia, además de proyectar la influencia aragonesa sobre el Mediterráneo.

La figura fue creada en 1918 por Félix Oroz para encabezar el grupo de gigantes históricos con los que el Ayuntamiento de Zaragoza quiso dotar de contenido cultural y educativo a la comparsa. La elección de Jaime I como primer rey de la colección no fue casual: es el monarca aragones más conocido popularmente y su figura tiene un peso histórico indiscutible.

El gigante viste los ropajes propios de un rey medieval del siglo XIII: manto real de terciopelo rojo bordado en oro, corona de oro con piedras preciosas, cetro de mando y espada ceñida al cinto. Su semblante es serio y majestuoso, transmitiendo la autoridad y la dignidad propias de quien ha gobernado durante medio siglo y ha expandido un reino.

Con sus 3,85 metros de altura, el Rey Don Jaime I es uno de los gigantes más altos de la comparsa y requiere un portador de gran envergadura y resistencia para manejar su peso de 90 kilogramos durante los desfiles.`,
    personality: `Majestuoso, sereno y autoritario. El Rey Don Jaime I personifica la dignidad real en su máxima expresión. No corre, no persigue, no asusta: simplemente camina con paso solemne y presidencial, saludando al pueblo que le aclama. Es el padre de todos los personajes de la comparsa.`,
    curiosities: [
      'Es la figura de mayor tamaño de toda la comparsa, con 3,85 metros de altura total.',
      'La corona que lleva es una réplica en miniatura de la Corona de Aragón guardada en el Museo de Zaragoza.',
      'El manto real fue bordado a mano por las monjas del convento del Santo Sepulcro de Zaragoza.',
      'El gigante ha acompañado a seis Reyes de España en sus visitas oficiales a Zaragoza.',
      'La espada que porta es la única pieza auténtica de la comparsa: procede de una colección privada del siglo XIX.'
    ],
    copla: `Don Jaime el Conquistador,\nel rey de mayor grandor.\nCon su manto y su corona\npasea por Zaragoza.\n\nDe Aragón y de Valencia,\nde Mallorca y Cataluña.\n¡El más grande de los reyes\nque tuvo nuestra Fortuna!`,
    colors: [
      { name: 'Rojo Real', hex: '#8B0000' },
      { name: 'Dorado Corona', hex: '#DAA520' },
      { name: 'Azul Real', hex: '#003087' },
      { name: 'Blanco Armiño', hex: '#F8F8FF' }
    ],
    relatedRouteId: 'route-pilar-principal',
    imageBg: 'linear-gradient(135deg, #8B0000, #DAA520, #003087)'
  },

  {
    id: 'reina',
    name: 'Reina Doña Leonor',
    type: 'gigante',
    emoji: '👸',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'Reino de Castilla / Corona de Aragón',
    height: 3.80,
    weight: 85,
    history: `La Reina Doña Leonor, compañera del Rey Don Jaime I, representa a Leonor de Castilla, primera esposa del Conquistador. Su presencia en la comparsa es un homenaje a la alianza matrimonial que unió los reinos de Aragón y Castilla en el siglo XIII, una de las más importantes uniones dinásticas de la historia de España.

Leonor de Castilla fue reina consorte de Aragón desde su matrimonio con Jaime I en 1221. Aunque el matrimonio fue más político que sentimental —fue anulado en 1229— su figura es importante en la historia de Aragón como representante de la nobleza castellana y de los lazos entre los reinos cristianos peninsulares.

La giganta viste los ropajes propios de una dama real del siglo XIII: manto azul real bordado en plata, tocado con velo blanco, collar de perlas y sosteniendo en su mano izquierda un abanico ceremonial. Su semblante es sereno y digno, con una leve sonrisa que humaniza la figura real.

Doña Leonor acompaña siempre a Don Jaime I en los desfiles, marchando a su derecha en señal de honor y respeto. Juntos forman la pareja más imponente de toda la comparsa zaragozana.`,
    personality: `Elegante, serena y con una gracia natural que ningún otro gigante posee. La Reina Doña Leonor es la que pone el contrapunto femenino y refinado a la majestuosidad un poco rígida de Don Jaime. Saluda con delicadeza, gira con suavidad y cada movimiento suyo parece estudiado para transmitir realeza.`,
    curiosities: [
      'Su velo blanco es renovado cada dos años por el mismo convento que borda el manto del Rey.',
      'El collar de perlas que lleva fue donado por la familia Zaragozana de los Conde en 1935.',
      'Es la giganta que más fotografías recibe durante los desfiles, especialmente de mujeres y niñas.',
      'Doña Leonor y Don Jaime siempre bailan juntos el tradicional baile de gigantes al final del recorrido.',
      'En el Pilar de 2008 fue la primera vez que una mujer portó la figura de la Reina en toda la historia de la comparsa.'
    ],
    copla: `Doña Leonor, bella y señora,\ncamina con gracia a toda hora.\nJunto al Rey Jaime pasea,\nla reina más grande que Aragón vea.\n\nDel castillo a la ciudad,\nde la corte al Pilar.\n¡La Reina Leonor\nnos viene a saludar!`,
    colors: [
      { name: 'Azul Real', hex: '#003087' },
      { name: 'Plata Bordado', hex: '#C0C0C0' },
      { name: 'Blanco Velo', hex: '#FFFFFF' },
      { name: 'Rosa Coral', hex: '#FF6B6B' }
    ],
    imageBg: 'linear-gradient(135deg, #003087, #C0C0C0, #FF6B6B)'
  },

  {
    id: 'duque',
    name: 'El Duque de Villahermosa',
    type: 'gigante',
    emoji: '🎩',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'Aragón (Alta Nobleza)',
    height: 3.75,
    weight: 88,
    history: `El Duque de Villahermosa representa a la alta nobleza aragonesa del siglo XVIII, en particular a la influyente Casa de Villahermosa, una de las estirpes nobiliarias más importantes de Aragón. Los Villahermosa fueron durante siglos grandes mecenas de las artes y las letras en Aragón, y su presencia en la comparsa es un reconocimiento a ese papel cultural.

La casa ducal de Villahermosa tuvo su origen en el siglo XV y estuvo íntimamente ligada a la historia de Aragón. El VII Duque, don Carlos de Aragón, fue uno de los grandes promotores de las artes en el reino y bajo su patrocinio se realizaron importantes obras de pintura, escultura y arquitectura en Zaragoza.

El gigante viste con la elegancia característica de la nobleza ilustrada del siglo XVIII: casaca de terciopelo azul oscuro bordada en oro, chupa de seda blanca, peluca empolvada, espadín dorado al cinto y sombrero de tres picos con galón plateado. Es la imagen del aristócrata cultivado de la Ilustración.

La figura del Duque ha sido siempre polémica entre el pueblo zaragozano: hay quien ve en ella un homenaje a la clase dominante, mientras que otros la interpretan como una sátira de la aristocracia, reducida a correr por las calles en festival popular.`,
    personality: `Refinado, culto y con un punto de altivez que le impide agacharse si no es estrictamente necesario. El Duque de Villahermosa es el más intelectual de los gigantes: se interesa por la cultura, habla en términos elevados y mira con benévola condescendencia al pueblo que le rodea. Pero en el fondo, disfruta la fiesta tanto como cualquiera.`,
    curiosities: [
      'Es el único gigante con peluca empolvada, símbolo inequívoco de la aristocracia del siglo XVIII.',
      'Su casaca de terciopelo tiene más de 300 piezas de bordado dorado cosidas individualmente.',
      'El espadín que lleva es una réplica del usado por los grandes de España en las ceremonias reales.',
      'La actual familia Villahermosa, descendiente del linaje original, asiste todos los años a verle desfilar.',
      'Existe una leyenda que dice que el Duque un día bajó del palco para unirse al desfile, y que nadie lo notó.'
    ],
    copla: `El Duque de Villahermosa\ncamina con gracia y con posa.\nCon su peluca y su espada,\npor el Pilar da una pasada.\n\nNobleza aragonesa,\ncasaca y bordado fino.\n¡El Duque va primero\ncon su porte de aristócrata fino!`,
    colors: [
      { name: 'Azul Aristocrático', hex: '#1A237E' },
      { name: 'Dorado Bordado', hex: '#DAA520' },
      { name: 'Blanco Peluca', hex: '#F5F5F5' },
      { name: 'Rojo Forros', hex: '#8B0000' }
    ],
    imageBg: 'linear-gradient(135deg, #1A237E, #DAA520, #8B0000)'
  },

  {
    id: 'duquesa',
    name: 'La Duquesa',
    type: 'gigante',
    emoji: '🌂',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'Aragón (Alta Nobleza)',
    height: 3.70,
    weight: 82,
    history: `La Duquesa acompaña al Duque de Villahermosa y completa la representación de la alta aristocracia aragonesa en la comparsa. Su figura encarna la imagen de la gran dama del siglo XVIII: elegante, cultivada, amante de las artes y protectora de los más desfavorecidos.

El atuendo de La Duquesa es un prodigio de elaboración: viste un traje de gala de estilo goyesco —referencia directa a Francisco de Goya, que retrató a numerosas damas aristocráticas aragonesas— con encajes de Bruselas, corsé bordado, faldón de seda con miriñaque y, en su mano derecha, un delicado abanico pintado a mano.

La figura fue diseñada por Félix Oroz como pareja del Duque, pero con una personalidad propia y diferenciada: si el Duque es la solemnidad masculina de la aristocracia, La Duquesa es su contrapunto femenino: más cercana, más expresiva, más dispuesta a inclinarse hacia el pueblo que le aclama.

Históricamente, La Duquesa representa también el papel de las grandes mecenas femeninas de la cultura aragonesa: mujeres de la nobleza que financiaron iglesias, colegios y hospitales, y que ejercieron una influencia social tan grande o mayor que la de sus esposos.`,
    personality: `Sofisticada, generosa y con una gran humanidad bajo su porte aristocrático. La Duquesa es la que más se acerca al público durante los desfiles, la que dedica más tiempo a los niños y a los mayores. Su gracia natural y su elegancia innata hacen que quien la ve, olvide que se trata de una figura de cartón y tela.`,
    curiosities: [
      'El abanico que lleva pintado a mano fue creado especialmente para la comparsa por un abaniquero valenciano.',
      'La Duquesa tiene la peluca más elaborada de todos los gigantes, con 47 rizos cuidadosamente formados.',
      'Es la única giganta que puede hacer un pequeño giro de vals durante el baile final, algo difícilísimo de ejecutar.',
      'Su traje goyesco fue estudiado directamente de los cuadros de Goya en el Museo del Prado.',
      'Existe la tradición de que la primera niña que toque su abanico durante el desfile será la más afortunada del año.'
    ],
    copla: `La Duquesa, qué elegante,\npor el Pilar caminante.\nCon su abanico pintado\ny su encaje delicado.\n\nDama de Aragón señora,\ngallarda en cualquier momento.\n¡La Duquesa es la primera\nde todo el ayuntamiento!`,
    colors: [
      { name: 'Malva Aristocrático', hex: '#7B1FA2' },
      { name: 'Marfil Encaje', hex: '#FFFFF0' },
      { name: 'Dorado Abanico', hex: '#FFD700' },
      { name: 'Rosa Polvos', hex: '#F8BBD9' }
    ],
    imageBg: 'linear-gradient(135deg, #7B1FA2, #FFD700, #F8BBD9)'
  },

  {
    id: 'don-quijote',
    name: 'Don Quijote de la Mancha',
    type: 'gigante',
    emoji: '🛡️',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'La Mancha / Aragón (Novela)',
    height: 3.90,
    weight: 75,
    history: `Don Quijote de la Mancha es el único personaje de ficción literaria incluido en la comparsa de gigantes, y su presencia tiene una justificación histórica perfectamente sólida: en la segunda parte de la novela cervantina, publicada en 1615, Don Quijote y Sancho Panza viajan por tierras aragonesas y son acogidos en el palacio de unos duques que muchos historiadores identifican con la familia ducal de Villahermosa, en Pedrola.

Esta conexión entre el más universal de los personajes de la literatura española y la realidad aragonesa justifica plenamente su inclusión en la comparsa zaragozana. Cervantes visitó Aragón en sus años de cautiverio y conoció bien la realidad de sus tierras y sus gentes, algo que se refleja en el ambientación aragonesa de varios capítulos del Quijote.

El gigante de Don Quijote es el más alto de toda la comparsa (3,90 metros) y también el más delgado: su figura esbelta, enjuta y quijotesca recuerda perfectamente la descripción cervantina del hidalgo manchego. Viste armadura metálica, lleva lanza de torneo, escudo con las armas de la imaginación y celada en la cabeza, todo en perfecto estado de mantenimiento.

Es el gigante que más fotografías genera durante los desfiles por la inmediata e universal identificación del personaje.`,
    personality: `Idealista, valiente y eternamente soñador. Don Quijote gigante es el que mira al horizonte buscando molinos que conquistar. Tiene una dignidad melancólica que lo distingue de los demás: mientras los otros festejan con alegría festiva, Don Quijote parece siempre estar pensando en un próximo combate imaginario.`,
    curiosities: [
      'Con sus 3,90 metros, es la figura más alta de toda la comparsa municipal.',
      'La armadura que porta fue diseñada por un especialista en armería medieval de Zaragoza.',
      'El escudo lleva grabado el emblema imaginario que el propio Quijote se inventa en la novela.',
      'Don Quijote siempre camina ligeramente inclinado hacia adelante, como si estuviera buscando al enemigo.',
      'En el año 2005, coincidiendo con el IV centenario del Quijote, su figura fue completamente renovada.'
    ],
    copla: `Don Quijote de la Mancha,\nque en Aragón busca cancha.\nCon su lanza y su armadura\npor el Pilar va a su aventura.\n\nMolinos de Zaragoza,\ncastillos y cortes reales.\n¡Don Quijote es el más grande\nde todos los ideales!`,
    colors: [
      { name: 'Gris Armadura', hex: '#78909C' },
      { name: 'Marrón Cuero', hex: '#6D4C41' },
      { name: 'Rojo Fantasía', hex: '#C62828' },
      { name: 'Plata Metal', hex: '#B0BEC5' }
    ],
    imageBg: 'linear-gradient(135deg, #78909C, #6D4C41, #B0BEC5)'
  },

  {
    id: 'dulcinea',
    name: 'Dulcinea del Toboso',
    type: 'gigante',
    emoji: '🌹',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'La Mancha / Aragón (Novela)',
    height: 3.75,
    weight: 80,
    history: `Dulcinea del Toboso es la amada idealizada de Don Quijote y su presencia en la comparsa completa el par cervantino iniciado por el caballero de la triste figura. Aldonza Lorenzo, la aldeana del Toboso que el hidalgo manchego convierte en dama celestial por el poder de su imaginación, tiene en la comparsa zaragozana una representación que opta por mostrar la versión idealizada: la Dulcinea que vive en la mente de Don Quijote.

La giganta de Dulcinea viste como una dama distinguida del Renacimiento, siguiendo la transformación que el propio Quijote realiza mentalmente de la tosca Aldonza: tocado renacentista con velo translúcido, vestido verde esmeralda con ribetes dorados, collar de perlas y un semblante sereno y melancólico que refleja la indefinición de un personaje que es a la vez real e imaginario.

La conexión de Dulcinea con Aragón es la misma que la de Don Quijote: la segunda parte del Quijote sitúa gran parte de la acción en territorio aragonés, y el capítulo en que Don Quijote se da una cita con Dulcinea en la ribera del Ebro ha sido interpretado históricamente como una referencia a las riberas del río Zaragozano.`,
    personality: `Etérea, serena y con la calidad de lo intangible. Dulcinea es la que camina como si no pisara el suelo. Su gracia es diferente a la de las otras gigantas: mientras ellas transmiten elegancia mundana, Dulcinea irradia una belleza que parece de otro mundo. Es el contrapunto romántico e ideal de toda la comparsa.`,
    curiosities: [
      'El vestido verde esmeralda fue elegido para contrastar con el gris metálico de Don Quijote, creando un efecto visual poderoso.',
      'Su velo translúcido es el elemento más frágil de toda la comparsa y requiere reparaciones frecuentes.',
      'Los portadores de Dulcinea reciben formación especial en movimientos suaves y delicados, muy diferentes a los del resto.',
      'La pareja Quijote-Dulcinea siempre marcha junta pero nunca se "miran" directamente, reproduciendo el amor platónico de la novela.',
      'En algunas interpretaciones del baile final, Quijote y Dulcinea realizan un "acercamiento" que nunca llega a concretarse.'
    ],
    copla: `Dulcinea del Toboso,\nla dama del Quijote glorioso.\nEn Zaragoza camina\nla visión más fina.\n\nNi aldeana ni princesa,\nni real ni ilusión:\n¡Dulcinea es el sueño\nde toda la Nación!`,
    colors: [
      { name: 'Verde Esmeralda', hex: '#1B5E20' },
      { name: 'Dorado Ribetes', hex: '#FFD700' },
      { name: 'Blanco Velo', hex: '#FAFAFA' },
      { name: 'Rosa Pálido', hex: '#FCE4EC' }
    ],
    imageBg: 'linear-gradient(135deg, #1B5E20, #FFD700, #FCE4EC)'
  },

  {
    id: 'el-chino',
    name: 'El Chino',
    type: 'gigante',
    emoji: '🏮',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'Extremo Oriente (representación)',
    height: 3.65,
    weight: 85,
    history: `El Chino es el gigante que abre la comparsa al mundo: su figura representa la presencia de las culturas lejanas y exóticas, la curiosidad universal que mueve a los pueblos a conocer civilizaciones más allá de sus fronteras. Incorporado en 1918, coincidió con una época de gran interés popular en España por las culturas orientales, alimentado por las exposiciones universales y los viajes de exploración.

La figura responde a la visión que el Occidente del siglo XIX y principios del XX tenía de China y Asia Oriental: el sombrero cónico de mandarina, la trenza larga en la espalda, la indumentaria de seda con mangas ampias y el gesto solemne y enigmático. Aunque hoy algunos aspectos de esta representación se considerarían estereotipados, la figura fue creada con respeto y admiración hacia una civilización que se percibía como antigua, sabia y misteriosa.

En el contexto de la comparsa zaragozana, El Chino cumple una función intercultural: recuerda que Zaragoza, ciudad de paso en el Camino de Santiago y en las rutas comerciales medievales, fue siempre un lugar de encuentro entre culturas, de apertura al otro, de curiosidad por lo diferente.

Los portadores de El Chino desarrollan un modo de caminar caracterísico: pasos cortos y precisos, movimiento suave de las mangas, inclinación ligeramente reverencial de la cabeza.`,
    personality: `Misterioso, sabio y enigmático. El Chino observa todo con calma y paciencia orientales, transmitiendo la sensación de que guarda un secreto que nunca revelará. Es el más quieto de los gigantes durante los desfiles, el que más contrasta con la algarabía festiva circundante.`,
    curiosities: [
      'El sombrero cónico fue fabricado a mano por un maestro sombrerero de Valencia especializado en artesanía teatral.',
      'La trenza de El Chino mide exactamente 1,20 metros de largo y está hecha con cabello natural donado.',
      'Su indumentaria de seda fue renovada en 2001 usando telas auténticas importadas de China como regalo institucional.',
      'El Chino y La Negra siempre marchan juntos como representantes de los continentes lejanos.',
      'Existe la tradición de que ver a El Chino guiñar un ojo durante el desfile es señal de que ese año habrá buena cosecha.'
    ],
    copla: `El Chino llegó de lejos,\nde tierras sin requejos.\nCon su trenza y su sombrero\ncamina por el Pilar primero.\n\nDe la seda y el bambú,\ndel dragón y del bambú.\n¡El Chino de Zaragoza\nno tiene igual bajo el sol!`,
    colors: [
      { name: 'Rojo Dragón', hex: '#C62828' },
      { name: 'Amarillo Imperial', hex: '#F9A825' },
      { name: 'Negro Ébano', hex: '#1A1A1A' },
      { name: 'Jade', hex: '#00695C' }
    ],
    imageBg: 'linear-gradient(135deg, #C62828, #F9A825, #00695C)'
  },

  {
    id: 'la-negra',
    name: 'La Negra',
    type: 'gigante',
    emoji: '🥁',
    year: 1918,
    creator: 'Félix Oroz',
    origin: 'África (representación)',
    height: 3.60,
    weight: 83,
    history: `La Negra, compañera de El Chino en la representación de las culturas del mundo, encarna el continente africano en la comparsa zaragozana. Creada en 1918, su figura es la que más controversia ha generado en los debates contemporáneos sobre representación cultural, aunque en su contexto histórico original fue concebida como un homenaje a la belleza y riqueza cultural africana.

La figura viste un colorido turbante africano de elaborado diseño, collares de cuentas doradas y de ébano, y un vestido largo y fluido con estampados geométricos de colores vibrantes que recuerdan las telas wax africanas. Su porte es regio y altivo, con la cabeza erguida y los brazos en posición de bailarina de ritual sagrado.

En el discurso actual de la comparsa zaragozana, La Negra es presentada como un símbolo de la diversidad cultural del mundo y de la universalidad de la fiesta: todas las culturas de la Tierra tienen cabida en la Plaza del Pilar de Zaragoza. Su presencia en el desfile es también un recuerdo de que África existe y merece ser conocida y respetada.

La figura ha sido objeto de diversas actualizaciones en sus ropajes para adaptar su representación a los tiempos actuales, siempre manteniendo el espíritu original de homenaje y respeto hacia la cultura africana.`,
    personality: `Poderosa, rítmica y llena de energía vital. La Negra es el gigante con más presencia rítmica: parece moverse siempre al compás de alguna música interior. Transmite fuerza, alegría y una conexión con algo primigenio y esencial que contagia a todos los que la rodean.`,
    curiosities: [
      'Sus collares de cuentas pesan más de dos kilos en total, lo que hace más difícil aún la portación de la figura.',
      'El turbante fue rediseñado en 2012 por una modista de origen congoleño residente en Zaragoza.',
      'La Negra y El Chino siempre cierran el grupo de los "gigantes del mundo", antes de los gigantes históricos.',
      'Los estampados del vestido cambian cada diez años, alternando entre diferentes tradiciones textiles africanas.',
      'Es el gigante que más hace bailar al público: cuando pasa La Negra, la música sube de intensidad.'
    ],
    copla: `La Negra del África grande,\nla que el Pilar entiende.\nCon sus collares dorados\ny sus turbantes bordados.\n\nDe la sabana y el río,\ndel tambor y la canción.\n¡La Negra de Zaragoza\ntiene el más alto don!`,
    colors: [
      { name: 'Naranja Vivo', hex: '#E65100' },
      { name: 'Amarillo Oro', hex: '#F9A825' },
      { name: 'Verde Selva', hex: '#1B5E20' },
      { name: 'Marrón Tierra', hex: '#4E342E' }
    ],
    imageBg: 'linear-gradient(135deg, #E65100, #F9A825, #1B5E20)'
  },

  {
    id: 'gaston',
    name: 'Gastón de Bearn',
    type: 'gigante',
    emoji: '⚔️',
    year: 1956,
    creator: 'Ángel Lope (Restauración)',
    origin: 'Bearn (Francia) / Zaragoza',
    height: 3.80,
    weight: 87,
    history: `Gastón IV de Bearn es uno de los gigantes históricos más importantes de la comparsa porque representa un hecho fundamental de la historia de Zaragoza: la Reconquista de la ciudad a los musulmanes en el año 1118. Gastón, noble del condado de Bearn en el sur de Francia, fue el aliado más importante del rey Alfonso I El Batallador en esta empresa y fue recompensado con el gobierno de la ciudad.

La figura fue incorporada a la comparsa en la restauración de 1956, cuando se renovaron varios gigantes históricos para completar el ciclo de personajes relacionados con la historia medieval aragonesa. Su presencia en el desfile recuerda a los zaragozanos que la reconquista de su ciudad no fue solo obra de los reyes aragoneses sino también de los aliados europeos que respondieron al llamado cruzado.

El gigante viste cota de malla medieval completa, con el escudo heráldico del condado de Bearn en el pecho, espada larga y escudo defensivo. Su porte es el de un guerrero en tiempo de paz: armado pero sereno, victorioso pero no arrogante.

La relación de Zaragoza con el Bearn no terminó con la reconquista: durante siglos, el comercio entre Aragón y los territorios del sur de Francia fue fundamental para la economía regional, y la presencia de Gastón en la comparsa recuerda esos lazos históricos que trascienden las fronteras actuales.`,
    personality: `Valeroso, leal y con la honestidad directa del guerrero que ha ganado sus batallas en campo abierto. Gastón de Bearn es el militar de la comparsa: disciplinado, serio, pero con un punto de camaradería que demuestra que ha combatido codo a codo con sus hombres.`,
    curiosities: [
      'El escudo heráldico que porta es una réplica exacta del escudo histórico del condado de Bearn.',
      'La cota de malla fue elaborada por un artesano especializado en recreaciones medievales de Zaragoza.',
      'El departamento francés de Pyrénées-Atlantiques ha enviado varias veces delegaciones a ver desfilar a Gastón.',
      'Existe un hermanamiento simbólico entre Zaragoza y la región del Bearn en parte gracias a este personaje.',
      'La espada que porta es la más larga de todas las armas de los gigantes históricos: 1,45 metros.'
    ],
    copla: `Gastón de Bearn llegó a Aragón\ncon lanza y escudo y corazón.\nLibertó Zaragoza\ncon Alfonso el Batallador.\n\nFrancés de nacimiento,\naragonés del corazón.\n¡Gastón de Bearn\nes historia y tradición!`,
    colors: [
      { name: 'Gris Cota de Malla', hex: '#607D8B' },
      { name: 'Azul Bearnés', hex: '#1565C0' },
      { name: 'Dorado Heráldico', hex: '#F9A825' },
      { name: 'Rojo Sangre y Gloria', hex: '#B71C1C' }
    ],
    imageBg: 'linear-gradient(135deg, #607D8B, #1565C0, #F9A825)'
  },

  {
    id: 'quintana',
    name: 'Doña Quintana',
    type: 'gigante',
    emoji: '🌺',
    year: 1956,
    creator: 'Ángel Lope (Restauración)',
    origin: 'Bearn (Francia) / Zaragoza',
    height: 3.75,
    weight: 81,
    history: `Doña Quintana acompaña a Gastón de Bearn como representante de la nobleza femenina francoaragonesa que participó en el proceso de repoblación de Zaragoza tras la Reconquista de 1118. Si Gastón representa la fuerza guerrera que ganó la ciudad, Doña Quintana simboliza la tarea civilizadora y cultural de quienes se quedaron a construir la nueva sociedad zaragozana.

La figura de Doña Quintana evoca a las damas de la nobleza occitana que acompañaron a sus esposos en la aventura de poblar las tierras recién ganadas al Islam. Estas mujeres tuvieron un papel fundamental en la creación de la nueva Zaragoza medieval: fundaron hospitales, convents y escuelas, administraron los bienes familiares cuando sus maridos estaban en campaña y mantuvieron las redes de alianzas nobiliarias que garantizaban la estabilidad política.

Viste ropajes de dama de la nobleza occitana del siglo XII: velo translúcido sujeto con tiara floral, bliaut de seda en colores cálidos, manto bordado con escenas de la naturaleza y una flor de lirio —símbolo de Bearn— en la mano izquierda.`,
    personality: `Sensible, inteligente y con una fortaleza interior que su apariencia delicada puede hacer pasar por alto. Doña Quintana es la que más atiende a los niños durante el desfile, la que más se detiene a compartir un momento con el público. Su gracia tiene la calidad de lo auténtico.`,
    curiosities: [
      'La tiara floral fue diseñada con flores autóctonas del Pirineo, recordando los orígenes bearneses del personaje.',
      'El bliaut —vestido medieval de mangas largas— es la única prenda de su tipo en toda la comparsa.',
      'Doña Quintana y Gastón de Bearn siempre marchan con las manos estiradas en dirección el uno al otro.',
      'La flor de lirio que sostiene es el símbolo heráldico del Bearn y también símbolo de la pureza en la tradición medieval.',
      'En 2018 se estrenó una obra de teatro sobre Gastón y Doña Quintana representada en el Teatro Principal de Zaragoza.'
    ],
    copla: `Doña Quintana del Bearn,\ndama de Francia y Aragón.\nCon su velo y su tiara\ncamina con gran valor.\n\nLlegó al Ebro a poblar\nlas tierras del Batallador.\n¡Doña Quintana en Zaragoza\nes historia y es amor!`,
    colors: [
      { name: 'Rosa Suave', hex: '#EC407A' },
      { name: 'Crema Occitano', hex: '#FFF8E1' },
      { name: 'Verde Pirineo', hex: '#2E7D32' },
      { name: 'Azul Celeste', hex: '#0288D1' }
    ],
    imageBg: 'linear-gradient(135deg, #EC407A, #2E7D32, #0288D1)'
  },

  {
    id: 'agustina',
    name: 'Agustina de Aragón',
    type: 'gigante',
    emoji: '💣',
    year: 1982,
    creator: 'Francisco Rallo',
    origin: 'Zaragoza (Los Sitios, 1808)',
    height: 3.75,
    weight: 84,
    history: `Agustina de Aragón es la heroína más célebre de la historia de Zaragoza y, junto con el General Palafox, la figura que más directamente encarna el espíritu de resistencia que convirtió a Zaragoza en un símbolo universal durante la Guerra de la Independencia.

El 2 de julio de 1808, cuando el ejército francés de Napoleón atacó la Puerta del Portillo de Zaragoza, la artillería defensiva fue silenciada momentáneamente y los defensores empezaban a flaquear. Fue entonces cuando Agustina Zaragoza Domenech, una joven de 22 años que llevaba munición a los artilleros, tomó la mecha de las manos de un soldado caído y disparó el cañón, revitalizando la resistencia y convirtiéndose en un símbolo instantáneo de valor y patria.

Su gesta, inmortalizada por Francisco de Goya en "Los desastres de la guerra" y por el imaginario colectivo español desde entonces, convirtió a Agustina en un símbolo de la nación entera. El Wellington la citó en sus memorias, Byron le dedicó versos en "Childe Harold" y su imagen apareció en miles de grabados europeos.

La giganta fue creada en 1982 por el escultor Francisco Rallo para completar el grupo de gigantes históricos relacionados con los Sitios de Zaragoza. Viste traje de época con cinta de oficial al pecho y sostiene en sus manos una bayoneta defensiva, con el semblante resuelto y sereno de quien ha tomado una decisión heroica.`,
    personality: `Valiente, decidida y con una calma serena que hace aún más impresionante su valentía. Agustina de Aragón no alardea de su heroísmo: lo ejerce con la sencillez de quien sabe que no tenía otra opción. Es el gigante con más dignidad moral de toda la comparsa.`,
    curiosities: [
      'El escultor Francisco Rallo se inspiró en el grabado de Goya para capturar la expresión exacta de Agustina.',
      'La bayoneta que porta es una réplica exacta de las usadas por la artillería española en 1808.',
      'La cinta de oficial al pecho reproduce exactamente la condecoración que le fue entregada en 1809.',
      'Agustina de Aragón es el gigante favorito de los turistas extranjeros, especialmente los ingleses que conocen la historia por Byron.',
      'El Ayuntamiento de Zaragoza celebra un acto especial cada 2 de julio con el gigante como protagonista.'
    ],
    copla: `Agustina, Agustina,\nla heroína zaragozana fina.\nEn el Portillo disparó\ny a Francia le paró.\n\nCon su cañón y su valor\ndefendió el Pilar.\n¡Agustina de Aragón,\nnadie te puede olvidar!`,
    colors: [
      { name: 'Verde Militar', hex: '#1B5E20' },
      { name: 'Rojo Patriota', hex: '#B71C1C' },
      { name: 'Dorado Honor', hex: '#F9A825' },
      { name: 'Gris Pólvora', hex: '#546E7A' }
    ],
    imageBg: 'linear-gradient(135deg, #1B5E20, #B71C1C, #546E7A)'
  },

  {
    id: 'palafox',
    name: 'José de Palafox',
    type: 'gigante',
    emoji: '🎖️',
    year: 1982,
    creator: 'Francisco Rallo',
    origin: 'Zaragoza (Los Sitios, 1808-1809)',
    height: 3.85,
    weight: 90,
    history: `El General José de Palafox y Melzi, Duque de Zaragoza, es el hombre que lideró la defensa más heroica de la historia militar española: la resistencia de Zaragoza ante el ejército de Napoleón en dos asedios consecutivos (junio-agosto de 1808 y diciembre 1808-febrero 1809).

Palafox era un joven capitán de 28 años cuando fue proclamado Capitán General de Aragón por la Junta y asumió la defensa de Zaragoza con recursos mínimos ante un ejército que había derrotado a las potencias europeas más poderosas. Su capacidad para mantener la moral de la población civil —que combatió casa por casa durante el segundo sitio— es uno de los episodios más extraordinarios de la historia militar moderna.

Aunque Zaragoza cayó finalmente en febrero de 1809, la resistencia duró lo suficiente para convertirse en un símbolo de la lucha contra Napoleón en toda Europa y en la propia España. Wellington consideró que la resistencia de Zaragoza fue más importante que muchas batallas campales.

La giganta creada por Francisco Rallo en 1982 viste un impecable uniforme militar de gala de general español de época: fajín rojo, charreteras doradas, condecoraciones al valor y sable al cinto. Su semblante transmite la determinación serena del hombre que ha decidido defender su ciudad hasta el último momento.`,
    personality: `Carismático, determinado y con la autoridad natural del líder que no necesita levantar la voz para ser obedecido. Palafox tiene en el desfile la presencia de alguien que sabe que la historia le está mirando y actúa en consecuencia: cada paso es deliberado, cada giro solemne.`,
    curiosities: [
      'El uniforme está basado en el retrato de Palafox pintado por Goya, que se conserva en el Museo del Prado.',
      'Las condecoraciones que lleva incluyen réplicas de todas las que le fueron otorgadas históricamente.',
      'Es el único gigante con fajín rojo, símbolo de su rango de general en jefe.',
      'El sable que porta es similar al que Palafox utilizó durante los Sitios y que se conserva en el Museo del Ejército.',
      'Cada 20 de febrero —aniversario de la capitulación de Zaragoza— el gigante participa en un acto oficial en el Ayuntamiento.'
    ],
    copla: `Palafox el General,\nel que defendió a Zaragoza sin igual.\nDos sitios aguantó\ny jamás dobló.\n\nCon su fajín y su honor,\ncon su sable y su valor.\n¡El Duque de Zaragoza\nes nuestro mayor señor!`,
    colors: [
      { name: 'Azul Uniforme', hex: '#0D47A1' },
      { name: 'Dorado Charreteras', hex: '#F9A825' },
      { name: 'Rojo Fajín', hex: '#B71C1C' },
      { name: 'Blanco Camisa', hex: '#FAFAFA' }
    ],
    imageBg: 'linear-gradient(135deg, #0D47A1, #F9A825, #B71C1C)'
  },

  {
    id: 'goya',
    name: 'Francisco de Goya y Lucientes',
    type: 'gigante',
    emoji: '🎨',
    year: 2008,
    creator: 'Manuel Aladrén',
    origin: 'Fuendetodos / Zaragoza',
    height: 3.80,
    weight: 88,
    history: `Francisco de Goya y Lucientes es el más universal de los aragoneses y su presencia en la comparsa, incorporada en el año 2008 coincidiendo con el centenario de los Sitios y la Exposición Universal de Zaragoza, es un homenaje merecidísimo al mayor genio artístico que ha dado Aragón.

Nacido en Fuendetodos el 30 de marzo de 1746, Goya se formó en Zaragoza como pintor joven, trabajando a las órdenes de su maestro Francisco Bayeu. La ciudad del Ebro fue su escuela: aquí pintó sus primeras obras importantes, aquí se casó con Josefa Bayeu y aquí desarrolló las bases de un estilo que revolucionaría la historia del arte mundial.

La obra de Goya abarca desde las pinturas alegres y coloridas de los cartones para tapices (Los columpios, La merienda) hasta las aterradoras Pinturas Negras de la Quinta del Sordo, pasando por los magistrales retratos de la familia real española, los Caprichos y Los desastres de la guerra. Fue el primer artista moderno en representar la guerra con toda su brutalidad sin ningún filtro heroizante.

El gigante creado por Manuel Aladrén viste el traje de caballero ilustrado del siglo XVIII: casaca oscura, pañuelo de cuello blanco y sostiene en su mano izquierda una paleta de pintor con pinceles, identificándolo inmediatamente como artista sin necesidad de ningún otro signo.`,
    personality: `Genial, observador y con la ironía melancólica de quien ha visto demasiado del ser humano como para tener ilusiones, pero que aún así ama la vida con fiereza. El Goya de la comparsa mira a su alrededor con los ojos de quien está permanentemente estudiando el cuadro siguiente.`,
    curiosities: [
      'Su paleta de pintor tiene los colores exactos que Goya usó en sus últimas Pinturas Negras.',
      'El gigante fue inaugurado en 2008 por el Alcalde de Zaragoza en el 200 aniversario de los Sitios.',
      'Manuel Aladrén, su creador, visitó el museo de Goya en Zaragoza y el Prado para documentarse exhaustivamente.',
      'El traje está inspirado en el autorretrato de Goya que conserva la Real Academia de Bellas Artes de San Fernando.',
      'Cada año, el gigante de Goya desfila especialmente en el día de San Jorge, patrón de Aragón.'
    ],
    copla: `Goya de Fuendetodos,\nel mayor de todos.\nPintó reyes y reinas,\nduquesas y escenas.\n\nEn Zaragoza aprendió\ny al mundo emocionó.\n¡Francisco de Goya,\nes el grande de Aragón hoy!`,
    colors: [
      { name: 'Negro Casaca', hex: '#1A1A1A' },
      { name: 'Blanco Camisa', hex: '#FAFAFA' },
      { name: 'Ocre Paleta', hex: '#8D6E63' },
      { name: 'Rojo Labios', hex: '#C62828' }
    ],
    imageBg: 'linear-gradient(135deg, #1A1A1A, #8D6E63, #C62828)'
  },

  {
    id: 'josefa-bayeu',
    name: 'Josefa Bayeu',
    type: 'gigante',
    emoji: '🪭',
    year: 2008,
    creator: 'Manuel Aladrén',
    origin: 'Zaragoza',
    height: 3.70,
    weight: 82,
    history: `Josefa Bayeu y Subías fue la esposa de Francisco de Goya y hermana del también célebre pintor Francisco Bayeu. Su incorporación a la comparsa en 2008, junto a su esposo, resalta el papel fundamental de las mujeres zaragozanas en el apoyo y sustento de los grandes genios artísticos masculinos —un papel habitualmente invisible en la historia oficial.

Josefa nació en Zaragoza en 1747 y se casó con Goya en 1773, comenzando una vida en común que duraría hasta su muerte en 1812, un año antes de que Goya quedara completamente sordo y pintara las Pinturas Negras. Durante casi cuatro décadas, Josefa fue el sostén emocional y práctico del hogar familiar, facilitando las condiciones de tranquilidad y estabilidad que Goya necesitaba para crear.

Las cartas de Goya a su amigo Martín Zapater revelan una relación de profundo afecto y complicidad con "Pepa" —como Goya llamaba cariñosamente a Josefa—. Aunque Goya nunca pintó un retrato oficial de su esposa, algunos especialistas creen reconocer sus rasgos en varias de las figuras femeninas de sus obras.

La giganta viste un primoroso traje goyesco del siglo XVIII: vestido de seda en tonos malva con encajes negros en las mangas, mantilla tradicional zaragozana y un abanico pintado que sostiene con elegancia. Su semblante transmite la inteligencia serena y la fortaleza discreta de quien ha sabido estar siempre donde se la necesitaba.`,
    personality: `Inteligente, discreta y con una fortaleza interior que podría sorprender a quienes la confunden con una mera esposa decorativa. Josefa Bayeu es la que pone el equilibrio emocional en la pareja: si Goya es el genio tormentoso y brillante, ella es la roca sobre la que se sustenta todo.`,
    curiosities: [
      'Es el primer gigante de la comparsa que representa a una mujer histórica real del entorno doméstico y no de la nobleza o el heroísmo militar.',
      'Su mantilla zaragozana fue bordada por las monjas del convento de Santa Catalina siguiendo patrones del siglo XVIII.',
      'El abanico pintado contiene una miniatura del Pilón de la Plaza del Pilar, guiño a su origen zaragozano.',
      'Josefa Bayeu y Goya siempre marchan juntos pero el gigante de ella camina ligeramente por delante, como si guiara.',
      'En 2022 se publicó una novela histórica sobre Josefa Bayeu que se presentó con el gigante como protagonista del acto.'
    ],
    copla: `Josefa Bayeu, Pepa de Goya,\nla que le dio al genio su boya.\nSin ella no hubiera\ntapices ni Pinturas Negras.\n\nZaragozana y esposa,\npintora del hogar.\n¡Josefa Bayeu, hermosa,\nmerceces recordar!`,
    colors: [
      { name: 'Malva Goyesco', hex: '#7B1FA2' },
      { name: 'Negro Encaje', hex: '#1A1A1A' },
      { name: 'Dorado Abanico', hex: '#F9A825' },
      { name: 'Blanco Mantilla', hex: '#FAFAFA' }
    ],
    imageBg: 'linear-gradient(135deg, #7B1FA2, #F9A825, #FAFAFA)'
  }
];
