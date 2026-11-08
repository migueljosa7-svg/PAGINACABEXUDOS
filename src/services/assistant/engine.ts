import { comparsaMembers } from '../../data/comparsaData';
import { calendarEvents } from '../../data/calendarData';
import { zaragozaNeighborhoods, neighborhoodRoutes } from '../../data/barriosData';
import { newsItems, historyMilestones } from '../../data/advancedContent';
import { PRUEBA_BARRIO } from '../../config/pruebaBarrio';

/**
 * Motor del asistente virtual (100 % local, sin claves ni red).
 *
 * Busca en los mismos datos que usa la web: personajes, agenda, barrios,
 * recorridos, noticias e historia. Es deliberadamente simple (normaliza
 * acentos, puntúa por palabras clave) y siempre devuelve un enlace útil.
 * Si el servidor tiene IA configurada, `askAssistant` la usa primero y este
 * motor queda como respaldo y como proveedor de contexto.
 */

export interface AssistantLink {
  label: string;
  to: string;
}

export interface AssistantAnswer {
  text: string;
  links?: AssistantLink[];
  suggestions?: string[];
  source: 'local' | 'ai';
}

interface KnowledgeEntry {
  id: string;
  title: string;
  body: string;
  keywords: string;
  link: AssistantLink;
}

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'y', 'o', 'u', 'a', 'en', 'por',
  'para', 'con', 'sin', 'que', 'se', 'es', 'son', 'me', 'te', 'lo', 'mi', 'tu', 'su', 'como', 'cual', 'cuales',
  'donde', 'cuando', 'quien', 'quienes', 'hay', 'esta', 'este', 'esto', 'eso', 'hoy', 'sobre', 'mas', 'muy',
  'si', 'no', 'puedo', 'puede', 'quiero', 'saber', 'dime', 'decir', 'hola', 'gracias', 'favor',
]);

export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text: string): string[] =>
  normalize(text)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

