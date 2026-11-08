import React, { memo, useEffect, useState } from 'react';
import '../styles/entity-logo.css';

/**
 * Logo de una comparsa, personaje o barrio.
 *
 * Busca la imagen en `public/cabezudos/<id>.<ext>` (png, webp o svg, por ese
 * orden). Mientras carga —y si no existe ninguna— se ve un fallback elegante:
 * el emoji del personaje o, si no hay, un monograma con las iniciales sobre el
 * color de la entidad. Nunca se muestra un icono de imagen rota ni salta el
 * layout: el fallback ocupa siempre el hueco y la imagen aparece encima con un
 * fundido cuando termina de cargar.
 *
 * Ocupa el 100 % de su contenedor: el tamaño, el borde y la forma los pone quien
 * lo usa (`.card-emoji`, `.barrio-card-icon`, ...).
 */

const EXTENSIONS = ['png', 'webp', 'svg'] as const;

/** ids sin imagen conocida: evita repetir peticiones 404 en cada tarjeta/render. */
const missing = new Set<string>();

const STOP_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'don', 'doña']);

export function getInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface EntityLogoProps {
  /** Identificador estable; es el nombre del fichero: /cabezudos/<id>.png */
  id: string;
  /** Nombre para el texto alternativo y las iniciales. */
  name: string;
  /** Emoji de respaldo (personajes). Sin él se usan las iniciales. */
  emoji?: string;
  /** Color de la entidad (para el monograma). */
  color?: string;
  className?: string;
}

export const EntityLogo: React.FC<EntityLogoProps> = memo(({ id, name, emoji, color = '#7a1c2c', className = '' }) => {
  const [attempt, setAttempt] = useState(() => (missing.has(id) ? EXTENSIONS.length : 0));
  const [loaded, setLoaded] = useState(false);

  // Si el componente se reutiliza con otro id (listas filtradas), se reinicia.
  useEffect(() => {
    setAttempt(missing.has(id) ? EXTENSIONS.length : 0);
    setLoaded(false);
  }, [id]);

  const src = attempt < EXTENSIONS.length ? `/cabezudos/${encodeURIComponent(id)}.${EXTENSIONS[attempt]}` : null;

  return (
    <span className={`entity-logo ${className}`} style={{ '--logo-color': color } as React.CSSProperties}>
      {emoji ? (
        <span className="entity-logo-emoji" aria-hidden="true">{emoji}</span>
      ) : (
        <span className="entity-logo-initials" aria-hidden="true">{getInitials(name)}</span>
      )}
      {src && (
        <img
          key={src}
          src={src}
          alt={`Logotipo de ${name}`}
          className={`entity-logo-img${loaded ? ' is-loaded' : ''}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (attempt + 1 >= EXTENSIONS.length) missing.add(id);
            setAttempt((a) => a + 1);
          }}
        />
      )}
    </span>
  );
});
EntityLogo.displayName = 'EntityLogo';

export default EntityLogo;
