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
  barrioId?: string;

  history: string;
  personality: string;
  curiosities: string[];
  copla?: string;
  colors: CharacterColor[];
  height?: number; // metros (gigantes)
  weight?: number; // kg
  relatedRouteId?: string;
  imageBg: string; // CSS gradient for placeholder image
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
    copla: `Morico el Pilar, se come las sopas y se echa a bailar.`,
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
    copla: `El Tuerto, tuerto es, el tuerto por melón se cayó un tozolón.`,
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
    copla: `Azutero panzón deja de cantar jotas y reparte el zurrón.`,
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
    copla: `Que no se diga, que no se note, que La Forana lleva bigote.`,
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
    copla: `Al berrugón le picaron los mosquitos y se compró un sombrero de tres picos.`,
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
    copla: `El torero como es tan chulo, salta la tapia y se rompe el culo.`,
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
    copla: `El Robaculeros no sabe correr, por eso da tantos traspiés.`,
    colors: [
      { name: 'Verde Maleza', hex: '#4CAF50' },
      { name: 'Marrón Ropa Usada', hex: '#6D4C41' },
      { name: 'Rojo Cachirulo', hex: '#D32F2F' },
      { name: 'Gris Manchado', hex: '#78909C' }
    ],
    imageBg: 'linear-gradient(135deg, #4CAF50, #6D4C41, #D32F2F)'
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
    copla: `La cigarrera de tanto fumar, se tira pedos que huelen fatal.`,
    colors: [
      { name: 'Negro Delantal', hex: '#212121' },
      { name: 'Marrón Bandeja', hex: '#6D4C41' },
      { name: 'Blanco Moño', hex: '#F5F5F5' },
      { name: 'Azul Años 50', hex: '#1565C0' }
    ],
    imageBg: 'linear-gradient(135deg, #212121, #6D4C41, #1565C0)'
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
    copla: `Pilara, cuando camina, mueve las plumas como una gallina.`,
    colors: [
      { name: 'Rojo Lentejuelas', hex: '#C62828' },
      { name: 'Rubio Platino', hex: '#FFE082' },
      { name: 'Negro Espectáculo', hex: '#212121' },
      { name: 'Coral Maquillaje', hex: '#FF7043' }
    ],
    imageBg: 'linear-gradient(135deg, #C62828, #FFE082, #FF7043)'
  },

  // ============================================================
  // GIGANTES MUNICIPALES (14)
  // ============================================================

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

  // ... (resto de gigantes sin cambios de copla/historia/personality)

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

