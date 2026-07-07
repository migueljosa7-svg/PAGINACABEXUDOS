import { enciclopediaData } from './enciclopediaData';

// Fuente única de coplas: Enciclopedia.
// Mapa por id para que Comparsa use exactamente la misma letra.
export const coplasById: Record<string, string | undefined> = enciclopediaData.reduce(
  (acc, entry) => {
    acc[entry.id] = entry.copla;
    return acc;
  },
  {} as Record<string, string | undefined>
);