const clip = (text: string, max = 260): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 80))}…`;
};

const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

let knowledgeCache: KnowledgeEntry[] | null = null;

function buildKnowledge(): KnowledgeEntry[] {
  if (knowledgeCache) return knowledgeCache;
  const entries: KnowledgeEntry[] = [];

  for (const m of comparsaMembers) {
    entries.push({
      id: `pj-${m.id}`,
      title: m.name,
      body: `${m.name} es ${m.type === 'gigante' ? 'uno de los gigantes' : 'uno de los cabezudos'} de la comparsa, creado por ${m.creator} en ${m.year}. ${m.description}`,
      keywords: `${m.name} ${m.type} ${m.creator} ${m.history} ${m.copla ?? ''}`,
      link: { label: `Conocer a ${m.name}`, to: `/personaje/${m.id}` },
    });
  }

  for (const e of calendarEvents) {
    entries.push({
      id: `ev-${e.id}`,
      title: e.title,
      body: `${e.title}: ${formatDate(e.date)}${e.time ? ` a las ${e.time}` : ''}, en ${e.location}. ${e.description}`,
      keywords: `${e.title} ${e.location} ${e.category} ${e.barrio ?? ''} ${e.comparsa ?? ''} ${e.date}`,
      link: { label: 'Ver la agenda', to: '/agenda' },
    });
  }

  for (const n of zaragozaNeighborhoods) {
    entries.push({
      id: `ba-${n.id}`,
      title: n.name,
      body: `${n.name}: ${n.description}`,
      keywords: `${n.name} barrio ${n.zona}`,
      link: { label: 'Ver barrios', to: '/barrios' },
    });
  }

  for (const r of neighborhoodRoutes) {
    entries.push({
      id: `ru-${r.id}`,
      title: r.name,
      body: `${r.name} (${r.barrioName}): ${r.description} Sale el ${r.dateString} a las ${r.timeString}; ${(r.distance / 1000).toFixed(1).replace('.', ',')} km y unos ${r.duration} minutos.`,
      keywords: `${r.name} ${r.barrioName} ${r.characterName} recorrido desfile ruta ${r.streets.join(' ')}`,
      link: { label: 'Ver recorridos', to: `/recorridos?barrio=${r.barrioId}` },
    });
  }

  for (const n of newsItems) {
    entries.push({
      id: `no-${n.id}`,
      title: n.title,
      body: `${n.title}. ${n.excerpt}`,
      keywords: `${n.title} ${n.tag} noticia`,
      link: { label: 'Ver noticias', to: '/noticias' },
    });
  }

  for (const h of historyMilestones) {
    entries.push({
      id: `hi-${h.id}`,
      title: h.title,
      body: `${h.year}: ${h.title}. ${h.description}`,
      keywords: `${h.year} ${h.title} historia origen`,
      link: { label: 'Ver la historia', to: '/historia' },
    });
  }

  knowledgeCache = entries;
  return entries;
}

export function searchKnowledge(query: string, limit = 3): KnowledgeEntry[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const scored = buildKnowledge()
    .map((entry) => {
      const title = normalize(entry.title);
      const haystack = normalize(`${entry.keywords} ${entry.body}`);
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 5;
        else if (normalize(entry.keywords).includes(t)) score += 3;
        else if (haystack.includes(t)) score += 1;
      }
      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  // Umbral: una sola coincidencia suelta en el cuerpo es ruido.
  const best = scored[0]?.score ?? 0;
  return scored.filter((s) => s.score >= Math.max(3, best * 0.5)).slice(0, limit).map((s) => s.entry);
}

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DEFAULT_SUGGESTIONS = [
  '¿Dónde está la comparsa ahora?',
  '¿Qué hay hoy?',
  'Próximos eventos',
  '¿Quiénes son los gigantes?',
  'Actividades para niños',
  '¿Cómo uso la app?',
];

type Intent = { test: RegExp; answer: () => AssistantAnswer };

const INTENTS: Intent[] = [
  {
    test: /(donde|ubicacion|posicion|gps|en directo|en vivo|sigue|seguir|ahora).*(comparsa|desfile|cabalgata|gigantes|cabezudos|recorrido)|comparsa.*(ahora|directo|vivo)|\bgps\b/,
    answer: () => ({
      source: 'local',
      text: 'Para ver dónde está la comparsa en directo, abre «Recorridos» y elige el «Recorrido del Pilar» (el último de la lista). Pulsa «GPS en directo» y verás su posición en el mapa, actualizada cada pocos segundos. Si todavía no ha salido, aparecerá «Esperando señal».',
      links: [
        { label: 'Abrir recorridos', to: '/recorridos' },
        { label: 'Mapa en directo', to: `/gps-live?token=${encodeURIComponent(PRUEBA_BARRIO.id)}` },
      ],
      suggestions: ['¿Qué hay hoy?', 'Próximos eventos'],
    }),
  },
  {
    test: /\b(hoy|esta tarde|esta manana|programa del dia)\b/,
    answer: () => {
      const today = calendarEvents.filter((e) => e.date === todayISO());
      if (today.length === 0) {
        const next = calendarEvents.filter((e) => e.date > todayISO()).sort((a, b) => a.date.localeCompare(b.date))[0];
        return {
          source: 'local',
          text: next
            ? `Hoy no hay actos en el calendario oficial. El siguiente es «${next.title}», el ${formatDate(next.date)}${next.time ? ` a las ${next.time}` : ''}, en ${next.location}.`
            : 'Hoy no hay actos en el calendario oficial. Consulta la agenda completa para ver otras fechas.',
          links: [{ label: 'Agenda completa', to: '/agenda' }],
          suggestions: ['Próximos eventos', '¿Dónde está la comparsa ahora?'],
        };
      }
      return {
        source: 'local',
        text: `Hoy hay ${today.length} ${today.length === 1 ? 'acto' : 'actos'}: ${today.map((e) => `${e.time ? `${e.time} · ` : ''}${e.shortTitle} (${e.location})`).join('; ')}.`,
        links: [{ label: 'Agenda completa', to: '/agenda' }],
      };
    },
  },
  {
    test: /(proximo|proximos|siguiente|siguientes|agenda|calendario|programa|cuando).*(evento|eventos|acto|actos|salida|salidas|desfile|fiesta|fiestas)?|^(proximos|agenda|calendario)/,
    answer: () => {
      const upcoming = calendarEvents
        .filter((e) => e.date >= todayISO())
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
        .slice(0, 3);
      return {
        source: 'local',
        text: upcoming.length
          ? `Los próximos actos son: ${upcoming.map((e) => `${e.shortTitle} (${formatDate(e.date)}${e.time ? `, ${e.time}` : ''})`).join('; ')}.`
          : 'No hay próximos actos en el calendario oficial. Consulta la agenda completa.',
        links: [{ label: 'Abrir la agenda', to: '/agenda' }],
      };
    },
  },
  {
    test: /(nino|ninos|peque|pequenos|hijo|hijos|juego|juegos|jugar|divertir|familia)/,
    answer: () => ({
      source: 'local',
      text: 'Para los más pequeños hay una zona de juegos con retos sobre los gigantes y cabezudos: adivinar quién es quién, memoria y más. Es sencilla, con botones grandes y sin necesidad de leer mucho.',
      links: [{ label: 'Ir a Juegos Peque', to: '/juegos' }, { label: 'Conocer a los personajes', to: '/comparsa' }],
      suggestions: ['¿Quiénes son los gigantes?', '¿Qué es un cabezudo?'],
    }),
  },
  {
    test: /(que es|quienes son|que son|diferencia).*(cabezudo|cabezudos|gigante|gigantes)|(quienes|cuales).*(gigantes|cabezudos|personajes)|personajes/,
    answer: () => {
      const giants = comparsaMembers.filter((m) => m.type === 'gigante');
      const heads = comparsaMembers.filter((m) => m.type === 'cabezudo');
      return {
        source: 'local',
        text: `Los gigantes son figuras altísimas que bailan por la calle (${giants.slice(0, 4).map((g) => g.name).join(', ')}…). Los cabezudos son personajes de cabeza grande que corretean con su vara entre los niños (${heads.slice(0, 4).map((h) => h.name).join(', ')}…). En total hay ${giants.length} gigantes y ${heads.length} cabezudos en la ficha.`,
        links: [{ label: 'Ver la comparsa', to: '/comparsa' }],
        suggestions: ['Actividades para niños', 'Historia de la comparsa'],
      };
    },
  },
  {
    test: /(como|ayuda|instalar|usar|funciona|app|aplicacion|movil|offline|sin conexion)/,
    answer: () => ({
      source: 'local',
      text: 'Es muy fácil: abajo en el móvil (o arriba en el ordenador) tienes los botones principales: Inicio, Recorridos, Programa y Juegos. «Menú» abre el resto. Puedes agrandar la letra y subir el contraste con el botón «Aa» de arriba, y cambiar a modo oscuro con la luna. También puedes instalarla como app en el móvil.',
      links: [{ label: 'Preguntas frecuentes', to: '/preguntas-frecuentes' }, { label: 'Accesibilidad', to: '/accesibilidad' }],
    }),
  },
  {
    test: /(historia|origen|origenes|antigua|siglo|tradicion)/,
    answer: () => {
      const first = historyMilestones.slice(0, 2).map((h) => `${h.year}: ${h.title}`).join('; ');
      return {
        source: 'local',
        text: `La tradición de gigantes y cabezudos de Zaragoza tiene siglos de historia. ${first ? `Algunos hitos: ${first}.` : ''}`,
        links: [{ label: 'Ver la cronología', to: '/cronologia' }, { label: 'Enciclopedia', to: '/enciclopedia' }],
      };
    },
  },
  {
    test: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey)\b/,
    answer: () => ({
      source: 'local',
      text: '¡Hola! Soy el asistente de la comparsa. Puedo decirte dónde está el desfile, qué hay hoy, quién es cada gigante o cabezudo y cómo moverte por la web. ¿Qué te gustaría saber?',
      suggestions: DEFAULT_SUGGESTIONS,
    }),
  },
  {
    test: /^(gracias|muchas gracias|vale gracias|perfecto|genial)/,
    answer: () => ({ source: 'local', text: '¡De nada! Si necesitas algo más, aquí estoy.', suggestions: DEFAULT_SUGGESTIONS.slice(0, 3) }),
  },
];

/** Respuesta local: intents guiados primero y, si no, búsqueda en los datos. */
export function localAnswer(question: string): AssistantAnswer {
  const q = normalize(question);
  // Si el usuario nombra un personaje, barrio o evento concreto, gana la búsqueda.
  const specific = searchKnowledge(question, 3);
  const named = specific.find((s) => s.id.startsWith('pj-') && q.includes(normalize(s.title).split(' ')[0]));
  if (named) {
    return {
      source: 'local',
      text: clip(named.body, 420),
      links: [named.link],
      suggestions: ['¿Quiénes son los gigantes?', 'Actividades para niños'],
    };
  }
  for (const intent of INTENTS) {
    if (intent.test.test(q)) return intent.answer();
  }
  if (specific.length > 0) {
    return {
      source: 'local',
      text: specific.length === 1
        ? clip(specific[0].body, 420)
        : `He encontrado esto: ${specific.map((s) => `«${s.title}»`).join(', ')}. ${clip(specific[0].body, 300)}`,
      links: Array.from(new Map(specific.map((s) => [s.link.to, s.link])).values()).slice(0, 3),
    };
  }
  return {
    source: 'local',
    text: 'No estoy seguro de haber entendido. Puedo ayudarte con la posición de la comparsa, la agenda, los personajes, los recorridos o los juegos para niños. ¿Probamos con alguna de estas?',
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

/** Contexto breve para la IA del servidor (nunca más de ~1.500 caracteres). */
export function buildAiContext(question: string): string {
  return searchKnowledge(question, 4)
    .map((e) => `- ${clip(e.body, 350)}`)
    .join('\n')
    .slice(0, 1500);
}

export async function askAssistant(question: string, signal?: AbortSignal): Promise<AssistantAnswer> {
  const local = localAnswer(question);
  // Si el motor local ya tiene enlace útil, no se gasta IA: solo preguntas abiertas.
  if (local.links?.length) return local;
  try {
    const res = await fetch('/api/asistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.slice(0, 300), context: buildAiContext(question) }),
      signal: signal ?? AbortSignal.timeout(15000),
    });
    if (!res.ok) return local;
    const data = (await res.json()) as { answer?: string };
    if (data.answer) return { source: 'ai', text: data.answer, suggestions: DEFAULT_SUGGESTIONS.slice(0, 3) };
  } catch {
    // Sin IA o sin red: el motor local responde.
  }
  return local;
}
